import { InsertExtractedSymptom, Note, SymptomMaster } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract symptoms from a set of notes using a library of symptom patterns
 * This is used for non-parallel extraction (smaller datasets)
 * Updated to use position tracking for more accurate symptom counts
 */
export function extractSymptoms(
  notes: Note[],
  symptomMaster: SymptomMaster[],
  userId: number | null = null
): InsertExtractedSymptom[] {
  const extractedSymptoms: InsertExtractedSymptom[] = [];
  let matchCount = 0;
  let notesWithSymptoms = 0;
  
  console.log(`Starting symptom extraction on ${notes.length} notes with ${symptomMaster.length} symptom patterns`);
  const startTime = Date.now();

  // First, organize symptom patterns for more efficient lookup
  // Group patterns by their first word to reduce the search space
  const symptomPatternsMap: Record<string, SymptomMaster[]> = {};
  
  // Make a copy of symptom master and sort by length (descending)
  // This ensures we match longer patterns first (e.g. "severe depression" before "depression")
  const sortedSymptoms = [...symptomMaster].sort((a, b) => 
    (b.symptom_segment?.length || 0) - (a.symptom_segment?.length || 0)
  );
  
  // Group symptoms by their first word to quickly filter relevant patterns
  sortedSymptoms.forEach(symptom => {
    if (!symptom || !symptom.symptom_segment) return;
    
    const firstWord = symptom.symptom_segment.toLowerCase().split(' ')[0];
    if (!symptomPatternsMap[firstWord]) {
      symptomPatternsMap[firstWord] = [];
    }
    symptomPatternsMap[firstWord].push(symptom);
  });
  
  console.log(`Organized ${symptomMaster.length} symptom patterns into ${Object.keys(symptomPatternsMap).length} groups`);
  
  // Process each note
  notes.forEach(note => {
    if (!note || !note.noteText) {
      console.log(`Skipping note with ID ${note?.id} due to missing noteText`);
      return; // Skip notes with missing text
    }
    
    let noteHasSymptoms = false;
    const noteText = note.noteText.toLowerCase();
    const noteWords = new Set(noteText.split(/\s+/)); // Split by whitespace
    
    // Get all candidate symptom patterns that might match this note
    // by checking if any of their first words appear in the note
    const candidatePatterns: SymptomMaster[] = [];
    
    // Only consider patterns whose first word is in the note
    noteWords.forEach(word => {
      if (symptomPatternsMap[word]) {
        candidatePatterns.push(...symptomPatternsMap[word]);
      }
    });
    
    // Track symptoms already found in this note to avoid duplicates
    const noteSymptoms = new Set<string>();
    
    // Check each candidate pattern
    candidatePatterns.forEach(symptom => {
      if (!symptom.symptom_segment) return;
      const symptomText = symptom.symptom_segment.toLowerCase();
      
      // Skip if we've already recorded this symptom for this note
      // Use ONLY the symptom text to prevent same-symptom-different-diagnosis duplicates
      const symptomKey = symptom.symptom_segment.toLowerCase();
      if (noteSymptoms.has(symptomKey)) {
        return;
      }
      
      // For more accurate intensity measurement, find ALL occurrences 
      // of the symptom in the note text, not just whether it exists
      let startPosition = 0;
      let matchPosition;
      let matchesInNote = 0;
      
      // Keep finding occurrences until we've found them all
      while ((matchPosition = noteText.indexOf(symptomText, startPosition)) !== -1) {
        // Count this as a match
        matchCount++;
        noteHasSymptoms = true;
        matchesInNote++;
        
        // Create a unique key that includes the position in the text
        // This allows us to count multiple occurrences of the same symptom in different parts of the note
        const positionKey = `${symptomKey}-${matchPosition}`;
        
        // Check if we've already recorded this specific mention
        // This prevents multiple symptom_master entries with the same text from duplicate counting
        if (noteSymptoms.has(positionKey)) {
          // Move to next position
          startPosition = matchPosition + symptomText.length;
          continue;
        }
        
        // Mark this specific mention as found
        noteSymptoms.add(positionKey);
        
        // Determine HRSN status based on flexible hrsn_mapping field
        const hrsnMapping = (symptom as any).hrsn_mapping;
        let housing_status = null;
        let food_status = null;
        let financial_status = null;
        let transportation_needs = null;
        let has_a_car = null;
        let utility_insecurity = null;
        let childcare_needs = null;
        let elder_care_needs = null;
        let employment_status = null;
        let education_needs = null;
        let legal_needs = null;
        let social_isolation = null;
        
        // Set appropriate HRSN status if this is an HRSN problem
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
            case "transportation_needs":
              transportation_needs = problemIndicator;
              break;
            case "has_a_car":
              has_a_car = problemIndicator;
              break;
            case "utility_insecurity":
              utility_insecurity = problemIndicator;
              break;
            case "childcare_needs":
              childcare_needs = problemIndicator;
              break;
            case "elder_care_needs":
              elder_care_needs = problemIndicator;
              break;
            case "employment_status":
              employment_status = problemIndicator;
              break;
            case "education_needs":
              education_needs = problemIndicator;
              break;
            case "legal_needs":
              legal_needs = problemIndicator;
              break;
            case "social_isolation":
              social_isolation = problemIndicator;
              break;
          }
        }

        // Create extracted symptom record
        extractedSymptoms.push({
          mention_id: uuidv4(), // Generate a unique ID for this mention
          patient_id: note.patientId,
          dos_date: note.dosDate,
          symptom_segment: symptom.symptom_segment,
          symptom_id: symptom.symptom_id,
          diagnosis: symptom.diagnosis,
          diagnosis_icd10_code: symptom.diagnosis_icd10_code,
          diagnostic_category: symptom.diagnostic_category,
          symp_prob: symptom.symp_prob || "Symptom",  // Important: This field should be "Problem" or "Symptom" only
          // For HRSN indicators (Problems), store "ZCode/HRSN" in zcode_hrsn
          // For symptoms, zcode_hrsn should be "No"
          zcode_hrsn: symptom.symp_prob === "Problem" ? "ZCode/HRSN" : "No",
          symptom_present: "Yes",
          symptom_detected: "Yes", 
          validated: "Yes",
          symptom_segments_in_note: 1,
          position_in_text: matchPosition, // Store position for deduplication
          housing_status,
          food_status,
          financial_status,
          transportation_needs,
          has_a_car,
          utility_insecurity,
          childcare_needs,
          elder_care_needs,
          employment_status,
          education_needs,
          legal_needs,
          social_isolation,
          user_id: userId
        });
        
        // Move to position after this match to look for more occurrences
        startPosition = matchPosition + symptomText.length;
      }
    });
    
    if (noteHasSymptoms) {
      notesWithSymptoms++;
    }
  });
  
  const endTime = Date.now();
  const processingTime = (endTime - startTime) / 1000;
  console.log(`Extraction complete in ${processingTime.toFixed(2)}s. Found ${matchCount} symptom matches in ${notesWithSymptoms}/${notes.length} notes.`);
  
  return extractedSymptoms;
}