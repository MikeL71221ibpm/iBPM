/**
 * Symptom Extractor V3.2
 * 
 * An advanced symptom extraction system that implements the refined symptom matcher
 * algorithm with enhanced context awareness and comprehensive organization.
 * 
 * Version: 3.2.0
 * Date: May 19, 2025
 */

import { storage } from '../storage';
// Import the symptom matcher functions directly
import { refinedSymptomMatcher } from './symptomMatcherV3_2.mjs';

// Constants
const VERSION_ID = 'v3.2';
const EXTRACTION_METHOD = 'context_aware_matching';

interface ExtractionOptions {
  preserveDuplicates?: boolean;
  debug?: boolean;
  useWordBoundaries?: boolean;
  considerNegation?: boolean;
}

/**
 * Extract symptoms from clinical notes using the V3.2 enhanced algorithm
 * 
 * @param patientNotes - Array of clinical notes
 * @param symptomDatabase - Database of symptoms to match against
 * @param options - Configuration options for extraction
 * @returns Extracted symptoms with organization metadata
 */
export async function extractSymptoms(
  patientNotes: any[],
  symptomDatabase: any[],
  options: ExtractionOptions = {}
) {
  // Default options
  const config = {
    preserveDuplicates: true, // V3.2 can preserve duplicates for intensity measurement
    debug: false,
    useWordBoundaries: true,
    considerNegation: true,
    ...options
  };

  // Initialize results
  const allExtractedSymptoms: any[] = [];
  const processed: { [key: string]: number } = {};

  // Track organized results for research/debugging
  const organizationData = {
    bySymptomSegment: {},
    byDiagnosis: {},
    byCategory: {},
    byDiagnosisCode: {}
  };

  // Process notes by patient
  for (const note of patientNotes) {
    // Skip invalid notes
    if (!note || !note.note_text || !note.patient_id) {
      continue;
    }

    const patientId = note.patient_id;
    const noteText = note.note_text;
    const noteId = note.note_id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const dosDate = note.dos_date || note.date_of_service || new Date().toISOString().slice(0, 10);

    // Skip already processed notes
    const noteKey = `${patientId}_${noteId}`;
    if (processed[noteKey]) {
      continue;
    }
    processed[noteKey] = 1;

    try {
      // Use the refined symptom matcher
      const { matches, organizedResults } = refinedSymptomMatcher(
        noteText,
        symptomDatabase,
        {
          considerNegation: config.considerNegation,
          useWordBoundaries: config.useWordBoundaries,
          debugMode: config.debug
        }
      );

      // Merge organization data (for research/reporting)
      Object.keys(organizedResults).forEach(category => {
        Object.keys(organizedResults[category]).forEach(key => {
          if (!organizationData[category][key]) {
            organizationData[category][key] = [];
          }
          organizationData[category][key].push(...organizedResults[category][key]);
        });
      });

      // Process each match to add required fields
      const extractedSymptoms = matches.map((match: any) => ({
        patient_id: patientId,
        note_id: noteId,
        dos_date: dosDate,
        symptom_id: match.symptom_id,
        symptom_segment: match.symptom_segment,
        symp_prob: match.symp_prob,
        diagnostic_category: match.category,
        diagnosis: match.diagnosis,
        diagnosis_code: match.diagnosisCode,
        confidence: match.confidence,
        match_type: match.match_type,
        section_type: match.section_type,
        negated: match.negated,
        // Include extraction metadata
        extraction_version: VERSION_ID,
        extraction_method: EXTRACTION_METHOD,
        extraction_timestamp: new Date().toISOString()
      }));

      // Add to results
      allExtractedSymptoms.push(...extractedSymptoms);
    } catch (error) {
      console.error(`Error processing note ${noteId} for patient ${patientId}:`, error);
      // Continue with other notes
    }
  }

  // Return extracted symptoms with optional organization data
  return {
    extractedSymptoms: allExtractedSymptoms,
    organizationData: config.debug ? organizationData : undefined,
    version: VERSION_ID,
    totalExtracted: allExtractedSymptoms.length
  };
}

