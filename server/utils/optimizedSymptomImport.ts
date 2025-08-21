/**
 * Optimized utility to import symptom segments from CSV file to database
 * Handles the import in smaller chunks with better error handling
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { pool } from '../db';
import { InsertSymptomMaster } from '@shared/schema';

// The CSV file is in the root/attached_assets directory
const CSV_FILE_PATH = path.join(process.cwd(), '..', 'attached_assets', 'Symptom_Segments_asof_11_21_24_MASTER.csv');
const BATCH_SIZE = 25; // Smaller batch size to avoid timeouts

/**
 * Import symptoms from the CSV file into the database
 * This version uses smaller batches and more resilient error handling
 */
export async function importSymptomsOptimized(skipCount = 0, limitCount = 0): Promise<number> {
  console.log(`Starting optimized import of symptoms from ${CSV_FILE_PATH}`);
  console.log(`Skip: ${skipCount}, Limit: ${limitCount || 'ALL'}`);
  
  // Check if the file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`CSV file not found at ${CSV_FILE_PATH}`);
    throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
  }

  try {
    // First, let's count how many symptoms are already in the database
    const countResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const existingCount = parseInt(String(countResult.rows[0].count), 10);
    console.log(`Database currently has ${existingCount} symptoms`);

    // Parse all symptoms from the CSV into memory
    const symptoms = await parseSymptoms();
    console.log(`Parsed ${symptoms.length} symptoms from CSV file`);
    
    // If limitCount is specified, only process that many symptoms
    const targetSymptoms = limitCount 
      ? symptoms.slice(skipCount, skipCount + limitCount) 
      : symptoms.slice(skipCount);
      
    console.log(`Processing ${targetSymptoms.length} symptoms (${skipCount}-${skipCount + targetSymptoms.length})`);

    // Process symptoms in small batches
    const importedCount = await processSymptomBatches(targetSymptoms);
    
    // Verify the final count
    const finalCountResult = await pool.query('SELECT COUNT(*) FROM symptom_master');
    const finalCount = parseInt(String(finalCountResult.rows[0].count), 10);
    
    console.log(`Import complete! Database now has ${finalCount} symptoms (added ${finalCount - existingCount})`);
    return finalCount;
  } catch (error) {
    console.error('Error in optimized import:', error);
    throw error;
  }
}

/**
 * Parse all symptoms from the CSV file
 */
async function parseSymptoms(): Promise<InsertSymptomMaster[]> {
  return new Promise((resolve, reject) => {
    const symptoms: InsertSymptomMaster[] = [];
    const fileStream = fs.createReadStream(CSV_FILE_PATH);
    
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Process each row from the CSV
    parser.on('readable', () => {
      let record;
      // Debug CSV headers
      if (symptoms.length === 0) {
        console.log('CSV Headers:', Object.keys(parser.read() || {}).join(', '));
      }
      
      while ((record = parser.read()) !== null) {
        // Debug first record
        if (symptoms.length === 0) {
          console.log('First CSV Record:', JSON.stringify(record));
        }
        
        // Map CSV columns to database schema
        const symptom: InsertSymptomMaster = {
          symptomId: record.Symptom_ID || `CSV_${symptoms.length + 1}`,
          symptomSegment: record.Symptom_Segment || '',
          diagnosis: record.Diagnosis || null,
          diagnosticCategory: record.Diagnostic_Category || null,
          symptomProblem: record.DSM_Symptom_Criteria || null,
          sympProb: record.Symp_Prob || null
        };
        
        // Only add valid symptoms
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
    
    // When parsing is complete, resolve with the symptoms
    parser.on('end', () => {
      console.log(`Parsed ${symptoms.length} symptoms from CSV file`);
      resolve(symptoms);
    });
    
    // Pipe the file stream to the parser
    fileStream.pipe(parser);
  });
}

/**
 * Process symptoms in small batches
 */
async function processSymptomBatches(symptoms: InsertSymptomMaster[]): Promise<number> {
  let successCount = 0;
  
  // Process in small batches
  for (let i = 0; i < symptoms.length; i += BATCH_SIZE) {
    const batchSymptoms = symptoms.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(symptoms.length / BATCH_SIZE);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batchSymptoms.length} symptoms)`);
    
    try {
      await insertSymptomBatch(batchSymptoms);
      successCount += batchSymptoms.length;
      console.log(`Successfully inserted batch ${batchNumber}/${totalBatches}`);
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}/${totalBatches}:`, error);
      // Continue with next batch despite errors
    }
  }
  
  return successCount;
}

/**
 * Insert a batch of symptoms into the database
 */
async function insertSymptomBatch(symptoms: InsertSymptomMaster[]): Promise<void> {
  if (symptoms.length === 0) return;
  
  try {
    // Build a parameterized query for the batch
    const values: any[] = [];
    const placeholders: string[] = [];
    
    symptoms.forEach((symptom, index) => {
      const offset = index * 6;
      // Create placeholders like ($1, $2, $3, $4, $5, $6)
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
      
      // Add values in order
      values.push(
        symptom.symptomId,
        symptom.symptomSegment,
        symptom.diagnosis,
        symptom.diagnosticCategory,
        symptom.symptomProblem,
        symptom.sympProb
      );
    });
    
    // Combine placeholders - now using composite unique constraint for clinical accuracy
    const query = `
      INSERT INTO symptom_master 
      (symptom_id, symptom_segment, diagnosis, diagnostic_category, symptom_problem, symp_prob)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (symptom_id, symptom_segment, diagnosis, diagnostic_category) DO NOTHING
    `;
    
    // Execute the query
    await pool.query(query, values);
  } catch (error) {
    console.error('Error inserting symptom batch:', error);
    throw error;
  }
}