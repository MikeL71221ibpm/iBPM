/**
 * Debug script to examine CSV field access patterns
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function main() {
  try {
    console.log('Debugging CSV field access...');
    
    const csvPath = path.resolve('../attached_assets/Symptom_Segments_asof_4_28_25_MASTER.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`File not found: ${csvPath}`);
      return;
    }
    
    // Read the raw CSV first line to see exact headers
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const firstLine = csvContent.split('\n')[0];
    console.log('CSV header line:', firstLine);
    
    // Parse the CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    if (records.length === 0) {
      console.log('No records found!');
      return;
    }
    
    // Examine the first record in detail
    const firstRecord = records[0];
    console.log('\nFirst record as JSON:', JSON.stringify(firstRecord, null, 2));
    
    // List all keys in the record
    console.log('\nAll keys in first record:');
    const keys = Object.keys(firstRecord);
    keys.forEach(key => {
      console.log(`- "${key}": "${firstRecord[key]}"`);
    });
    
    // Try different access patterns
    console.log('\nTrying different field access patterns:');
    
    // Direct property access
    console.log('- Direct:');
    console.log(`  diagnosticCategory: ${firstRecord.diagnosticCategory}`);
    console.log(`  Diagnosis: ${firstRecord.Diagnosis}`);
    console.log(`  symptomSegment: ${firstRecord.symptomSegment}`);
    
    // Bracket notation
    console.log('- Bracket notation:');
    console.log(`  ['diagnosticCategory']: ${firstRecord['diagnosticCategory']}`);
    console.log(`  ['Diagnosis']: ${firstRecord['Diagnosis']}`);
    console.log(`  ['symptomSegment']: ${firstRecord['symptomSegment']}`);
    
    // Try with variations
    console.log('- Various case variations:');
    const variations = [
      'diagnosticcategory', 'DiagnosticCategory', 'diagnostic_category',
      'DIAGNOSTICCATEGORY', 'Diagnostic_Category', 'diagnostic-category'
    ];
    
    variations.forEach(v => {
      console.log(`  ${v}: ${firstRecord[v]}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});