import fs from 'fs';
import path from 'path';
import { pool } from '../db';
import { InsertSymptomMaster } from '@shared/schema';

// Path to fallback file (only used if database query fails)
const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const SYMPTOM_LIBRARY_PATH = path.join(DATA_DIR, 'symptomLibrary.json');

/**
 * Loads ALL symptoms directly from the database without any generation
 * This is the main function for accessing the symptom library
 * Will handle libraries of any size efficiently (100, 3,800, 25,000, etc.)
 */
export async function ensureSymptomLibrary(): Promise<InsertSymptomMaster[]> {
  try {
    console.log('Loading ALL symptoms directly from database...');
    
    // Load symptoms directly from the database without any generation
    console.log('Querying database for ALL symptoms...');
    const result = await pool.query('SELECT * FROM symptom_master');
    const databaseSymptoms = result.rows.map(row => ({
      symptom_id: row.symptom_id,
      symptom_segment: row.symptom_segment,
      diagnosis: row.diagnosis,
      diagnostic_category: row.diagnostic_category,
      symp_prob: row.symp_prob || row.symptom_problem || "Symptom",
      zcode_hrsn: row.zcode_hrsn || "No"
    }));
    
    const symptomCount = databaseSymptoms.length;
    console.log(`Successfully loaded ${symptomCount} symptoms from database`);
    
    // Return ALL symptoms from the database without any filtering or modification
    return databaseSymptoms;
  } catch (error: any) {
    console.error('Error loading symptoms from database:', error);
    
    // Try loading from file as backup only if database query fails
    console.log('Database query failed, trying to load from file as backup...');
    try {
      if (fs.existsSync(SYMPTOM_LIBRARY_PATH)) {
        const fileContent = fs.readFileSync(SYMPTOM_LIBRARY_PATH, 'utf8');
        const parsedContent = JSON.parse(fileContent);
        
        // Support both array format and metadata object format
        if (Array.isArray(parsedContent)) {
          console.log(`Loaded ${parsedContent.length} symptoms from file backup (array format)`);
          return parsedContent;
        } else if (parsedContent.symptoms && Array.isArray(parsedContent.symptoms)) {
          console.log(`Loaded ${parsedContent.symptoms.length} symptoms from file backup (metadata format)`);
          return parsedContent.symptoms;
        }
      }
    } catch (fileError) {
      console.error('Error loading from file backup:', fileError);
    }
    
    // As an absolute last resort for emergency situations only
    console.error('CRITICAL ERROR: Could not load symptoms from database or file backup');
    throw new Error(`Failed to load symptoms: ${error.message}`);
  }
}

/**
 * Get the symptom library from cache file
 * This is deprecated - use ensureSymptomLibrary instead which loads directly from database
 */
export function getSymptomLibrary(): InsertSymptomMaster[] {
  console.log('WARNING: Using getSymptomLibrary() is deprecated - use ensureSymptomLibrary() instead for direct database access');
  
  try {
    // Check if we have a valid library file
    if (fs.existsSync(SYMPTOM_LIBRARY_PATH)) {
      try {
        const fileContent = fs.readFileSync(SYMPTOM_LIBRARY_PATH, 'utf8');
        const parsedContent = JSON.parse(fileContent);
        
        // Handle both direct array and metadata object formats
        if (Array.isArray(parsedContent) && parsedContent.length > 0) {
          console.log(`Using symptom library from file with ${parsedContent.length} symptoms`);
          return parsedContent;
        } else if (parsedContent.symptoms && Array.isArray(parsedContent.symptoms) && 
                  parsedContent.symptoms.length > 0) {
          console.log(`Using symptom library from file (version ${parsedContent.version || 'unknown'}) with ${parsedContent.symptoms.length} symptoms`);
          return parsedContent.symptoms;
        } else {
          console.log('Found symptom library file but it has no entries');
        }
      } catch (parseError) {
        console.error('Error parsing symptom library file:', parseError);
      }
    }
    
    // No entries from file, show warning and return empty array
    console.warn('WARNING: No symptom library found in file system');
    console.warn('This function should not be used - use ensureSymptomLibrary() instead for database access');
    return [];
  } catch (error: any) {
    console.error('Error in getSymptomLibrary:', error);
    console.warn('This function should not be used - use ensureSymptomLibrary() instead for database access');
    return [];
  }
}

/**
 * Converts symptom segment exactly as stored in database to match the format
 * This is a utility function that makes no changes to the symptom text
 */
export function formatSymptomSegment(symptomSegment: string): string {
  // Return the symptom segment exactly as is from the database with no changes
  return symptomSegment;
}