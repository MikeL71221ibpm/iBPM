import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from './db.js';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateHrsnData() {
  try {
    console.log('Starting HRSN data update...');
    
    // Read the CSV file
    const csvPath = path.join('..', 'attached_assets', 'updated_population_data_with_diagnosis_for Testing_1062 records_4_25_25.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csvData, { columns: true });
    
    console.log(`Loaded ${records.length} records from CSV`);
    
    // Create a map of patient data by patient_ID#
    const patientMap = new Map();
    
    records.forEach(record => {
      const patientId = record['patient_ID#'];
      
      // If we haven't seen this patient before, add them to our map
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patient_id: patientId,
          gender: record.gender || null,
          race: record.race || null,
          ethnicity: record.ethnicity || null,
          zip_code: record.zip_code || null,
          financial_status: record.financial_status || null,
          housing_insecurity: record.housing_insecurity || null,
          food_insecurity: record.food_insecurity || null,
          veteran_status: record.veteran_status || null,
          education_level: record.education_level || null,
          access_to_transportation: record.access_to_transportation || null,
          has_a_car: record.has_a_car || null
        });
      }
    });
    
    console.log(`Found ${patientMap.size} unique patients`);
    
    // Update each patient in the database
    let updatedCount = 0;
    
    for (const [patientId, patientData] of patientMap.entries()) {
      // Get current patient data
      const existingPatients = await db.execute(
        sql`SELECT id FROM patients WHERE patient_id = ${patientId}`
      );
      
      if (existingPatients.length > 0) {
        // Update the patient record
        await db.execute(
          sql`UPDATE patients SET 
            gender = ${patientData.gender},
            race = ${patientData.race},
            ethnicity = ${patientData.ethnicity},
            zip_code = ${patientData.zip_code},
            financial_status = ${patientData.financial_status},
            housing_insecurity = ${patientData.housing_insecurity},
            food_insecurity = ${patientData.food_insecurity},
            veteran_status = ${patientData.veteran_status},
            education_level = ${patientData.education_level},
            access_to_transportation = ${patientData.access_to_transportation},
            has_a_car = ${patientData.has_a_car}
            WHERE patient_id = ${patientId}`
        );
        updatedCount++;
        
        // Log progress every 10 records
        if (updatedCount % 10 === 0) {
          console.log(`Updated ${updatedCount} patients...`);
        }
      }
    }
    
    console.log(`Completed HRSN data update. Updated ${updatedCount} patients.`);
  } catch (error) {
    console.error('Error updating HRSN data:', error);
  }
}

updateHrsnData();
