import { AhoCorasick } from './ahoCorasick';
import { InsertExtractedSymptom, SymptomMaster } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { extractedSymptoms } from '@shared/schema';
import { storage } from '../storage';

// Type for notes to process
type Note = {
  id: number;
  patientId: string; // Note: This is camelCase in note object but snake_case in DB
  dosDate: string;   // Note: This is camelCase in note object but snake_case in DB
  noteText: string;
  providerId: string | null;
};

// Progress callback type
type ProgressCallback = (progress: number, message: string) => void;

/**
 * Extract symptoms using Aho-Corasick algorithm with improved memory management
 * and incremental database storage to prevent stalling at 45%.
 * @param boostMode When true, uses more aggressive optimization settings
 */
export async function extractSymptomsOptimized(
  notes: Note[],
  symptoms: SymptomMaster[],
  userId: number | null = null,
  progressCallback?: ProgressCallback,
  boostMode: boolean = false
): Promise<InsertExtractedSymptom[]> {
  console.log(`Starting optimized symptom extraction on ${notes.length} notes with ${symptoms.length} symptom patterns${boostMode ? ' (BOOST MODE)' : ''}`);
  const startTime = Date.now();
  
  // Use optimal batch size of ~400 as identified by user
  const BATCH_SIZE = 400;
  
  // Initialize the Aho-Corasick automaton
  const automaton = new AhoCorasick();
  
  // Preprocessing progress updates
  if (progressCallback) {
    progressCallback(0.05, `Building optimized search index for ${symptoms.length} symptom patterns...`);
  }
  
  // Add all symptom patterns to the automaton for exact matching
  for (const symptom of symptoms) {
    if (symptom.symptom_segment) {
      // Use exact pattern matching - no case conversion for reliability
      automaton.addPattern(symptom.symptom_segment, symptom);
    }
  }
  
  // Build the automaton (preprocessing step)
  console.log(`Building Aho-Corasick automaton for ${symptoms.length} patterns...`);
  automaton.build();
  console.log('Automaton built successfully.');
  
  if (progressCallback) {
    progressCallback(0.1, `Optimized search index built. Processing ${notes.length} notes...`);
  }
  
  // Collection to hold all extracted symptoms
  let allExtractedSymptoms: InsertExtractedSymptom[] = [];
  
  // Medical notes should extract multiple symptoms per note
  // Allow proper symptom counting without excessive deduplication
  
  // Process notes in smaller batches to manage memory
  let totalProcessedNotes = 0;
  let batchCounter = 0;
  let totalMatches = 0;
  
  // Keep track of symptoms saved to database for this run
  const savedSymptomIds = new Set<string>();
  
  // Process notes in batches (400 works best per user specification)
  const OPTIMAL_BATCH_SIZE = 400;
  
  for (let batchStart = 0; batchStart < notes.length; batchStart += OPTIMAL_BATCH_SIZE) {
    batchCounter++;
    const batch = notes.slice(batchStart, Math.min(batchStart + OPTIMAL_BATCH_SIZE, notes.length));
    let batchMatches = 0;
    let batchExtractedSymptoms: InsertExtractedSymptom[] = [];
    
    console.log(`Processing batch ${batchCounter} (${batch.length} notes, ${batchStart+1}-${batchStart+batch.length} of ${notes.length})...`);
    
    // Process each note in the batch
    for (const note of batch) {
      if (!note || !note.noteText) {
        console.log(`Skipping note with ID ${note?.id} due to missing text`);
        continue;
      }
      
      // Track symptoms already found in this note to avoid same-symptom-same-position duplicates
      const noteSymptoms = new Set<string>();
      
      // Find all matches in this note text using Aho-Corasick (single pass)
      const matches = automaton.search(note.noteText);
      
      // AUTHORIZED ALGORITHM: If symptom/problem appears in note more than once 
      // at different positions, each occurrence should be counted and added to database
      for (const match of matches) {
        const symptom = match.data;
        if (!symptom) continue;
        
        // Create position-based key as specified in original algorithm
        const symptomKey = symptom.symptom_segment?.toLowerCase() || '';
        const positionKey = `${symptomKey}-${match.position}`;
        
        // Only skip if we've already recorded this specific mention at this exact position
        if (noteSymptoms.has(positionKey)) {
          continue;
        }
        
        // Mark this specific mention as found
        noteSymptoms.add(positionKey);
        batchMatches++;
        
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
        const extractedSymptom: InsertExtractedSymptom = {
          id: Math.floor(Math.random() * 1000000), // Temporary ID for frontend
          mention_id: uuidv4(), // Generate a unique ID for this mention
          patient_id: note.patientId,
          dos_date: note.dosDate,
          symptom_segment: symptom.symptom_segment,
          symptom_id: symptom.symptom_id, 
          diagnosis: symptom.diagnosis,
          diagnostic_category: symptom.diagnostic_category,
          symp_prob: symptom.symp_prob || "Symptom",
          zcode_hrsn: symptom.symp_prob === "Problem" ? "ZCode/HRSN" : "No",
          symptom_present: "Yes",
          symptom_detected: "Yes",
          validated: "Yes",
          symptom_segments_in_note: 1,
          position_in_text: match.position,
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
        };
        
        batchExtractedSymptoms.push(extractedSymptom);
      }
    }
    
    console.log(`Found ${batchMatches} matches in batch ${batchCounter}, resulting in ${batchExtractedSymptoms.length} extracted symptoms (position-based intensity tracking enabled)`);
    
    // Add batch results to the collection, with additional memory management
    if (batchExtractedSymptoms.length > 0) {
      totalMatches += batchMatches;
      
      // Save batch to database immediately to reduce memory pressure
      try {
        await saveExtractedSymptomsToDb(batchExtractedSymptoms, savedSymptomIds);
        console.log(`Saved ${batchExtractedSymptoms.length} symptoms from batch ${batchCounter} to database`);
        
        // Only retain unique symptoms in memory that weren't previously saved
        const uniqueBatchSymptoms = batchExtractedSymptoms.filter(s => !savedSymptomIds.has(s.mention_id));
        console.log(`Keeping ${uniqueBatchSymptoms.length} unique new symptoms in memory`);
        
        // Add to main collection
        allExtractedSymptoms = allExtractedSymptoms.concat(uniqueBatchSymptoms);
      } catch (error) {
        console.error('Error saving batch to database:', error);
        // Still keep the symptoms in memory if saving fails
        allExtractedSymptoms = allExtractedSymptoms.concat(batchExtractedSymptoms);
      }
    }
    
    // Update processed count
    totalProcessedNotes += batch.length;
    
    // Report progress
    if (progressCallback) {
      const progress = Math.min(0.9, 0.1 + (totalProcessedNotes / notes.length) * 0.8);
      progressCallback(
        progress,
        `Processed ${totalProcessedNotes}/${notes.length} notes, found ${totalMatches} symptom matches so far`
      );
    }
    
    // Save progress checkpoint to database
    const progressPercent = Math.min(90, Math.round((totalProcessedNotes / notes.length) * 100));
    
    // Update status with batch tracking info
    if (userId) {
      try {
        // Update processing status with more detailed information
        await storage.updateProcessingStatusByType('extract_symptoms', userId, {
          status: 'in_progress',
          progress: progressPercent,
          message: `Processed ${totalProcessedNotes}/${notes.length} notes (${progressPercent}%)`,
          currentStage: `batch_${batchCounter}`,
          processedItems: totalProcessedNotes,
          totalItems: notes.length,
          lastUpdateTime: new Date()
        });
        
        console.log(`✅ Saved checkpoint at batch ${batchCounter}: ${progressPercent}% complete`);
      } catch (err) {
        console.log(`⚠️ Failed to save progress checkpoint: ${err}`);
      }
    }
    
    // Brief pause to allow event loop to process other tasks
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  // Finish progress
  if (progressCallback) {
    progressCallback(0.95, `Completing analysis, found ${totalMatches} total matches across ${notes.length} notes`);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`Extraction complete in ${duration.toFixed(2)}s. Found ${totalMatches} symptom matches, extracted ${allExtractedSymptoms.length} unique symptoms.`);
  
  return allExtractedSymptoms;
}

/**
 * Save extracted symptoms to database, tracking which ones were saved
 * to avoid duplicate inserts and manage memory more efficiently
 */
async function saveExtractedSymptomsToDb(
  symptoms: InsertExtractedSymptom[],
  savedIds: Set<string>
): Promise<void> {
  if (symptoms.length === 0) return;
  
  try {
    // Optimize database batch size for enterprise processing
    const DB_BATCH_SIZE = 100;
    
    for (let i = 0; i < symptoms.length; i += DB_BATCH_SIZE) {
      const batch = symptoms.slice(i, i + DB_BATCH_SIZE);
      
      // Record which ones we're saving to prevent duplicates
      batch.forEach(s => savedIds.add(s.mention_id));
      
      // Save to database with conflict resolution
      await db.insert(extractedSymptoms).values(batch).onConflictDoNothing();
    }
  } catch (error) {
    console.error('Error saving symptoms to database:', error);
    throw error;
  }
}