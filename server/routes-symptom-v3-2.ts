/**
 * V3.2 Symptom Matcher API Routes
 * 
 * Provides API endpoints for the enhanced symptom matcher with comprehensive
 * organization and improved context awareness.
 * 
 * Version: 3.2.0
 * Date: May 19, 2025
 */

import { Router } from 'express';
import { storage } from './storage';
import { 
  extractSymptoms, 
  generateExtractionReport, 
  saveExtractionResults,
  VERSION_INFO
} from './utils/symptomExtractorV3_2';

// The original symptom extractor for comparison
import { extractSymptoms as extractSymptomsOriginal } from './utils/symptomExtractor';

/**
 * Integrate V3.2 symptom matcher routes with the main application
 * @param app Express application
 */
export function integrateV32SymptomMatcher(app: any) {
  const router = Router();

  // Get version information
  router.get('/version', (req, res) => {
    res.json(VERSION_INFO);
  });

  // Extract symptoms from clinical notes for one or more patients
  router.post('/extract', async (req, res) => {
    try {
      const { patientIds, options } = req.body;
      
      if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
        return res.status(400).json({ 
          error: 'Patient IDs are required as an array' 
        });
      }
      
      // Process options
      const extractionOptions = {
        preserveDuplicates: options?.preserveDuplicates !== false,
        debug: options?.debug === true,
        useWordBoundaries: options?.useWordBoundaries !== false,
        considerNegation: options?.considerNegation !== false,
      };
      
      // Get symptoms master data
      const symptomMaster = await storage.getSymptomMaster();
      
      // Get existing extracted symptoms for these patients (if any)
      let existingSymptoms = [];
      for (const patientId of patientIds) {
        const symptoms = await storage.getExtractedSymptomsByPatientId(patientId);
        if (symptoms && symptoms.length > 0) {
          existingSymptoms = [...existingSymptoms, ...symptoms];
        }
      }
      
      // Get notes for all specified patients
      const allPatientNotes = [];
      for (const patientId of patientIds) {
        const notes = await storage.getNotesByPatientId(patientId);
        if (notes && notes.length > 0) {
          allPatientNotes.push(...notes);
        }
      }
      
      if (allPatientNotes.length === 0) {
        return res.status(404).json({
          message: 'No clinical notes found for the specified patients'
        });
      }
      
      // Extract symptoms using V3.2 algorithm
      const extractionResults = await extractSymptoms(
        allPatientNotes,
        symptomMaster,
        extractionOptions
      );
      
      // Save extracted symptoms to database using correct schema
      let savedSymptoms = [];
      if (extractionResults.extractedSymptoms && extractionResults.extractedSymptoms.length > 0) {
        for (const symptom of extractionResults.extractedSymptoms) {
          try {
            const mentionId = `${symptom.patient_id}_${symptom.note_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const savedSymptom = await storage.saveExtractedSymptoms([{
              mention_id: mentionId,
              patient_id: symptom.patient_id,
              dos_date: symptom.date_of_service || new Date().toISOString().split('T')[0],
              symptom_segment: symptom.symptom_text || symptom.text,
              symptom_id: symptom.symptom_id || symptom.id,
              diagnosis: symptom.diagnosis,
              diagnostic_category: symptom.category,
              symptom_present: "Yes",
              symptom_detected: "Yes",
              validated: "Yes",
              symptom_segments_in_note: 1,
              position_in_text: symptom.position_start || 0,
              user_id: userId
            }]);
            savedSymptoms.push(savedSymptom);
          } catch (error) {
            console.error('Error saving symptom:', error);
          }
        }
      }
      
      // Generate a formatted report if debug is enabled
      let report = null;
      if (extractionOptions.debug) {
        report = generateExtractionReport(extractionResults);
      }
      
      // Return the results
      res.json({
        version: VERSION_INFO.version,
        patientCount: patientIds.length,
        noteCount: allPatientNotes.length,
        existingSymptomCount: existingSymptoms.length,
        extractedSymptomCount: extractionResults.extractedSymptoms.length,
        savedSymptomCount: savedSymptoms.length,
        preservesDuplicates: extractionOptions.preserveDuplicates,
        report,
        extractedSymptoms: extractionResults.extractedSymptoms,
      });
    } catch (error) {
      console.error('Error in V3.2 symptom extraction:', error);
      res.status(500).json({ 
        error: 'Error processing symptom extraction',
        message: error.message
      });
    }
  });
  
  // Compare extraction between original and V3.2 algorithms
  router.post('/compare', async (req, res) => {
    try {
      const { patientIds, note } = req.body;
      
      // Get symptom master data
      const symptomMaster = await storage.getSymptomMaster();
      
      // Determine source of notes
      let notesToProcess = [];
      
      if (note) {
        // Use provided note text directly
        notesToProcess = [{
          patient_id: 'sample',
          note_id: `sample_${Date.now()}`,
          note_text: note,
          dos_date: new Date().toISOString().slice(0, 10)
        }];
      } else if (patientIds && Array.isArray(patientIds) && patientIds.length > 0) {
        // Get notes for specified patients
        for (const patientId of patientIds) {
          const notes = await storage.getNotesByPatientId(patientId);
          if (notes && notes.length > 0) {
            notesToProcess.push(...notes);
          }
        }
      } else {
        return res.status(400).json({
          error: 'Either patientIds or a sample note is required'
        });
      }
      
      if (notesToProcess.length === 0) {
        return res.status(404).json({
          message: 'No clinical notes found for comparison'
        });
      }
      
      // Process with both algorithms
      const originalResults = await extractSymptomsOriginal(notesToProcess, symptomMaster);
      
      const v32Results = await extractSymptoms(
        notesToProcess,
        symptomMaster,
        { debug: true, preserveDuplicates: true }
      );
      
      // Calculate comparison metrics
      const originalCount = originalResults.length;
      const v32Count = v32Results.extractedSymptoms.length;
      
      // Get symptoms found by each algorithm
      const originalSymptoms = new Set(originalResults.map(s => `${s.patient_id}-${s.symptom_segment}`));
      const v32Symptoms = new Set(v32Results.extractedSymptoms.map(s => `${s.patient_id}-${s.symptom_segment}`));
      
      // Find unique and shared symptoms
      const uniqueToOriginal = [...originalSymptoms].filter(s => !v32Symptoms.has(s));
      const uniqueToV32 = [...v32Symptoms].filter(s => !originalSymptoms.has(s));
      const sharedSymptoms = [...originalSymptoms].filter(s => v32Symptoms.has(s));
      
      // Generate comparison report
      const comparisonReport = {
        noteCount: notesToProcess.length,
        originalAlgorithm: {
          version: 'v3.0',
          extractedCount: originalCount,
          uniqueCount: uniqueToOriginal.length,
        },
        v32Algorithm: {
          version: 'v3.2',
          extractedCount: v32Count,
          uniqueCount: uniqueToV32.length,
          organizationSummary: v32Results.organizationData ? {
            bySymptomSegment: Object.keys(v32Results.organizationData.bySymptomSegment).length,
            byDiagnosis: Object.keys(v32Results.organizationData.byDiagnosis).length,
            byCategory: Object.keys(v32Results.organizationData.byCategory).length,
            byDiagnosisCode: Object.keys(v32Results.organizationData.byDiagnosisCode).length
          } : undefined
        },
        sharedCount: sharedSymptoms.length,
        improvement: v32Count - originalCount,
        improvementPercentage: originalCount > 0 ? 
          ((v32Count - originalCount) / originalCount) * 100 : 0,
        precision: sharedSymptoms.length / v32Symptoms.size, // % of V3.2 matches that original found
        recall: sharedSymptoms.length / originalSymptoms.size, // % of original matches that V3.2 found
      };
      
      // Preview of first note
      const notePreviews = notesToProcess.slice(0, 1).map(note => ({
        patient_id: note.patient_id,
        length: note.note_text.length,
        preview: note.note_text.substring(0, 200) + '...'
      }));
      
      res.json({
        comparison: comparisonReport,
        notePreviews,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in symptom algorithm comparison:', error);
      res.status(500).json({
        error: 'Error comparing symptom algorithms',
        message: error.message
      });
    }
  });
  
  // Register routes
  app.use('/api/v3.2/symptoms', router);
}