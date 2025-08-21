/**
 * Utility to import symptom segments from CSV file to database
 * Loads Symptom_Segments_asof_11_21_24_MASTER.csv
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { db } from '../db';
import { symptomMaster, InsertSymptomMaster } from '@shared/schema';
import { storage } from '../storage';

const CSV_FILE_PATH = path.join(process.cwd(), 'attached_assets', 'Symptom_Segments_asof_11_21_24_MASTER.csv');

/**
 * Import symptoms from the CSV file into the database
 */
export async function importSymptomsFromCSV(): Promise<number> {
  console.log(`Starting import of symptoms from ${CSV_FILE_PATH}`);
  
  return new Promise((resolve, reject) => {
    // Check if the file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`CSV file not found at ${CSV_FILE_PATH}`);
      return reject(new Error(`CSV file not found at ${CSV_FILE_PATH}`));
    }

    const symptoms: InsertSymptomMaster[] = [];
    
    // Create a read stream for the CSV file
    const fileStream = fs.createReadStream(CSV_FILE_PATH);
    
    // Parse the CSV file
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Process each row from the CSV
    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        // Map CSV columns to database schema
        // Note: The database table uses snake_case while our TypeScript types use camelCase
        const symptom: InsertSymptomMaster = {
          symptomId: record.Symptom_ID || `CSV_${symptoms.length + 1}`,
          symptomSegment: record.Symptom_Segment || '',
          diagnosis: record.Diagnosis || null,
          diagnosticCategory: record.Diagnostic_Category || null,
          symptomProblem: record.DSM_Symptom_Criteria || null,
          sympProb: record.Symp_Prob || null
        };
        
        // Only add the symptom if it has a valid segment
        if (symptom.symptomSegment && symptom.symptomSegment.trim() !== '') {
          symptoms.push(symptom);
        }
      }
    });
    
    // Handle errors during parsing
    parser.on('error', (err) => {
      console.error('Error parsing CSV:', err);
      reject(err);
    });
    
    // When parsing is complete, save the symptoms to the database
    parser.on('end', async () => {
      console.log(`Parsed ${symptoms.length} symptoms from CSV file`);
      
      try {
        // First, truncate the existing table to ensure a clean import
        console.log('Truncating existing symptom_master table...');
        await db.execute('TRUNCATE TABLE symptom_master RESTART IDENTITY');
        
        // Insert symptoms in batches to avoid memory issues
        const BATCH_SIZE = 100;
        console.log(`Inserting symptoms in batches of ${BATCH_SIZE}...`);
        
        for (let i = 0; i < symptoms.length; i += BATCH_SIZE) {
          const batch = symptoms.slice(i, i + BATCH_SIZE);
          console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(symptoms.length/BATCH_SIZE)} (${batch.length} symptoms)`);
          
          // Save the batch
          try {
            // @ts-ignore - Type error is expected as the storage method handles the insertion
            await storage.saveSymptomMaster(batch);
          } catch (error) {
            console.error(`Error saving batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
            // Continue with the next batch despite errors
          }
        }
        
        // Verify the import was successful
        const countResult = await db.execute('SELECT COUNT(*) as count FROM symptom_master');
        const countStr = String(countResult.rows[0].count);
        const count = parseInt(countStr, 10);
        console.log(`Successfully imported ${count} symptoms into database (out of ${symptoms.length} in CSV)`);
        
        resolve(count || 0);
      } catch (error) {
        console.error('Error saving symptoms to database:', error);
        reject(error);
      }
    });
    
    // Pipe the file stream to the parser
    fileStream.pipe(parser);
  });
}

// This is now only meant to be imported, not run directly