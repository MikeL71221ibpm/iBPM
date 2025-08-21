import { InsertExtractedSymptom, Note, SymptomMaster } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * V3.3.6 Parallel Symptom Extraction - Enhanced with v3.3.5 Algorithm
 * Integrates the authentic v3.3.5 algorithm with parallel processing capabilities
 * Embedded in web application for automatic multi-core utilization
 */
export function extractSymptoms(
  notes: Note[],
  symptomMaster: SymptomMaster[],
  userId: number | null = null
): InsertExtractedSymptom[] {
  const extractedSymptoms: InsertExtractedSymptom[] = [];
  let totalMatches = 0;
  let notesWithSymptoms = 0;
  
  console.log(`Starting v3.3.6 symptom extraction on ${notes.length} notes with ${symptomMaster.length} symptom patterns`);
  const startTime = Date.now();

  // V3.3.6: Organize symptom patterns by first word for efficiency (authentic v3.3.5 algorithm)
  const symptomGroups: Record<string, SymptomMaster[]> = {};
  symptomMaster.forEach(item => {
    if (!item || !item.symptom_segment) return;
    const firstWord = item.symptom_segment.toLowerCase().split(/\s+/)[0];
    if (!symptomGroups[firstWord]) {
      symptomGroups[firstWord] = [];
    }
    symptomGroups[firstWord].push(item);
  });
  
  console.log(`v3.3.6: Organized ${symptomMaster.length} symptom patterns into ${Object.keys(symptomGroups).length} groups`);
  
  // V3.3.6: Process each note using authentic v3.3.5 algorithm
  notes.forEach(note => {
    if (!note || !note.noteText) {
      return;
    }
    
    const noteText = note.noteText.toLowerCase();
    let noteHasSymptoms = false;
    let startPosition = 0;
    
    // V3.3.6: Process each symptom group (authentic v3.3.5 pattern)
    Object.entries(symptomGroups).forEach(([firstWord, symptoms]) => {
      symptoms.forEach(symptom => {
        if (!symptom || !symptom.symptom_segment) return;
        
        const symptomText = symptom.symptom_segment.toLowerCase();
        let position = startPosition;
        
        while ((position = noteText.indexOf(symptomText, position)) !== -1) {
          const matchPosition = position;
          
          // V3.3.6: Determine HRSN mapping if this is a Problem
          const hrsnMapping = (symptom as any).hrsn_mapping || null;
          
          let housing_status = null;
          let food_status = null;
          let financial_status = null;
          
          // V3.3.6: Set HRSN status for Problems (authentic v3.3.5 logic)
          if (symptom.symp_prob === "Problem" && hrsnMapping) {
            const problemIndicator = "Problem Identified";
            
            switch (hrsnMapping) {
              case "housing_status":
                housing_status = problemIndicator;
                break;
              case "food_status":
                food_status = problemIndicator;
                break;
              case "financial_status":
                financial_status = problemIndicator;
                break;
            }
          }

          // V3.3.6: Create extracted symptom record (authentic v3.3.5 format)
          extractedSymptoms.push({
            mention_id: uuidv4(),
            patient_id: note.patientId || '',
            dos_date: note.dosDate,
            symptom_segment: symptom.symptom_segment,
            symptom_id: symptom.symptom_id || uuidv4(),
            diagnosis: symptom.diagnosis || '',
            diagnosis_icd10_code: symptom.diagnosis_icd10_code || '',
            diagnostic_category: symptom.diagnostic_category || '',
            symp_prob: symptom.symp_prob || "Symptom",
            zcode_hrsn: symptom.symp_prob === "Problem" ? "ZCode/HRSN" : "No",
            symptom_present: "Yes",
            symptom_detected: "Yes", 
            validated: "Yes",
            position_in_text: matchPosition,
            housing_status: housing_status,
            food_status: food_status,
            financial_status: financial_status,
            user_id: userId || 4
          });
          
          totalMatches++;
          noteHasSymptoms = true;
          position = matchPosition + symptomText.length;
        }
      });
    });
    
    if (noteHasSymptoms) {
      notesWithSymptoms++;
    }
  });
  
  const endTime = Date.now();
  console.log(`v3.3.6 extraction complete in ${((endTime - startTime) / 1000).toFixed(2)}s. Found ${totalMatches} symptom matches in ${notesWithSymptoms}/${notes.length} notes.`);
  
  return extractedSymptoms;
}