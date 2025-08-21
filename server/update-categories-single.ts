/**
 * Fast, direct update script for diagnostic categories
 * This version uses a direct SQL UPDATE to set categories based on exact symptom/diagnosis matches
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { pool } from './db';

async function main() {
  try {
    console.log('Starting direct diagnostic category update...');
    
    // Path to the CSV file
    const csvPath = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      return;
    }
    
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(csvPath, { encoding: 'utf-8' });
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Check database status before update
    const beforeResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN diagnostic_category IS NULL OR diagnostic_category = '' THEN 1 ELSE 0 END) as missing
       FROM symptom_master`
    );
    const beforeTotal = parseInt(beforeResult.rows[0].total, 10);
    const beforeMissing = parseInt(beforeResult.rows[0].missing, 10);
    
    console.log(`Database has ${beforeTotal} total records`);
    console.log(`${beforeMissing} records missing diagnostic categories before update`);
    
    // Find the correct column names in the CSV
    const recordKeys = Object.keys(records[0]);
    console.log('CSV columns:', recordKeys);
    
    // Create a map of symptom_id -> diagnostic_category
    const categoryMap = new Map();
    for (const record of records) {
      const symptomId = record.symptomId;
      const category = record['﻿diagnosticCategory'];
      if (symptomId && category) {
        categoryMap.set(symptomId, category);
      }
    }
    
    console.log(`Created map with ${categoryMap.size} symptom ID to category mappings`);
    
    // Update in a single SQL query for each symptom ID
    let updated = 0;
    let errors = 0;
    let notFound = 0;
    
    for (const [symptomId, category] of categoryMap.entries()) {
      try {
        // Update any records with this symptom ID that are missing a category
        const result = await pool.query(
          `UPDATE symptom_master 
           SET diagnostic_category = $1 
           WHERE symptom_id = $2 AND (diagnostic_category IS NULL OR diagnostic_category = '')`,
          [category, symptomId]
        );
        
        const count = result.rowCount || 0;
        if (count > 0) {
          updated += count;
          console.log(`Updated ${count} records for symptom ID ${symptomId} to category "${category}"`);
        } else {
          notFound++;
        }
      } catch (error) {
        console.error(`Error updating category for symptom ID ${symptomId}:`, error);
        errors++;
      }
      
      // Show progress periodically
      if ((updated + notFound + errors) % 100 === 0 || (updated + notFound + errors) === categoryMap.size) {
        console.log(`Progress: ${updated + notFound + errors}/${categoryMap.size} symptom IDs processed`);
        console.log(`Updated: ${updated}, Not Found: ${notFound}, Errors: ${errors}`);
      }
    }
    
    // Check database status after update
    const afterResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN diagnostic_category IS NULL OR diagnostic_category = '' THEN 1 ELSE 0 END) as missing
       FROM symptom_master`
    );
    const afterTotal = parseInt(afterResult.rows[0].total, 10);
    const afterMissing = parseInt(afterResult.rows[0].missing, 10);
    
    console.log('\nUpdate complete!');
    console.log(`Total records: ${afterTotal}`);
    console.log(`Missing categories before: ${beforeMissing}`);
    console.log(`Missing categories after: ${afterMissing}`);
    console.log(`Records updated: ${updated}`);
    console.log(`Update percentage: ${Math.round((beforeMissing - afterMissing) / beforeMissing * 100)}%`);
    
    if (afterMissing > 0) {
      // Sample records still missing categories
      const samplesResult = await pool.query(
        `SELECT id, symptom_id, symptom_segment, diagnosis 
         FROM symptom_master 
         WHERE diagnostic_category IS NULL OR diagnostic_category = '' 
         LIMIT 10`
      );
      
      console.log('\nSample records still missing categories:');
      console.table(samplesResult.rows);
    }
    
  } catch (error) {
    console.error('Unhandled error:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});