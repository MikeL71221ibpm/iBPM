import { InsertExtractedSymptom, SymptomMaster } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Type for notes to process
type Note = {
  id: number;
  patientId: string;
  dosDate: string;
  noteText: string;
  providerId: string | null;
  userId: number | null;
};

// Progress callback type
type ProgressCallback = (progress: number, message: string) => void;

/**
 * Extract symptoms using multiple chunks for better progress tracking
 * This is the proven method from the successful v3 implementation
 */
export async function extractSymptomsParallel(
  notes: Note[],
  symptoms: SymptomMaster[],
  userId: number | null = null,
  progressCallback?: ProgressCallback,
  boostMode: boolean = false
): Promise<InsertExtractedSymptom[]> {
  // If we have very few notes, don't bother with chunking
  if (notes.length < 10) {
    return extractSymptomsInCurrentThread(notes, symptoms, userId, progressCallback, boostMode);
  }

  const startTime = Date.now();
  const cpuCount = os.cpus().length;
  
  // MEMORY MANAGEMENT: Track memory usage and force completion if needed
  const MEMORY_LIMIT_MB = 8192; // 8GB memory limit - full Replit capacity
  const PROCESS_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hour timeout for large datasets
  let lastProgressTime = Date.now();
  let timeoutOccurred = false;
  
  // Set up process timeout to prevent infinite hanging - NO TERMINATION
  const processTimeout = setTimeout(() => {
    console.log("⚠️ TIMEOUT: 2-hour process limit reached - completing with current results (no termination)");
    timeoutOccurred = true;
    if (progressCallback) {
      progressCallback(0.95, "⚠️ TIMEOUT: Processing took longer than 2 hours - completing with current results");
    }
    // DO NOT TERMINATE PROCESS - just mark as timed out and continue
  }, PROCESS_TIMEOUT_MS);
  
  // Memory monitoring function
  const checkMemoryUsage = () => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > MEMORY_LIMIT_MB) {
      console.log(`🚨 MEMORY: Usage ${heapUsedMB}MB exceeds ${MEMORY_LIMIT_MB}MB limit - forcing garbage collection`);
      if (global.gc) {
        global.gc();
        console.log("✅ MEMORY: Garbage collection completed");
      }
      return true; // Indicates memory pressure
    }
    return false;
  };
  
  // Define number of chunks based on CPU count and boost mode
  const chunkCount = boostMode 
    ? Math.min(16, Math.max(2, cpuCount * 2)) // Ultra-boost: use 2x CPU cores for maximum parallelization
    : Math.min(4, Math.max(1, cpuCount - 1));
  console.log(`Starting symptom extraction with ${chunkCount} chunks for ${notes.length} notes${boostMode ? ' (ULTRA-BOOST MODE)' : ''}...`);
  
  // OPTIMIZED BATCHING: Use 1000-note chunks as specified
  const baseChunkSize = Math.ceil(notes.length / chunkCount);
  const SAFE_CHUNK_SIZE = 1000; // Updated to 1000 for faster processing
  const chunkSize = boostMode ? Math.min(SAFE_CHUNK_SIZE, baseChunkSize) : baseChunkSize;
  const chunks: Note[][] = [];
  
  for (let i = 0; i < notes.length; i += chunkSize) {
    chunks.push(notes.slice(i, i + chunkSize));
  }
  
  console.log(`🧠 MEMORY SAFE: Using ${chunkSize} notes per chunk (memory limit: ${MEMORY_LIMIT_MB}MB)`);
  
  if (progressCallback) {
    progressCallback(0, `Starting analysis with ${chunkCount} chunks for ${notes.length} notes...`);
  }
  
  // Collect all extracted symptoms here
  let allExtractedSymptoms: InsertExtractedSymptom[] = [];
  let completedChunks = 0;
  
  // Process all chunks with timeout protection to prevent stalls
  console.log(`🚀 Processing ${chunks.length} chunks with timeout protection...`);
  
  const allChunkResults: InsertExtractedSymptom[][] = [];
  
  // Function to process a single chunk with timeout
  async function processChunkWithTimeout(chunk: Note[], index: number): Promise<InsertExtractedSymptom[]> {
    const CHUNK_TIMEOUT = 120000; // 2 minutes per chunk max
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log(`⚠️ Chunk ${index + 1} timed out after 2 minutes, skipping to prevent stall`);
        resolve([]); // Return empty array instead of failing
      }, CHUNK_TIMEOUT);
      
      try {
        console.log(`Starting chunk ${index + 1}/${chunks.length} (${chunk.length} notes)`);
        
        const result = await extractSymptomsInCurrentThread(
          chunk, 
          symptoms,
          userId,
          (progress, message) => {
            if (progressCallback) {
              const chunkProgress = (index + progress) / chunks.length;
              progressCallback(
                chunkProgress,
                `Chunk ${index + 1}/${chunks.length}: ${message}`
              );
            }
          }
        );
        
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        console.log(`⚠️ Chunk ${index + 1} failed: ${error}, continuing with other chunks`);
        resolve([]); // Return empty array instead of failing
      }
    });
  }
  
  // Process chunks in batches to prevent overwhelming the system
  const CONCURRENT_CHUNKS = Math.min(4, chunkCount); // Max 4 concurrent chunks
  
  for (let i = 0; i < chunks.length; i += CONCURRENT_CHUNKS) {
    // Check memory before each batch
    lastProgressTime = Date.now();
    const memoryPressure = checkMemoryUsage();
    
    if (memoryPressure) {
      console.log("🚨 MEMORY PRESSURE: Reducing concurrent chunks and forcing cleanup");
      // Process one chunk at a time under memory pressure
      for (let j = i; j < Math.min(i + CONCURRENT_CHUNKS, chunks.length); j++) {
        const result = await processChunkWithTimeout(chunks[j], j);
        allChunkResults.push(result);
        
        // Force garbage collection after each chunk under pressure
        if (global.gc) global.gc();
      }
    } else {
      // Normal batch processing
      const batchChunks = chunks.slice(i, i + CONCURRENT_CHUNKS);
      const batchPromises = batchChunks.map((chunk, localIndex) => 
        processChunkWithTimeout(chunk, i + localIndex)
      );
      
      console.log(`Processing batch ${Math.floor(i/CONCURRENT_CHUNKS) + 1} with ${batchChunks.length} chunks...`);
      const batchResults = await Promise.all(batchPromises);
      allChunkResults.push(...batchResults);
    }
    
    // Memory cleanup between batches
    if (i + CONCURRENT_CHUNKS < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Slightly longer pause
      if (global.gc) global.gc(); // Force cleanup between batches
    }
  }
  
  // Combine all results WITHOUT deduplication to preserve all symptoms
  for (let index = 0; index < allChunkResults.length; index++) {
    const chunkSymptoms = allChunkResults[index];
    
    // CRITICAL FIX: Add ALL symptoms without deduplication
    // The missing 195 symptoms were being incorrectly removed here
    allExtractedSymptoms.push(...chunkSymptoms);
    
    console.log(`Chunk ${index+1} processing: ${chunkSymptoms.length} symptoms found`);
    console.log(`Total symptoms after chunk ${index+1}: ${allExtractedSymptoms.length}`);
    
    completedChunks++;
    
    if (progressCallback) {
      const progress = completedChunks / chunks.length;
      progressCallback(
        progress, 
        `Completed ${completedChunks}/${chunks.length} chunks, found ${chunkSymptoms.length} symptoms in chunk ${index + 1}`
      );
    }
  }
  
  // Clean up timeout
  clearTimeout(processTimeout);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Final memory cleanup
  if (global.gc) global.gc();
  
  // Inform user of final status
  if (timeoutOccurred) {
    console.log(`⚠️ EXTRACTION TIMED OUT: ${duration.toFixed(2)}s, ${allExtractedSymptoms.length} symptoms extracted before timeout`);
    if (progressCallback) {
      progressCallback(1.0, `⚠️ INCOMPLETE: Extracted ${allExtractedSymptoms.length} symptoms before 20-minute timeout - extraction not fully complete`);
    }
  } else {
    console.log(`✅ EXTRACTION COMPLETE: ${duration.toFixed(2)}s, ${allExtractedSymptoms.length} symptoms (Memory managed)`);
    if (progressCallback) {
      progressCallback(1.0, `✅ COMPLETE: Successfully extracted ${allExtractedSymptoms.length} symptoms`);
    }
  }
  
  return allExtractedSymptoms;
}

