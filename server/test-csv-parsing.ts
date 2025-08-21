/**
 * Test script to check CSV parsing issues
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function main() {
  try {
    console.log('Testing CSV parsing...');
    
    const csvPath = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      return;
    }
    
    // Read the raw CSV content
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('First 500 characters of CSV:');
    console.log(csvContent.substring(0, 500));
    
    // Try different parsing approaches
    console.log('\nParsing with default options:');
    const records1 = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Parsed ${records1.length} records`);
    console.log('First record keys:', Object.keys(records1[0]));
    console.log('First record:', records1[0]);
    
    // Try with relax_column_count
    console.log('\nParsing with relax_column_count:');
    const records2 = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });
    
    console.log(`Parsed ${records2.length} records`);
    console.log('First record keys:', Object.keys(records2[0]));
    console.log('First record:', records2[0]);
    
    // Try with trim
    console.log('\nParsing with trim:');
    const records3 = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Parsed ${records3.length} records`);
    console.log('First record keys:', Object.keys(records3[0]));
    console.log('First record:', records3[0]);
    
    // Try with fromLine
    console.log('\nParsing with fromLine:');
    const records4 = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      from_line: 1
    });
    
    console.log(`Parsed ${records4.length} records`);
    console.log('First record keys:', Object.keys(records4[0]));
    console.log('First record:', records4[0]);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});