/**
 * Phased Import of Complete Symptom Master File
 * 
 * This script imports ALL symptoms from the updated master file in phases to avoid timeouts.
 * Each phase processes a chunk of the file and can be resumed if interrupted.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { pool, db } from './db';

const CSV_FILE_PATH = path.resolve('/home/runner/workspace/attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
const PHASE_SIZE = 500; // Process 500 records per phase
const BATCH_SIZE = 50;  // Process 50 records per batch within each phase

async function main() {
  try {
    console.log('Starting PHASED import of all symptom segments from updated master file');
    
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found at ${CSV_FILE_PATH}`);
    }

    // Get the start phase from command line args
    const args = process.argv.slice(2);
    let startPhase = 0;
    let clearExisting = false;
    
    if (args.length > 0) {
      startPhase = parseInt(args[0], 10) || 0;
    }
    
    if (args.length > 1 && args[1] === 'clear') {
      clearExisting = true;
    }
    
    // Optionally clear existing data
    if (clearExisting) {
      console.log('WARNING: This will clear all existing symptom_master data.');
      console.log('Press Ctrl+C within 5 seconds to cancel...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('Clearing existing symptom entries...');
      await pool.query('DELETE FROM symptom_master');
      console.log('Existing data cleared.');
    }

    // Read and parse the CSV file
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const records = parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    });
    
    const totalRecords = records.length;
    const totalPhases = Math.ceil(totalRecords / PHASE_SIZE);
    console.log(`Parsed ${totalRecords} records from CSV file`);
    console.log(`Will process in ${totalPhases} phases of ${PHASE_SIZE} records each`);
    
    if (startPhase > 0) {
      console.log(`Starting from phase ${startPhase}/${totalPhases}`);
    }
    
    // Process each phase
    let globalSuccess = 0;
    let globalErrors = 0;
    
    for (let phase = startPhase; phase < totalPhases; phase++) {
      const phaseStart = phase * PHASE_SIZE;
      const phaseEnd = Math.min(phaseStart + PHASE_SIZE, totalRecords);
      const phaseRecords = records.slice(phaseStart, phaseEnd);
      
      console.log(`\n=== PHASE ${phase + 1}/${totalPhases} ===`);
      console.log(`Processing records ${phaseStart + 1} to ${phaseEnd} (${phaseEnd - phaseStart} records)`);
      
      // Process this phase in batches
      let phaseProcessed = 0;
      let phaseSuccess = 0;
      let phaseErrors = 0;
      
      for (let i = 0; i < phaseRecords.length; i += BATCH_SIZE) {
        const batch = phaseRecords.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(phaseRecords.length / BATCH_SIZE);
        
        console.log(`Processing batch ${batchNum}/${totalBatches} in phase ${phase + 1}...`);
        
        // Process each record in this batch
        for (const record of batch) {
          try {
            // Use raw SQL to insert with ICD-10 code
            await pool.query(
              `INSERT INTO symptom_master 
               (symptom_id, symptom_segment, diagnosis, diagnosis_icd10_code, diagnostic_category, symp_prob)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT ON CONSTRAINT symptom_combined_unique DO UPDATE 
               SET 
                 diagnosis_icd10_code = EXCLUDED.diagnosis_icd10_code,
                 symp_prob = EXCLUDED.symp_prob`,
              [
                record.symptomId, 
                record.symptomSegment,
                record.Diagnosis,
                record["Diagnosis_ICD-10_Code"], // Include the ICD-10 code - keep brackets syntax for field with hyphen
                record.diagnosticCategory,
                record.sympProb
              ]
            );
            phaseSuccess++;
            globalSuccess++;
          } catch (error) {
            console.error(`Error inserting record ${record.symptomId}:`, error);
            phaseErrors++;
            globalErrors++;
          }
          
          phaseProcessed++;
        }
        
        // Report progress after each batch
        const phaseProgress = Math.round((phaseProcessed / phaseRecords.length) * 100);
        console.log(`Batch ${batchNum}/${totalBatches} complete | Phase progress: ${phaseProgress}%`);
        console.log(`Phase successes: ${phaseSuccess}, Phase errors: ${phaseErrors}`);
      }
      
      // Phase complete report
      console.log(`\nPhase ${phase + 1}/${totalPhases} complete`);
      console.log(`Processed ${phaseProcessed} records in this phase`);
      console.log(`Success: ${phaseSuccess}, Errors: ${phaseErrors}`);
      
      // Save checkpoint - output command to continue from next phase
      console.log(`\nTo continue from the next phase, run:`);
      console.log(`npx tsx server/import-all-symptoms-phased.ts ${phase + 1}`);
      
      // Get current count
      const { rows: currentCount } = await pool.query('SELECT COUNT(*) as count FROM symptom_master');
      console.log(`Current database count: ${currentCount[0].count} symptom records`);
    }
    
    // Final report
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Total records processed: ${globalSuccess + globalErrors}`);
    console.log(`Successfully imported: ${globalSuccess}`);
    console.log(`Errors: ${globalErrors}`);
    
    // Get final statistics from database
    const { rows: stats } = await pool.query(`
      SELECT COUNT(*) as total_symptoms FROM symptom_master
    `);
    
    console.log(`\nDatabase now contains ${stats[0].total_symptoms} symptom entries`);
    
    // Get distribution by category
    const { rows: categoryStats } = await pool.query(`
      SELECT diagnostic_category, COUNT(*) as count 
      FROM symptom_master 
      GROUP BY diagnostic_category 
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `);
    
    console.log('\nSymptom distribution by diagnostic category:');
    console.table(categoryStats);
    
  } catch (error) {
    console.error('Error during symptom import:', error);
  } finally {
    await db.$client.end();
    console.log('Database connection closed.');
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});