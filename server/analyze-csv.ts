/**
 * Script to analyze CSV file for duplicate records
 * 
 * This script examines the CSV file to identify duplicate record keys
 * and potential discrepancies between the CSV and database
 */

import * as fs from "fs";
import { parse } from "csv-parse";

// Constants
const CSV_FILE_PATH = '../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv';

interface SymptomMasterRow {
  diagnosticCategory?: string;
  'Diagnosis_ICD-10_Code'?: string;
  Diagnosis?: string;
  DSM_Symptom_Criteria?: string;
  symptomId?: string;
  symptomSegment?: string;
  ZCode_HRSN?: string;
  sympProb?: string;
  // Any other columns that might be in the file
  [key: string]: string | undefined;
}

async function parseCSVFile(filePath: string): Promise<SymptomMasterRow[]> {
  // Parse the CSV file and return the data as an array of objects
  const results: SymptomMasterRow[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (data) => results.push(data))
      .on('error', (error) => reject(error))
      .on('end', () => resolve(results));
  });
}

async function main() {
  try {
    console.log(`Reading CSV file from ${CSV_FILE_PATH}...`);
    const csvData = await parseCSVFile(CSV_FILE_PATH);
    console.log(`Read ${csvData.length} rows from CSV`);
    
    // For this run, first prioritize Problem records that are likely to be HRSN indicators
    // and then do the Symptom records if time permits
    const problemRecords = csvData.filter(row => row.sympProb === 'Problem');
    const symptomRecords = csvData.filter(row => row.sympProb === 'Symptom' || !row.sympProb);
    
    console.log(`Found ${problemRecords.length} Problem records and ${symptomRecords.length} Symptom records`);
    
    // Analyze symptomId distribution
    const symptomIds = csvData.map(row => row.symptomId);
    const uniqueSymptomIds = new Set(symptomIds);
    console.log(`Unique symptom IDs: ${uniqueSymptomIds.size}`);
    console.log(`Duplicate symptom IDs: ${csvData.length - uniqueSymptomIds.size}`);
    
    // Count records with missing essential fields
    const missingSymptomId = csvData.filter(row => !row.symptomId).length;
    const missingSegment = csvData.filter(row => !row.symptomSegment).length;
    const missingDiagnosticCategory = csvData.filter(row => !row.diagnosticCategory).length;
    const missingSympProb = csvData.filter(row => !row.sympProb).length;
    
    console.log('Missing field analysis:');
    console.log(`Records with missing symptomId: ${missingSymptomId}`);
    console.log(`Records with missing symptomSegment: ${missingSegment}`);
    console.log(`Records with missing diagnosticCategory: ${missingDiagnosticCategory}`);
    console.log(`Records with missing sympProb: ${missingSympProb}`);
    
    // Count unique combinations of all 8 critical fields
    const patientId = '1'; // Fixed patient ID used in the import script
    const uniqueKeys = new Set();
    let duplicateKeys = 0;
    
    csvData.forEach(row => {
      // Create a composite key using all 8 critical fields
      const key = [
        row.diagnosticCategory || '',
        row['Diagnosis_ICD-10_Code'] || '',
        row.Diagnosis || '',
        row.DSM_Symptom_Criteria || '',
        row.symptomId || '',
        row.symptomSegment || '',
        row.ZCode_HRSN || '',
        row.sympProb || ''
      ].join('|');
      
      if (uniqueKeys.has(key)) {
        duplicateKeys++;
      } else {
        uniqueKeys.add(key);
      }
    });
    
    console.log(`Unique records (all 8 fields match): ${uniqueKeys.size}`);
    console.log(`Duplicate records (all 8 fields match): ${duplicateKeys}`);
    
    // Calculate expected database record count after deduplication
    console.log(`Expected maximum database record count (all 8 fields unique): ${uniqueKeys.size}`);
    
  } catch (error) {
    console.error('Error in CSV analysis:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });