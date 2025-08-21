import fs from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { InsertPatient, InsertNote, patients, notes, extractedSymptoms } from '@shared/schema';
import { storage } from '../storage';
import { db } from '../db';
import path from 'path';

/**
 * Helper function to find the first available field from a list of field names
 */
function findField(row: Record<string, any>, fieldNames: string[]): string | null {
  for (const fieldName of fieldNames) {
    if (row.hasOwnProperty(fieldName) && row[fieldName] != null && row[fieldName] !== '') {
      return fieldName;
    }
  }
  return null;
}

/**
 * Extract all additional fields that aren't mapped to predefined schema fields
 * This preserves ALL customer HRSN data from their original file
 */
function extractAdditionalFields(row: Record<string, any>, fieldMapping: FieldMapping): Record<string, any> {
  const mappedFields = new Set(Object.values(fieldMapping).filter(Boolean));
  const additionalFields: Record<string, any> = {};
  
  // Preserve any field that wasn't explicitly mapped
  for (const [key, value] of Object.entries(row)) {
    if (!mappedFields.has(key) && value != null && value !== '') {
      additionalFields[key] = String(value).trim();
    }
  }
  
  console.log(`Preserved ${Object.keys(additionalFields).length} additional HRSN fields for customer data completeness`);
  return additionalFields;
}

/**
 * Field mapping interface for flexible data handling
 */
export interface FieldMapping {
  patientId?: string;
  patientName?: string; // Added patient name field to mapping
  noteId?: string;      // Added note id field to mapping
  dosDate?: string;
  noteText?: string; 
  providerId?: string;
  providerName?: string;
  
  // HRSN factors
  age?: string;
  ageRange?: string; // Added field for age_range
  gender?: string;
  race?: string;
  ethnicity?: string;
  zipCode?: string;
  financialStatus?: string;
  housingInsecurity?: string;
  foodInsecurity?: string;
  veteranStatus?: string;
  educationLevel?: string;
  transportation?: string;
  hasCar?: string;
}

/**
 * Detect fields in the input file using fuzzy matching and analysis
 */