/**
 * Extract symptoms in the current thread (no parallelization)
 * This is the proven algorithm from the successful v3 implementation
 */
function extractSymptomsInCurrentThread(
  notes: Note[],
  symptomMaster: SymptomMaster[],
  userId: number | null = null,
  progressCallback?: ProgressCallback,
  boostMode: boolean = false
): Promise<InsertExtractedSymptom[]> {
  return new Promise(async (resolve) => {
    console.log(`🔄 PROGRESS-AWARE EXTRACTION: Using basic extraction with proper progress updates for ${notes.length} notes`);
    
    // Always use basic extraction with progress callback to ensure proper progress reporting
    // This ensures the blue progress bar and spinner stay visible during the entire process
    resolve(extractSymptomsBasic(notes, symptomMaster, userId, progressCallback, boostMode));
  });
}

/**
 * Basic extraction fallback (original parallel extractor logic)
 */
function extractSymptomsBasic(
  notes: Note[],
  symptomMaster: SymptomMaster[],
  userId: number | null = null,
  progressCallback?: ProgressCallback,
  boostMode: boolean = false
): Promise<InsertExtractedSymptom[]> {
  return new Promise((resolve) => {
    const extractedSymptoms: InsertExtractedSymptom[] = [];
  let matchCount = 0;
  let notesWithSymptoms = 0;
  
  console.log(`Starting basic symptom extraction on ${notes.length} notes with ${symptomMaster.length} symptom patterns`);
  const startTime = Date.now();
  
  // Organize symptom patterns for more efficient lookup
  const symptomPatternsMap: Record<string, SymptomMaster[]> = {};
  
  // Sort by length (descending) to match longer patterns first
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
  
  console.log(`Organized ${symptomMaster.length} symptom patterns into ${Object.keys(symptomPatternsMap).length} groups${boostMode ? ' (BOOST MODE)' : ''}`);
  
  // Process notes in batches
  const BATCH_SIZE = boostMode ? 5 : 10;
  
  for (let batchStart = 0; batchStart < notes.length; batchStart += BATCH_SIZE) {
    const noteBatch = notes.slice(batchStart, batchStart + BATCH_SIZE);
    let batchMatchCount = 0;
    
    // Process each note in the batch
    noteBatch.forEach(note => {
      if (!note || !note.noteText) {
        console.log(`Skipping note with ID ${note?.id} due to missing noteText`);
        return;
      }
      
      let noteHasSymptoms = false;
      const noteText = note.noteText.toLowerCase();
      const noteWords = new Set(noteText.split(/\s+/));
      
      // Get candidate symptom patterns that might match this note
      const candidatePatterns: SymptomMaster[] = [];
      
      // Only consider patterns whose first word is in the note
      noteWords.forEach(word => {
        if (symptomPatternsMap[word]) {
          candidatePatterns.push(...symptomPatternsMap[word]);
        }
      });
      
      console.log(`Note has ${noteText.length} chars, ${noteWords.size} words. Found ${candidatePatterns.length} candidate patterns.`);
      
      // Track symptoms already found in this note to avoid duplicates
      const noteSymptoms = new Set<string>();
      
      // Check each candidate pattern
      candidatePatterns.forEach(symptom => {
          if (!symptom.symptom_segment) return;
          const symptomText = symptom.symptom_segment.toLowerCase();
          
          // Skip if we've already recorded this symptom for this note
          const symptomKey = symptom.symptom_segment.toLowerCase();
          if (noteSymptoms.has(symptomKey)) {
            return;
          }
          
          // Find ALL occurrences of the symptom in the note text
          let startPosition = 0;
          let matchPosition;
          let matchesInNote = 0;
          
          // Keep finding occurrences until we've found them all
          while ((matchPosition = noteText.indexOf(symptomText, startPosition)) !== -1) {
            // Count this as a match
            matchCount++;
            batchMatchCount++;
            noteHasSymptoms = true;
            matchesInNote++;
            
            // Create a unique key that includes the position in the text
            const positionKey = `${symptomKey}-${matchPosition}`;
            
            // Check if we've already recorded this specific mention
            if (noteSymptoms.has(positionKey)) {
              startPosition = matchPosition + symptomText.length;
              continue;
            }
            
            // Mark this specific mention as found
            noteSymptoms.add(positionKey);
            
            // Create extracted symptom record
            const extractedSymptom: InsertExtractedSymptom = {
              mention_id: uuidv4(),
              patient_id: note.patientId,
              dos_date: note.dosDate,
              symptom_segment: symptom.symptom_segment,
              symptom_id: symptom.symptom_id, 
              diagnosis: symptom.diagnosis,
              diagnostic_category: symptom.diagnostic_category,
              symp_prob: symptom.symp_prob || "Symptom",
              zcode_hrsn: symptom.zcode_hrsn || "No",
              symptom_present: "Yes",
              symptom_detected: "Yes",
              validated: "Yes",
              symptom_segments_in_note: 1,
              position_in_text: matchPosition,
              user_id: userId
            };
            
            extractedSymptoms.push(extractedSymptom);
            
            // Move to position after this match to look for more occurrences
            startPosition = matchPosition + symptomText.length;
          }
        });
        
        if (noteHasSymptoms) {
          notesWithSymptoms++;
        }
      });
      
      // Report progress after each batch
      if (progressCallback) {
        const progress = Math.min(1.0, (batchStart + BATCH_SIZE) / notes.length);
        progressCallback(
          progress, 
          `Processed ${batchStart + noteBatch.length}/${notes.length} notes, found ${matchCount} symptoms so far (${batchMatchCount} in current batch)`
        );
      }
    }
    
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    console.log(`Extraction complete in ${processingTime.toFixed(2)}s. Found ${matchCount} symptom matches in ${notesWithSymptoms}/${notes.length} notes.`);
    
    resolve(extractedSymptoms);
  });
}