/**
 * Generate a report of extraction results
 * 
 * @param results - Extraction results with organization data
 * @returns Formatted report
 */
export function generateExtractionReport(results: any) {
  const { extractedSymptoms, organizationData, version, totalExtracted } = results;
  
  let report = `# Symptom Extraction Report (${version})\n\n`;
  report += `Total symptoms extracted: ${totalExtracted}\n\n`;
  
  if (organizationData) {
    // Add symptom segment breakdown
    report += '## Symptoms by Segment\n\n';
    
    for (const [segment, segmentMatches] of Object.entries(organizationData.bySymptomSegment)) {
      const matches = segmentMatches as any[];
      report += `- "${segment}" (${matches.length} matches)\n`;
      if (matches.length > 0) {
        report += `  - Match types: ${[...new Set(matches.map(m => m.match_type))].join(', ')}\n`;
        report += `  - Confidence: ${matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length}\n`;
      }
    }
    
    // Add diagnosis breakdown
    report += '\n## Symptoms by Diagnosis\n\n';
    
    for (const [diagnosis, diagnosisMatches] of Object.entries(organizationData.byDiagnosis)) {
      const matches = diagnosisMatches as any[];
      report += `- ${diagnosis}: ${matches.length} matches\n`;
      if (matches.length > 0) {
        const segments = [...new Set(matches.map(m => m.symptom_segment))];
        report += `  - Symptoms: ${segments.slice(0, 3).join(', ')}${segments.length > 3 ? ` and ${segments.length - 3} more` : ''}\n`;
      }
    }
    
    // Add category breakdown
    report += '\n## Symptoms by Diagnostic Category\n\n';
    
    for (const [category, categoryMatches] of Object.entries(organizationData.byCategory)) {
      const matches = categoryMatches as any[];
      report += `- ${category}: ${matches.length} matches\n`;
      if (matches.length > 0) {
        const diagnoses = [...new Set(matches.map(m => m.diagnosis))];
        report += `  - Diagnoses: ${diagnoses.slice(0, 3).join(', ')}${diagnoses.length > 3 ? ` and ${diagnoses.length - 3} more` : ''}\n`;
      }
    }
  }
  
  return report;
}

/**
 * Save extraction results to database
 * 
 * @param extractionResults - Results from extractSymptoms function
 * @returns Success status
 */
export async function saveExtractionResults(extractionResults: any) {
  const { extractedSymptoms } = extractionResults;
  
  try {
    // Create batches for more efficient insertion
    const BATCH_SIZE = 100;
    let savedCount = 0;
    
    for (let i = 0; i < extractedSymptoms.length; i += BATCH_SIZE) {
      const batch = extractedSymptoms.slice(i, i + BATCH_SIZE);
      await storage.saveExtractedSymptoms(batch);
      savedCount += batch.length;
    }
    
    return {
      success: true,
      savedCount,
      totalCount: extractedSymptoms.length
    };
  } catch (error) {
    console.error('Error saving extraction results:', error);
    return {
      success: false,
      error: error.message || 'Unknown error saving results',
      savedCount: 0,
      totalCount: extractedSymptoms.length
    };
  }
}

/**
 * Version control information for the symptom extractor
 */
export const VERSION_INFO = {
  version: VERSION_ID,
  name: 'Context-Aware Symptom Extractor',
  description: 'Advanced symptom extraction with comprehensive organization and improved context awareness',
  releaseDate: '2025-05-19',
  features: [
    'Context-aware matching recognizes symptoms following phrases like "patient reports"',
    'Organization by symptom segment, diagnosis, diagnostic category, and ICD-10 code',
    'Preserves duplicate matches for symptom intensity measurement',
    'Enhanced negation detection with reporting phrase overrides',
    'Works with structured and unstructured clinical notes'
  ],
  parameters: {
    preserveDuplicates: 'Boolean to maintain multiple instances of the same symptom (default: true)',
    debug: 'Boolean to include detailed debugging and organization information (default: false)',
    useWordBoundaries: 'Boolean to require symptoms to appear as distinct words (default: true)',
    considerNegation: 'Boolean to enable detection of negated symptoms (default: true)'
  }
};