export async function detectFileFields(filePath: string): Promise<{
  detectedFields: FieldMapping;
  sampleData: any[];
}> {
  console.log(`Detecting fields for file: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // Read data from file based on extension
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  let sampleData: any[] = [];
  
  try {
    if (fileExtension === 'xlsx') {
      const workbook = XLSX.readFile(filePath, { type: 'binary', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      sampleData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: "",
        blankrows: false
      }) as Record<string, any>[];
      
      // For Excel, if the automatic conversion didn't work properly, try a more manual approach
      if (!sampleData || sampleData.length === 0) {
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const headers = rawData[0];
        const processedData: Record<string, any>[] = [];
        
        for (let i = 1; i < Math.min(rawData.length, 10); i++) {
          const row = rawData[i];
          
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            if (index < row.length) {
              obj[header] = row[index];
            }
          });
          
          processedData.push(obj);
        }
      }
    } else {
      // Assume CSV
      const csvContent = fs.readFileSync(filePath, 'utf8');
      sampleData = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, any>[];
    }
  } catch (error) {
    console.error(`Error reading file: ${error}`);
    throw new Error(`Could not process file: ${error}`);
  }
  
  console.log(`Extracted ${sampleData.length} sample rows for field detection`);
  
  // Extract column names from the first row
  let columnNames: string[] = [];
  
  if (sampleData && sampleData.length > 0) {
    columnNames = Object.keys(sampleData[0]);
  }
  
  console.log(`Found ${columnNames.length} columns: ${columnNames.join(', ')}`);
  
  // Define possible field name mappings
  const fieldMappingOptions: Record<string, string[]> = {
    patientId: ['patient_id', 'patientid', 'patient_identifier', 'patientidentifier', 'id', 'patient', 'medical_record_number', 'mrn'],
    noteId: ['note_id', 'noteid', 'clinical_note_id', 'record_id', 'encounter_id'],
    dosDate: ['dos_date', 'date_of_service', 'service_date', 'visitdate', 'date', 'encounter_date', 'notedate'],
    noteText: ['note_text', 'notetext', 'text', 'note', 'clinical_note', 'content', 'narrative', 'description', 'findings'],
    providerId: ['provider_id', 'providerid', 'provider', 'physician_id', 'physicianid', 'doctor'],
    
    // HRSN factors
    age: ['age', 'patient_age', 'age_years'],
    gender: ['gender', 'sex', 'patient_gender', 'patient_sex'],
    race: ['race', 'patient_race', 'racial_background'],
    ethnicity: ['ethnicity', 'ethnic_background', 'patient_ethnicity'],
    zipCode: ['zip_code', 'zipcode', 'postal_code', 'zip', 'patient_zip'],
    financialStatus: ['financial_status', 'socioeconomic_status', 'income_level', 'financial_stability'],
    housingInsecurity: ['housing_insecurity', 'housing_status', 'housing_instability', 'housing'],
    foodInsecurity: ['food_insecurity', 'food_status', 'nutrition_access', 'food_stability', 'food_access'],
    veteranStatus: ['veteran_status', 'military_status', 'is_veteran'],
    educationLevel: ['education_level', 'education', 'academic_level', 'highest_education'],
    transportation: ['access_to_transportation', 'transportation_access', 'transport', 'transportation'],
    hasCar: ['has_a_car', 'owns_car', 'has_vehicle', 'car_ownership']
  };
  
  // Function to find matching field using fuzzy matching
  function findMatchingField(possibleNames: string[], columnNames: string[]): string | null {
    // First try exact matches (case insensitive)
    for (const name of possibleNames) {
      const exactMatch = columnNames.find(col => col.toLowerCase() === name.toLowerCase());
      if (exactMatch) return exactMatch;
    }
    
    // Then try partial matches (case insensitive)
    for (const name of possibleNames) {
      const partialMatch = columnNames.find(col => col.toLowerCase().includes(name.toLowerCase()));
      if (partialMatch) return partialMatch;
    }
    
    return null;
  }

  const detectedFields: FieldMapping = {};
  
  // Detect fields using fuzzy matching
  for (const [field, possibleNames] of Object.entries(fieldMappingOptions)) {
    const match = findMatchingField(possibleNames, columnNames);
    if (match) {
      (detectedFields as any)[field] = match;
      console.log(`Auto-detected ${field} field as: ${match}`);
    }
  }
  
  // Special case for noteText - if not found, look for the field with the longest average text
  if (!detectedFields.noteText && sampleData.length > 0) {
    const textLengths = columnNames.map(col => {
      const avgLength = sampleData
        .slice(0, Math.min(5, sampleData.length))
        .reduce((sum, row) => sum + String(row[col] || '').length, 0) / Math.min(5, sampleData.length);
      return { column: col, avgLength };
    });
    
    const longTextFields = textLengths
      .filter(item => item.avgLength > 50)
      .sort((a, b) => b.avgLength - a.avgLength)
      .map(item => item.column);
    
    if (longTextFields.length > 0) {
      detectedFields.noteText = longTextFields[0];
      console.log(`Auto-detected noteText field from content length: ${longTextFields[0]}`);
    }
  }
  
  return {
    detectedFields,
    sampleData
  };
}

/**
 * Process file data using detected or provided field mappings
 */
export async function processFileData(
  filePath: string,
  userId: number | null = null,
  fieldMapping?: FieldMapping
): Promise<{
  patients: InsertPatient[];
  notes: InsertNote[];
  recordCount: number;
  patientCount: number;
}> {
  console.log(`Processing file: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  // First, detect fields if not provided
  const { detectedFields, sampleData } = await detectFileFields(filePath);
  
  // Read all data from file (re-using sampleData logic)
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  let rawData: any[] = [];
  
  if (fileExtension === 'xlsx') {
    const workbook = XLSX.readFile(filePath, { type: 'binary', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: "",
      blankrows: false
    }) as Record<string, any>[];
    
    // For Excel, if the automatic conversion didn't work properly, try a more manual approach
    if (!rawData || rawData.length === 0) {
      console.log('Attempting manual Excel conversion...');
      const rawExcelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      const headers = rawExcelData[0];
      const processedData: Record<string, any>[] = [];
      
      for (let i = 1; i < rawExcelData.length; i++) {
        const row = rawExcelData[i];
        
        const rowObj: Record<string, any> = {};
        headers.forEach((header, idx) => {
          if (idx < row.length && header) {
            rowObj[header] = row[idx];
          }
        });
        
        processedData.push(rowObj);
      }
      
      console.log(`Converted ${processedData.length} rows from Excel format`);
      rawData = processedData;
      
      // Log a sample row for debugging
      if (processedData.length > 0) {
        console.log('Sample processed row:', processedData[0]);
      }
    }
  } else {
    // Assume CSV
    const csvContent = fs.readFileSync(filePath, 'utf8');
    rawData = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, any>[];
  }
  
  console.log(`Processing ${rawData.length} rows from file`);
  
  // Extract column names
  const columnNames = rawData.length > 0 ? Object.keys(rawData[0]) : [];
  
  // Define possible field name mappings
  const fieldMappingOptions: Record<string, string[]> = {
    patientId: ['patient_id', 'patientid', 'patient_identifier', 'patientidentifier', 'id', 'patient', 'medical_record_number', 'mrn'],
    noteId: ['note_id', 'noteid', 'clinical_note_id', 'record_id', 'encounter_id'],
    dosDate: ['dos_date', 'date_of_service', 'service_date', 'visitdate', 'date', 'encounter_date', 'notedate'],
    noteText: ['note_text', 'notetext', 'text', 'note', 'clinical_note', 'content', 'narrative', 'description', 'findings'],
    providerId: ['provider_id', 'providerid', 'provider', 'physician_id', 'physicianid', 'doctor'],
    
    // HRSN factors
    age: ['age', 'patient_age', 'age_years'],
    gender: ['gender', 'sex', 'patient_gender', 'patient_sex'],
    race: ['race', 'patient_race', 'racial_background'],
    ethnicity: ['ethnicity', 'ethnic_background', 'patient_ethnicity'],
    zipCode: ['zip_code', 'zipcode', 'postal_code', 'zip', 'patient_zip'],
    financialStatus: ['financial_status', 'socioeconomic_status', 'income_level', 'financial_stability'],
    housingInsecurity: ['housing_insecurity', 'housing_status', 'housing_instability', 'housing'],
    foodInsecurity: ['food_insecurity', 'food_status', 'nutrition_access', 'food_stability', 'food_access'],
    veteranStatus: ['veteran_status', 'military_status', 'is_veteran'],
    educationLevel: ['education_level', 'education', 'academic_level', 'highest_education'],
    transportation: ['access_to_transportation', 'transportation_access', 'transport', 'transportation'],
    hasCar: ['has_a_car', 'owns_car', 'has_vehicle', 'car_ownership']
  };
  
  // Use provided field mapping or auto-detect
  let effectiveFieldMapping: FieldMapping = {};
  
  if (fieldMapping) {
    // Use user-provided field mapping
    console.log('Using user-provided field mapping:', fieldMapping);
    effectiveFieldMapping = fieldMapping;
  } else {
    // Auto-detect field mappings (fuzzy matching)
    console.log('No field mapping provided. Attempting automatic detection...');
    
    // Function to find the best matching field name in the data
    function findMatchingField(possibleNames: string[], columnNames: string[]): string | null {
      // First try exact matches (case insensitive)
      for (const name of possibleNames) {
        const exactMatch = columnNames.find(col => col.toLowerCase() === name.toLowerCase());
        if (exactMatch) return exactMatch;
      }
      
      // Then try partial matches (case insensitive)
      for (const name of possibleNames) {
        const partialMatch = columnNames.find(col => col.toLowerCase().includes(name.toLowerCase()));
        if (partialMatch) return partialMatch;
      }
      
      return null;
    }
    
    // Auto-detect mappings for each field
    for (const [field, possibleNames] of Object.entries(fieldMappingOptions)) {
      const match = findMatchingField(possibleNames, columnNames);
      if (match) {
        (effectiveFieldMapping as any)[field] = match;
        console.log(`Auto-detected ${field} field as: ${match}`);
      }
    }
  }
  
  // Detect large file format based on column count and structure
  const isLargeFormat = columnNames.length > 10;
  console.log(`File format detection: Large format = ${isLargeFormat} (${columnNames.length} columns found)`);
  
  // For large format, search for any column that might contain text data
  if (isLargeFormat) {
    console.log('Applying special handling for large file format');
    
    // For large file format, find the most likely note text field if not already detected
    if (!effectiveFieldMapping.noteText) {
      for (const row of rawData.slice(0, 3)) { // Look at first 3 rows
        const longTextFields = Object.entries(row)
          .filter(([_, value]) => typeof value === 'string' && value.length > 50)
          .map(([key, _]) => key);
        
        if (longTextFields.length > 0) {
          console.log('Potential note text fields in large format:', longTextFields.join(', '));
          // Use the first long text field as the note text
          effectiveFieldMapping.noteText = longTextFields[0];
          console.log(`Auto-selecting note text field: ${longTextFields[0]}`);
        }
        
        // Look for date fields by checking for date patterns in values
        const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;
        const dateFields = Object.entries(row)
          .filter(([_, value]) => typeof value === 'string' && datePattern.test(value))
          .map(([key, _]) => key);
        
        if (dateFields.length > 0) {
          console.log('Potential date fields in large format:', dateFields.join(', '));
        }
      }
    }
  }
  
  // Validate that we have the minimum required fields
  if (!effectiveFieldMapping.patientId) {
    console.log('Patient ID field not detected. Using row index as patient ID.');
  }
  
  if (!effectiveFieldMapping.noteText) {
    throw new Error('Note text field could not be detected. Please provide a field mapping.');
  }
  
  if (!effectiveFieldMapping.dosDate) {
    console.log('Date of Service field not detected. Using current date.');
  }
  
  const patients: InsertPatient[] = [];
  const notes: InsertNote[] = [];
  
  // Process each row in the file
  let validRecords = 0;
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    // Extract data using field mapping
    const patientIdField = effectiveFieldMapping.patientId;
    const noteIdField = effectiveFieldMapping.noteId;
    const dosDateField = effectiveFieldMapping.dosDate;
    const noteTextField = effectiveFieldMapping.noteText;
    const providerIdField = effectiveFieldMapping.providerId;
    
    // Get values from the row based on mapped fields
    const rawPatientId = patientIdField ? row[patientIdField] : `patient-${i + 1}`;
    const patientId = String(rawPatientId || `patient-${i + 1}`).trim();
    
    let dosDate: string;
    
    if (dosDateField && row[dosDateField]) {
      // Try to parse and standardize the date
      try {
        const rawDate = row[dosDateField];
        
        // Check if it's already a date object
        if (rawDate instanceof Date) {
          dosDate = rawDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          // Try different date formats
          let dateObj: Date | null = null;
          
          // Try different date formats
          if (typeof rawDate === 'string') {
            // Handle date formats like MM/DD/YYYY
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
              const parts = rawDate.split('/');
              dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
            }
            // Handle date formats like YYYY-MM-DD
            else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(rawDate)) {
              dateObj = new Date(rawDate);
            }
            // Handle Excel numeric dates
            else if (/^\d+(\.\d+)?$/.test(rawDate)) {
              // Excel dates are days since 1/1/1900, with fractional parts for time
              const days = parseFloat(rawDate);
              const date = new Date(Date.UTC(1900, 0, 1));
              date.setUTCDate(date.getUTCDate() + days - 2); // -2 for Excel's date system quirk
              dateObj = date;
            }
          }
          
          if (dateObj && !isNaN(dateObj.getTime())) {
            dosDate = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else {
            // Fall back to using the raw value as string
            dosDate = String(rawDate);
          }
        }
      } catch (error) {
        console.warn(`Could not parse date "${row[dosDateField]}" for patient ${patientId}, using current date`);
        dosDate = new Date().toISOString().split('T')[0];
      }
    } else {
      // If date not found, use current date
      dosDate = new Date().toISOString().split('T')[0];
    }
    
    const noteText = noteTextField ? String(row[noteTextField] || '').trim() : '';
    const providerId = providerIdField ? String(row[providerIdField] || '').trim() : null;
    const noteId = noteIdField ? String(row[noteIdField] || '').trim() : null;
    
    // Check if patient already exists
    const existingPatientIndex = patients.findIndex(p => p.patientId === patientId);
    
    // Skip rows without note text (but still create patient record)
    if (!noteText || noteText.trim().length < 10) {
      // Still create patient record even if no note text
      if (existingPatientIndex === -1) {
        // Extract HRSN factors for patient-only record
        const ageField = effectiveFieldMapping.age;
        const genderField = effectiveFieldMapping.gender;
        const raceField = effectiveFieldMapping.race;
        const ethnicityField = effectiveFieldMapping.ethnicity;
        const zipCodeField = effectiveFieldMapping.zipCode;
        const financialStatusField = effectiveFieldMapping.financialStatus;
        const housingInsecurityField = effectiveFieldMapping.housingInsecurity;
        const foodInsecurityField = effectiveFieldMapping.foodInsecurity;
        const veteranStatusField = effectiveFieldMapping.veteranStatus;
        const educationLevelField = effectiveFieldMapping.educationLevel;
        const transportationField = effectiveFieldMapping.transportation;
        const hasCarField = effectiveFieldMapping.hasCar;
        
        const nameField = effectiveFieldMapping.patientName || 
                         findField(row, ['patient_name', 'patientName', 'Patient_Name', 'Patient Name', 'name', 'Name']);
        
        let patientName = '';
        if (nameField && row[nameField]) {
          patientName = String(row[nameField]).trim();
        } else {
          patientName = `Patient ${patientId}`;
        }
        
        const newPatient: InsertPatient = {
          patientId,
          patientName,
          providerId: providerId || null,
          providerName: null,
          providerLname: null,
          userId,
          age_range: ageField ? String(row[ageField] || '').trim() : null,
          gender: genderField ? String(row[genderField] || '').trim() : null,
          race: raceField ? String(row[raceField] || '').trim() : null,
          ethnicity: ethnicityField ? String(row[ethnicityField] || '').trim() : null,
          zip_code: zipCodeField ? String(row[zipCodeField] || '').trim() : null,
          financial_status: financialStatusField ? String(row[financialStatusField] || '').trim() : null,
          housing_insecurity: housingInsecurityField ? String(row[housingInsecurityField] || '').trim() : null,
          food_insecurity: foodInsecurityField ? String(row[foodInsecurityField] || '').trim() : null,
          veteran_status: veteranStatusField ? String(row[veteranStatusField] || '').trim() : null,
          education_level: educationLevelField ? String(row[educationLevelField] || '').trim() : null,
          access_to_transportation: transportationField ? String(row[transportationField] || '').trim() : null,
          has_a_car: hasCarField ? String(row[hasCarField] || '').trim() : null,
          // Preserve ALL additional fields from customer's file
          additional_fields: extractAdditionalFields(row, effectiveFieldMapping),
        };
        
        patients.push(newPatient);
      }
      continue; // Skip note creation but continue processing
    }
    
    // Create patient if not already added (existingPatientIndex already declared above)
    if (existingPatientIndex === -1) {
      // Extract HRSN factors if available
      const ageField = effectiveFieldMapping.age;
      const genderField = effectiveFieldMapping.gender;
      const raceField = effectiveFieldMapping.race;
      const ethnicityField = effectiveFieldMapping.ethnicity;
      const zipCodeField = effectiveFieldMapping.zipCode;
      const financialStatusField = effectiveFieldMapping.financialStatus;
      const housingInsecurityField = effectiveFieldMapping.housingInsecurity;
      const foodInsecurityField = effectiveFieldMapping.foodInsecurity;
      const veteranStatusField = effectiveFieldMapping.veteranStatus;
      const educationLevelField = effectiveFieldMapping.educationLevel;
      const transportationField = effectiveFieldMapping.transportation;
      const hasCarField = effectiveFieldMapping.hasCar;
      
      // Create new patient with proper name handling
      // Look for a name field in the data - try common patient name field variations
      const nameField = effectiveFieldMapping.patientName || 
                       findField(row, ['patient_name', 'patientName', 'Patient_Name', 'name', 'Name']);
      
      // Always use the authentic patient name from the CSV if available
      let patientName = '';
      if (nameField && row[nameField]) {
        patientName = String(row[nameField]).trim();
        console.log(`Using authentic patient name: ${patientName} for patient ID: ${patientId}`);
      } else {
        // Only use generic format if no authentic name is found
        patientName = `Patient ${patientId}`;
        console.log(`No authentic name found for patient ID: ${patientId}, using generic format`);
      }
      
      // Extract provider info if available
      const providerNameField = effectiveFieldMapping.providerName;
      
      // Extract age_range from data if available
      const ageRangeField = effectiveFieldMapping.ageRange || 'age_range' || 'age'; // Check for various age field names
      const age_range = ageRangeField && row[ageRangeField] ? String(row[ageRangeField]) : null;
      
      // Extract all HRSN factors
      const genderField2 = effectiveFieldMapping.gender;
      const raceField2 = effectiveFieldMapping.race;
      const ethnicityField2 = effectiveFieldMapping.ethnicity;
      const zipCodeField2 = effectiveFieldMapping.zipCode;
      const financialStatusField2 = effectiveFieldMapping.financialStatus;
      const housingInsecurityField2 = effectiveFieldMapping.housingInsecurity;
      const foodInsecurityField2 = effectiveFieldMapping.foodInsecurity;
      const veteranStatusField2 = effectiveFieldMapping.veteranStatus;
      const educationLevelField2 = effectiveFieldMapping.educationLevel;
      const transportationField2 = effectiveFieldMapping.transportation;
      const hasCarField2 = effectiveFieldMapping.hasCar;

      // Create new patient with fields matching the database schema
      const patient: InsertPatient = {
        patientId,
        patientName, // Use actual name or fallback to Patient ID
        providerId: providerId ? String(providerId) : null,
        providerName: providerNameField && row[providerNameField] ? String(row[providerNameField]) : null,
        providerLname: null,
        userId,
        age_range: age_range, // Include age_range in the patient data
        gender: genderField ? String(row[genderField] || '').trim() : null,
        race: raceField ? String(row[raceField] || '').trim() : null,
        ethnicity: ethnicityField ? String(row[ethnicityField] || '').trim() : null,
        zip_code: zipCodeField ? String(row[zipCodeField] || '').trim() : null,
        financial_status: financialStatusField ? String(row[financialStatusField] || '').trim() : null,
        housing_insecurity: housingInsecurityField ? String(row[housingInsecurityField] || '').trim() : null,
        food_insecurity: foodInsecurityField ? String(row[foodInsecurityField] || '').trim() : null,
        veteran_status: veteranStatusField ? String(row[veteranStatusField] || '').trim() : null,
        education_level: educationLevelField ? String(row[educationLevelField] || '').trim() : null,
        access_to_transportation: transportationField ? String(row[transportationField] || '').trim() : null,
        has_a_car: hasCarField ? String(row[hasCarField] || '').trim() : null,
        // Preserve ALL additional fields from customer's file
        additional_fields: extractAdditionalFields(row, effectiveFieldMapping),
      };
      
      patients.push(patient);
    }
    
    // Create note object with ID if available
    const noteObject: InsertNote = {
      patientId,
      dosDate,
      noteText,
      providerId,
      userId
    };
    
    // If noteId is available and is a number, use it as the database ID
    if (noteId && !isNaN(Number(noteId))) {
      (noteObject as any).id = Number(noteId);
      console.log(`Using note_id ${noteId} from input data`);
    }
    
    notes.push(noteObject);
    validRecords++;
  }
  
  console.log(`Processed ${validRecords} valid records from ${rawData.length} total rows`);
  console.log(`Found ${patients.length} unique patients`);
  console.log(`Created ${notes.length} note records`);
  
  return {
    patients,
    notes,
    recordCount: notes.length,
    patientCount: patients.length
  };
}

/**
 * Save notes to database in batches to avoid overwhelming the system
 */
async function saveNotesInBatches(notesList: InsertNote[]): Promise<void> {
  const BATCH_SIZE = 1000; // Process 1000 notes at a time
  const totalNotes = notesList.length;
  const totalBatches = Math.ceil(totalNotes / BATCH_SIZE);
  
  console.log(`Starting batch processing of ${totalNotes} notes in ${totalBatches} batches`);
  
  for (let i = 0; i < totalNotes; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const batch = notesList.slice(i, i + BATCH_SIZE);
    const batchStartTime = Date.now();
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} notes)...`);
    
    try {
      // Use database batch insertion
      await storage.saveNotes(batch);
      
      const batchDuration = (Date.now() - batchStartTime) / 1000;
      console.log(`✅ Batch ${batchNumber} completed in ${batchDuration.toFixed(2)}s`);
      
      // Small delay to prevent overwhelming the database
      if (batchNumber < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Error processing batch ${batchNumber}:`, error);
      throw error;
    }
  }
  
  console.log(`✅ All ${totalBatches} note batches completed successfully`);
}

/**
 * Import uploaded CSV file data into the database
 */
export async function importCsvToDatabase(filename: string, options: { overwrite?: boolean } = {}) {
  console.log(`📥 Starting CSV import for file: ${filename}`);
  
  // Construct file path
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filename}`);
  }
  
  // Clear existing data if overwrite is true
  if (options.overwrite) {
    console.log('🗑️ Clearing existing database records...');
    // Use SQL to clear data safely
    await storage.executeRawQuery('DELETE FROM extracted_symptoms');
    await storage.executeRawQuery('DELETE FROM notes');
    await storage.executeRawQuery('DELETE FROM patients');
    console.log('✅ Existing data cleared');
  }
  
  // Process the file and import to database
  const processedData = await processFileData(filePath);
  
  // Save patients to database in batch - add user_id to each patient record
  if (processedData.patients.length > 0) {
    const patientsWithUserId = processedData.patients.map(patient => ({
      ...patient,
      userId: 4 // Default to user ID 4 for now
    }));
    await storage.savePatients(patientsWithUserId);
  }
  
  // Save notes to database with ENTERPRISE DIRECT BATCH PROCESSING
  if (processedData.notes.length > 0) {
    console.log(`🚀 ENTERPRISE: Direct processing ${processedData.notes.length} notes with optimized bulk insert...`);
    const notesWithUserId = processedData.notes.map(note => ({
      ...note,
      userId: 4 // Default to user ID 4 for now
    }));
    await storage.saveNotes(notesWithUserId);
  }
  
  console.log(`✅ Import completed: ${processedData.recordCount} records, ${processedData.patientCount} patients`);
  
  return {
    recordsProcessed: processedData.recordCount,
    patientsProcessed: processedData.patientCount
  };
}