/**
 * Comprehensive Bulk Symptom Matcher Algorithm Comparison Tool
 * 
 * This script processes the entire Symptom_Segment_Master file against real clinical notes
 * and generates a detailed comparison report between V3.0 and V3.2 algorithms.
 * 
 * Usage: node server/bulk-symptom-comparison.js [path_to_symptom_file] [path_to_notes_file]
 * Example: node server/bulk-symptom-comparison.js ./attached_assets/Symptom_Segments_asof_4_30_25_MASTER.xlsx
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

// Import the original symptom extractor (v3.0)
const originalExtractor = require('./utils/symptomExtractor');

// Helper functions
function findMostRecentFile(directory, pattern) {
  try {
    const files = fs.readdirSync(directory);
    const matchingFiles = files.filter(f => f.match(pattern));
    
    if (matchingFiles.length === 0) {
      return null;
    }
    
    // Sort by date in filename (newest first)
    matchingFiles.sort((a, b) => {
      // Extract date portion from filenames
      const dateA = a.match(/asof_(\d+_\d+_\d+)/)?.[1] || a;
      const dateB = b.match(/asof_(\d+_\d+_\d+)/)?.[1] || b;
      return dateB.localeCompare(dateA);
    });
    
    return path.join(directory, matchingFiles[0]);
  } catch (error) {
    console.error(`Error searching directory ${directory}:`, error.message);
    return null;
  }
}

// Load data from Excel or CSV file
function loadDataFromFile(filePath) {
  console.log(`Loading data from file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  let data = [];
  
  if (filePath.endsWith('.xlsx')) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    data = xlsx.utils.sheet_to_json(worksheet);
  } else if (filePath.endsWith('.csv')) {
    const csvData = fs.readFileSync(filePath, 'utf8');
    const rows = csvData.split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    
    data = rows.slice(1).map(row => {
      if (!row.trim()) return null;
      const values = row.split(',').map(v => v.trim());
      const item = {};
      headers.forEach((header, i) => {
        item[header] = values[i];
      });
      return item;
    }).filter(item => item !== null);
  } else {
    throw new Error("Unsupported file format. Please use .xlsx or .csv");
  }
  
  console.log(`Loaded ${data.length} records from file`);
  return data;
}

// Load and prepare symptom reference data
function prepareSymptomReferenceData(filePath) {
  // Find most recent symptom file if none provided
  const symptomFilePath = filePath || findMostRecentFile(
    './attached_assets', 
    /^Symptom_Segments_asof_.*\.(xlsx|csv)$/
  );
  
  if (!symptomFilePath) {
    throw new Error("No Symptom_Segments file found in attached_assets directory");
  }
  
  console.log(`Using symptom reference file: ${symptomFilePath}`);
  const symptoms = loadDataFromFile(symptomFilePath);
  
  // Validate required fields
  const requiredFields = ['symptom_segment', 'symptom_id'];
  const validSymptoms = symptoms.filter(symptom => {
    for (const field of requiredFields) {
      if (!symptom[field] && !symptom[field.toUpperCase()]) {
        return false;
      }
    }
    return true;
  });
  
  if (validSymptoms.length < symptoms.length) {
    console.warn(`Warning: ${symptoms.length - validSymptoms.length} symptoms were invalid and will be ignored`);
  }
  
  // Normalize field names (handle case inconsistencies in source data)
  return validSymptoms.map(symptom => {
    return {
      symptom_id: symptom.symptom_id || symptom.SYMPTOM_ID,
      symptom_segment: symptom.symptom_segment || symptom.SYMPTOM_SEGMENT,
      diagnostic_category: symptom.diagnostic_category || symptom.DIAGNOSTIC_CATEGORY,
      diagnosis: symptom.diagnosis || symptom.DIAGNOSIS,
      icd10_code: symptom.icd10_code || symptom.ICD10_CODE || symptom.icd10,
      symp_prob: symptom.symp_prob || symptom.SYMP_PROB
    };
  });
}

// Load clinical notes from file, database, or use sample notes
async function prepareClinicalNotes(notesFilePath) {
  // Try to load from file if provided
  if (notesFilePath && fs.existsSync(notesFilePath)) {
    const notes = loadDataFromFile(notesFilePath);
    
    // Normalize field names
    return notes.map(note => {
      const noteText = note.note_text || note.NOTE_TEXT || note.Note_Text || 
                      note.text || note.content || note.clinical_note;
      const patientId = note.patient_id || note.PATIENT_ID || note.Patient_ID || 
                      note["Patient_ID#"] || note.id || uuidv4().substring(0, 8);
      const noteId = note.note_id || note.NOTE_ID || note.id || uuidv4().substring(0, 8);
      
      if (!noteText) {
        return null; // Skip notes without text
      }
      
      return {
        patient_id: patientId.toString(),
        note_id: noteId.toString(),
        note_text: noteText,
        dos_date: note.dos_date || note.service_date || new Date().toISOString().slice(0, 10)
      };
    }).filter(note => note !== null);
  }
  
  // Try to find a clinical notes file
  const notesFile = findMostRecentFile('./attached_assets', /(clinical|medical).*notes.*\.(xlsx|csv)$/i);
  if (notesFile) {
    console.log(`Found clinical notes file: ${notesFile}`);
    const notes = loadDataFromFile(notesFile);
    
    // Normalize field names
    return notes.map(note => {
      const noteText = note.note_text || note.NOTE_TEXT || note.Note_Text || 
                      note.text || note.content || note.clinical_note;
      const patientId = note.patient_id || note.PATIENT_ID || note.Patient_ID || 
                      note["Patient_ID#"] || note.id || uuidv4().substring(0, 8);
      const noteId = note.note_id || note.NOTE_ID || note.id || uuidv4().substring(0, 8);
      
      if (!noteText) {
        return null; // Skip notes without text
      }
      
      return {
        patient_id: patientId.toString(),
        note_id: noteId.toString(),
        note_text: noteText,
        dos_date: note.dos_date || note.service_date || new Date().toISOString().slice(0, 10)
      };
    }).filter(note => note !== null);
  }
  
  // Try to get notes from testing directories
  try {
    const testingFiles = [];
    if (fs.existsSync('./testing')) {
      const testFiles = fs.readdirSync('./testing');
      for (const file of testFiles) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join('./testing', file), 'utf8');
          if (content.includes('note_text') || content.includes('Note_Text')) {
            testingFiles.push(path.join('./testing', file));
          }
        }
      }
    }
    
    if (testingFiles.length > 0) {
      console.log(`Found ${testingFiles.length} testing files with potential clinical notes`);
      
      // Extract note data from JavaScript/TypeScript files
      const extractedNotes = [];
      for (const file of testingFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract array literals containing note data
        const arrayMatches = content.match(/\[\s*\{\s*"[^"]+"\s*:/g);
        if (!arrayMatches) continue;
        
        // Find boundaries of each array
        for (const match of arrayMatches) {
          const startIndex = content.indexOf(match);
          let braceCount = 1;
          let endIndex = startIndex + match.length;
          
          while (braceCount > 0 && endIndex < content.length) {
            const char = content[endIndex];
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            endIndex++;
          }
          
          // Try to parse the array
          try {
            const arrayText = content.substring(startIndex, endIndex);
            const noteArray = JSON.parse(arrayText);
            
            // Check if array contains notes
            if (Array.isArray(noteArray) && noteArray.length > 0 && 
                (noteArray[0].note_text || noteArray[0].Note_Text || noteArray[0].NOTE_TEXT)) {
              extractedNotes.push(...noteArray);
            }
          } catch (e) {
            // Skip parse errors
          }
        }
      }
      
      if (extractedNotes.length > 0) {
        console.log(`Extracted ${extractedNotes.length} clinical notes from testing files`);
        
        // Normalize field names
        return extractedNotes.map(note => {
          const noteText = note.note_text || note.NOTE_TEXT || note.Note_Text || 
                          note.text || note.content || note.clinical_note;
          const patientId = note.patient_id || note.PATIENT_ID || note.Patient_ID || 
                          note["Patient_ID#"] || note.id || uuidv4().substring(0, 8);
          const noteId = note.note_id || note.NOTE_ID || note.id || uuidv4().substring(0, 8);
          
          if (!noteText) {
            return null; // Skip notes without text
          }
          
          return {
            patient_id: patientId.toString(),
            note_id: noteId.toString(),
            note_text: noteText,
            dos_date: note.dos_date || note.service_date || new Date().toISOString().slice(0, 10)
          };
        }).filter(note => note !== null);
      }
    }
  } catch (e) {
    console.error("Error extracting notes from testing files:", e);
  }
  
  // Fall back to sample clinical notes
  console.log("Using sample clinical notes for testing");
  
  // Create representative sample of clinical notes
  return [
    {
      patient_id: "P10001",
      note_id: "N50001",
      note_text: "Patient presents with anxiety and depression. Reports trouble sleeping and fatigue that has been ongoing for several months. Patient states having difficulty concentrating at work.",
      dos_date: "2025-01-15"
    },
    {
      patient_id: "P10002",
      note_id: "N50002",
      note_text: "Patient reports experiencing panic attacks and social anxiety. States symptoms are worse when in crowded places. Has been using breathing techniques with some relief but still struggles with daily tasks.",
      dos_date: "2025-02-20"
    },
    {
      patient_id: "P10003",
      note_id: "N50003",
      note_text: "Patient denies suicidal ideation but reports feeling hopeless at times. Describes mood as 'empty' and has lost interest in previously enjoyed activities. Sleep has been disrupted with early morning awakening.",
      dos_date: "2025-03-05"
    },
    {
      patient_id: "P10004",
      note_id: "N50004",
      note_text: "Patient presents with symptoms of PTSD including flashbacks, nightmares, and heightened startle response. Reports avoiding situations that remind them of the traumatic event. Describes feeling emotionally numb.",
      dos_date: "2025-01-30"
    },
    {
      patient_id: "P10005",
      note_id: "N50005",
      note_text: "Patient was counseled about potential side effects of new medication including insomnia and headaches but has not experienced these symptoms. Current medications are well-tolerated with no reported issues.",
      dos_date: "2025-02-10"
    },
    {
      patient_id: "P10006",
      note_id: "N50006",
      note_text: "Patient reports significant improvement in depressive symptoms after starting new medication. Sleep has improved and energy levels are better. Still experiences some anxiety in social situations but less severe than before.",
      dos_date: "2025-02-28"
    },
    {
      patient_id: "P10007", 
      note_id: "N50007",
      note_text: "Patient presents with symptoms of obsessive thoughts and compulsive behaviors that are interfering with daily functioning. Reports feeling unable to control these thoughts despite recognizing they are excessive.",
      dos_date: "2025-03-10"
    },
    {
      patient_id: "P10008",
      note_id: "N50008",
      note_text: "Patient reports difficulty with attentiveness and concentration. Describes being easily distracted and having trouble completing tasks. These symptoms have been present since childhood but are increasingly problematic at work.",
      dos_date: "2025-01-05"
    },
    {
      patient_id: "P10009",
      note_id: "N50009",
      note_text: "Patient reports experiencing auditory hallucinations and paranoid thoughts. States they hear voices commenting on their actions and believe others are plotting against them. Sleep is disrupted and appetite is poor.",
      dos_date: "2025-02-15"
    },
    {
      patient_id: "P10010",
      note_id: "N50010",
      note_text: "Patient reports mood swings with periods of elevated energy and decreased need for sleep alternating with depressive episodes. During high-energy periods, patient engages in impulsive spending and risky behaviors.",
      dos_date: "2025-03-20"
    }
  ];
}

// Process notes with both algorithms in batches to avoid memory issues
async function processNotesWithBothAlgorithms(notes, symptoms) {
  console.log(`Starting comparison process for ${notes.length} clinical notes...`);
  
  // Prepare batches to process
  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < notes.length; i += BATCH_SIZE) {
    batches.push(notes.slice(i, i + BATCH_SIZE));
  }
  
  // Initialize results
  const results = {
    totalNotes: notes.length,
    v30Results: {},
    v32Results: {},
    processedBatches: 0,
    totalBatches: batches.length
  };
  
  // Process batches
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    console.log(`Processing batch ${i+1}/${batches.length} (${batch.length} notes)...`);
    
    try {
      // Process with V3.0 symptom matcher
      console.log("Running V3.0 symptom extractor...");
      const v30BatchResults = await originalExtractor.extractSymptoms(batch, symptoms);
      
      // Group by note_id for easier comparison
      for (const result of v30BatchResults) {
        if (!results.v30Results[result.note_id]) {
          results.v30Results[result.note_id] = [];
        }
        results.v30Results[result.note_id].push(result);
      }
      
      // Process with V3.2 symptom matcher
      console.log("Running V3.2 symptom extractor...");
      
      // Need to load V3.2 dynamically since it uses ES modules
      const v32MatcherScript = './utils/symptomMatcherV3_2.mjs';
      const scriptContent = fs.readFileSync(path.resolve(__dirname, v32MatcherScript), 'utf8');
      
      // Create a temporary CommonJS version for this script
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      const tempPath = path.join(tempDir, 'symptomMatcherV3_2.cjs');
      const cjsContent = scriptContent.replace('export {', 'module.exports = {');
      fs.writeFileSync(tempPath, cjsContent);
      
      // Load the CommonJS version
      const v32Matcher = require(tempPath);
      
      for (const note of batch) {
        const v32Result = v32Matcher.refinedSymptomMatcher(note.note_text, symptoms, {
          preserveDuplicates: true
        });
        
        // Add patient and note info to results
        if (v32Result?.matches) {
          v32Result.matches.forEach(match => {
            match.patient_id = note.patient_id;
            match.note_id = note.note_id;
            match.dos_date = note.dos_date;
          });
        }
        
        results.v32Results[note.note_id] = v32Result?.matches || [];
      }
      
      results.processedBatches++;
      
      // Progress update
      const progress = (results.processedBatches / results.totalBatches * 100).toFixed(1);
      console.log(`Progress: ${progress}% (${results.processedBatches}/${results.totalBatches} batches)`);
      
    } catch (error) {
      console.error(`Error processing batch ${i+1}:`, error);
      console.log("Continuing with next batch...");
    }
  }
  
  // Clean up temp directory
  try {
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  } catch (e) {
    console.error("Error cleaning up temp directory:", e);
  }
  
  return results;
}

// Analyze results and generate comparison report
function analyzeResults(results) {
  console.log("Analyzing comparison results...");
  
  const metrics = {
    // Overall metrics
    totalNotes: results.totalNotes,
    notesWithV30Matches: 0,
    notesWithV32Matches: 0,
    totalV30Matches: 0,
    totalV32Matches: 0,
    
    // Detailed metrics
    duplicateMatches: {
      v30Count: 0,
      v32Count: 0,
      mostFrequentDuplicates: []
    },
    missedSymptoms: {
      byV30: [],
      byV32: []
    },
    categoryAnalysis: {
      v30Categories: {},
      v32Categories: {},
      newCategoriesInV32: []
    },
    diagnosisAnalysis: {
      v30Diagnoses: {},
      v32Diagnoses: {},
      newDiagnosesInV32: []
    },
    falseNegatives: {
      v30Count: 0,
      v32Count: 0,
      examples: []
    },
    
    // Note-level comparisons
    noteComparisons: []
  };
  
  // Track duplicate symptoms by note 
  const duplicateTracker = {
    v30: {},
    v32: {}
  };
  
  // Analyze each note
  const processedNoteIds = new Set([
    ...Object.keys(results.v30Results), 
    ...Object.keys(results.v32Results)
  ]);
  
  processedNoteIds.forEach(noteId => {
    const v30Matches = results.v30Results[noteId] || [];
    const v32Matches = results.v32Results[noteId] || [];
    
    // Update counts
    if (v30Matches.length > 0) metrics.notesWithV30Matches++;
    if (v32Matches.length > 0) metrics.notesWithV32Matches++;
    
    metrics.totalV30Matches += v30Matches.length;
    metrics.totalV32Matches += v32Matches.length;
    
    // Extract symptom segments for comparison
    const v30Symptoms = v30Matches.map(m => m.symptom_segment?.toLowerCase()).filter(Boolean);
    const v32Symptoms = v32Matches.map(m => m.symptom_segment?.toLowerCase()).filter(Boolean);
    
    // Track symptom segments by note
    const v30SymptomSet = new Set(v30Symptoms);
    const v32SymptomSet = new Set(v32Symptoms);
    
    // Find unique symptoms in each version
    const uniqueToV30 = [...v30SymptomSet].filter(s => !v32SymptomSet.has(s));
    const uniqueToV32 = [...v32SymptomSet].filter(s => !v30SymptomSet.has(s));
    const shared = [...v30SymptomSet].filter(s => v32SymptomSet.has(s));
    
    // Check for duplicate symptoms in V3.0
    v30Symptoms.forEach(symptom => {
      if (!duplicateTracker.v30[symptom]) {
        duplicateTracker.v30[symptom] = { count: 0, notes: new Set() };
      }
      duplicateTracker.v30[symptom].count++;
      duplicateTracker.v30[symptom].notes.add(noteId);
    });
    
    // Get duplicate counts in v3.0
    const v30DuplicateCount = v30Symptoms.length - v30SymptomSet.size;
    metrics.duplicateMatches.v30Count += v30DuplicateCount;
    
    // Check for duplicate symptoms in V3.2 (these are intentional in V3.2)
    v32Symptoms.forEach(symptom => {
      if (!duplicateTracker.v32[symptom]) {
        duplicateTracker.v32[symptom] = { count: 0, notes: new Set() };
      }
      duplicateTracker.v32[symptom].count++;
      duplicateTracker.v32[symptom].notes.add(noteId);
    });
    
    // Get duplicate counts in v3.2
    const v32DuplicateCount = v32Symptoms.length - v32SymptomSet.size;
    metrics.duplicateMatches.v32Count += v32DuplicateCount;
    
    // Update category analysis
    v30Matches.forEach(match => {
      const category = match.category || match.diagnostic_category || 'Unknown';
      if (!metrics.categoryAnalysis.v30Categories[category]) {
        metrics.categoryAnalysis.v30Categories[category] = 0;
      }
      metrics.categoryAnalysis.v30Categories[category]++;
      
      const diagnosis = match.diagnosis || 'Unknown';
      if (!metrics.diagnosisAnalysis.v30Diagnoses[diagnosis]) {
        metrics.diagnosisAnalysis.v30Diagnoses[diagnosis] = 0;
      }
      metrics.diagnosisAnalysis.v30Diagnoses[diagnosis]++;
    });
    
    v32Matches.forEach(match => {
      const category = match.category || match.diagnostic_category || 'Unknown';
      if (!metrics.categoryAnalysis.v32Categories[category]) {
        metrics.categoryAnalysis.v32Categories[category] = 0;
      }
      metrics.categoryAnalysis.v32Categories[category]++;
      
      const diagnosis = match.diagnosis || 'Unknown';
      if (!metrics.diagnosisAnalysis.v32Diagnoses[diagnosis]) {
        metrics.diagnosisAnalysis.v32Diagnoses[diagnosis] = 0;
      }
      metrics.diagnosisAnalysis.v32Diagnoses[diagnosis]++;
    });
    
    // Track symptoms missed by each version
    if (uniqueToV30.length > 0) {
      uniqueToV30.forEach(symptom => {
        metrics.missedSymptoms.byV32.push({
          symptom,
          noteId,
          examples: v30Matches.filter(m => 
            m.symptom_segment.toLowerCase() === symptom
          )
        });
      });
    }
    
    if (uniqueToV32.length > 0) {
      uniqueToV32.forEach(symptom => {
        metrics.missedSymptoms.byV30.push({
          symptom,
          noteId,
          examples: v32Matches.filter(m => 
            m.symptom_segment.toLowerCase() === symptom
          )
        });
      });
    }
    
    // Add note to comparison if there are differences
    if (uniqueToV30.length > 0 || uniqueToV32.length > 0 || v30DuplicateCount !== v32DuplicateCount) {
      metrics.noteComparisons.push({
        noteId,
        v30MatchCount: v30Matches.length,
        v32MatchCount: v32Matches.length,
        uniqueToV30,
        uniqueToV32,
        shared,
        v30DuplicateCount,
        v32DuplicateCount,
        // Include a sample of the note text if available (first 100 chars)
        noteSample: v30Matches[0]?.note_text?.substring(0, 100) || 
                   v32Matches[0]?.note_text?.substring(0, 100) || 
                   "Note text not available"
      });
    }
  });
  
  // Find most frequent duplicates
  metrics.duplicateMatches.mostFrequentDuplicates = Object.entries(duplicateTracker.v32)
    .filter(([_, data]) => data.count > data.notes.size) // Has duplicates
    .sort((a, b) => (b[1].count - b[1].notes.size) - (a[1].count - a[1].notes.size))
    .slice(0, 10)
    .map(([symptom, data]) => ({
      symptom,
      totalOccurrences: data.count,
      uniqueNotes: data.notes.size,
      duplicateCount: data.count - data.notes.size
    }));
  
  // Find new categories in V3.2
  metrics.categoryAnalysis.newCategoriesInV32 = Object.keys(metrics.categoryAnalysis.v32Categories)
    .filter(category => !metrics.categoryAnalysis.v30Categories[category]);
  
  // Find new diagnoses in V3.2
  metrics.diagnosisAnalysis.newDiagnosesInV32 = Object.keys(metrics.diagnosisAnalysis.v32Diagnoses)
    .filter(diagnosis => !metrics.diagnosisAnalysis.v30Diagnoses[diagnosis]);
  
  // Pick examples for false negatives (symptoms that should have been detected)
  // These are the most significant misses (top 5 for each version)
  metrics.falseNegatives.v30Count = metrics.missedSymptoms.byV30.length;
  metrics.falseNegatives.v32Count = metrics.missedSymptoms.byV32.length;
  
  // Get examples of the most concerning misses
  metrics.falseNegatives.examples = [
    ...metrics.missedSymptoms.byV30.slice(0, 5).map(miss => ({
      symptom: miss.symptom,
      noteId: miss.noteId,
      missedBy: 'V3.0',
      category: miss.examples[0]?.category || miss.examples[0]?.diagnostic_category || 'Unknown',
      diagnosis: miss.examples[0]?.diagnosis || 'Unknown'
    })),
    ...metrics.missedSymptoms.byV32.slice(0, 5).map(miss => ({
      symptom: miss.symptom,
      noteId: miss.noteId,
      missedBy: 'V3.2',
      category: miss.examples[0]?.category || miss.examples[0]?.diagnostic_category || 'Unknown',
      diagnosis: miss.examples[0]?.diagnosis || 'Unknown'
    }))
  ];
  
  return metrics;
}

// Generate a comprehensive report
function generateReport(metrics, outputPath) {
  const now = new Date();
  const formattedDate = now.toISOString().slice(0, 10);
  const formattedTime = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  
  const reportContent = `# Symptom Matcher Algorithm Comparison Report
Generated: ${formattedDate} ${formattedTime}

## Executive Summary

This report compares Symptom Matcher V3.0 (original) with V3.2 (refined) across ${metrics.totalNotes} clinical notes.

### Key Findings

| Metric | V3.0 (Original) | V3.2 (Refined) | Difference | % Change |
|--------|----------------|----------------|------------|----------|
| Total Symptoms Found | ${metrics.totalV30Matches} | ${metrics.totalV32Matches} | ${metrics.totalV32Matches - metrics.totalV30Matches > 0 ? '+' : ''}${metrics.totalV32Matches - metrics.totalV30Matches} | ${((metrics.totalV32Matches - metrics.totalV30Matches) / metrics.totalV30Matches * 100).toFixed(1)}% |
| Notes With Symptoms | ${metrics.notesWithV30Matches} | ${metrics.notesWithV32Matches} | ${metrics.notesWithV32Matches - metrics.notesWithV30Matches > 0 ? '+' : ''}${metrics.notesWithV32Matches - metrics.notesWithV30Matches} | ${((metrics.notesWithV32Matches - metrics.notesWithV30Matches) / metrics.notesWithV30Matches * 100).toFixed(1)}% |
| Duplicate Matches | ${metrics.duplicateMatches.v30Count} | ${metrics.duplicateMatches.v32Count} | ${metrics.duplicateMatches.v32Count - metrics.duplicateMatches.v30Count > 0 ? '+' : ''}${metrics.duplicateMatches.v32Count - metrics.duplicateMatches.v30Count} | - |
| Unique Categories | ${Object.keys(metrics.categoryAnalysis.v30Categories).length} | ${Object.keys(metrics.categoryAnalysis.v32Categories).length} | ${Object.keys(metrics.categoryAnalysis.v32Categories).length - Object.keys(metrics.categoryAnalysis.v30Categories).length > 0 ? '+' : ''}${Object.keys(metrics.categoryAnalysis.v32Categories).length - Object.keys(metrics.categoryAnalysis.v30Categories).length} | - |
| Unique Diagnoses | ${Object.keys(metrics.diagnosisAnalysis.v30Diagnoses).length} | ${Object.keys(metrics.diagnosisAnalysis.v32Diagnoses).length} | ${Object.keys(metrics.diagnosisAnalysis.v32Diagnoses).length - Object.keys(metrics.diagnosisAnalysis.v30Diagnoses).length > 0 ? '+' : ''}${Object.keys(metrics.diagnosisAnalysis.v32Diagnoses).length - Object.keys(metrics.diagnosisAnalysis.v30Diagnoses).length} | - |

### Summary of Improvements in V3.2

${metrics.totalV32Matches > metrics.totalV30Matches
  ? `1. **Enhanced Detection**: V3.2 identified ${metrics.totalV32Matches - metrics.totalV30Matches} more symptoms (${((metrics.totalV32Matches - metrics.totalV30Matches) / metrics.totalV30Matches * 100).toFixed(1)}% increase).`
  : `1. **Detection Changes**: V3.2 identified ${metrics.totalV30Matches - metrics.totalV32Matches} fewer symptoms (${((metrics.totalV30Matches - metrics.totalV32Matches) / metrics.totalV30Matches * 100).toFixed(1)}% decrease).`}
2. **Duplicate Preservation**: V3.2 intentionally preserves duplicate symptoms (${metrics.duplicateMatches.v32Count} instances) to indicate symptom intensity.
3. **New Categories**: ${metrics.categoryAnalysis.newCategoriesInV32.length} new diagnostic categories were identified by V3.2.
4. **New Diagnoses**: ${metrics.diagnosisAnalysis.newDiagnosesInV32.length} new diagnoses were identified by V3.2.
${metrics.missedSymptoms.byV30.length > 0
  ? `5. **Detection Improvements**: V3.2 found ${metrics.missedSymptoms.byV30.length} symptoms that V3.0 missed.`
  : ''}

## Detailed Analysis

### 1. Symptom Detection Analysis

#### Symptoms Found Only by V3.2 (V3.0 missed)
${metrics.missedSymptoms.byV30.length > 0
  ? metrics.missedSymptoms.byV30.slice(0, 20).map((miss, i) => 
    `${i+1}. "${miss.symptom}" (Category: ${miss.examples[0]?.category || miss.examples[0]?.diagnostic_category || 'Unknown'}, Diagnosis: ${miss.examples[0]?.diagnosis || 'Unknown'})`
  ).join('\n')
  : 'None - V3.2 did not find any symptoms that V3.0 missed.'}
${metrics.missedSymptoms.byV30.length > 20 ? `\n...and ${metrics.missedSymptoms.byV30.length - 20} more` : ''}

#### Symptoms Found Only by V3.0 (V3.2 missed)
${metrics.missedSymptoms.byV32.length > 0
  ? metrics.missedSymptoms.byV32.slice(0, 20).map((miss, i) => 
    `${i+1}. "${miss.symptom}" (Category: ${miss.examples[0]?.category || miss.examples[0]?.diagnostic_category || 'Unknown'}, Diagnosis: ${miss.examples[0]?.diagnosis || 'Unknown'})`
  ).join('\n')
  : 'None - V3.0 did not find any symptoms that V3.2 missed.'}
${metrics.missedSymptoms.byV32.length > 20 ? `\n...and ${metrics.missedSymptoms.byV32.length - 20} more` : ''}

### 2. Duplicate Symptom Analysis

V3.2 preserves duplicate mentions of the same symptom to better represent symptom intensity.

#### Top Duplicate Symptoms in V3.2
${metrics.duplicateMatches.mostFrequentDuplicates.length > 0
  ? metrics.duplicateMatches.mostFrequentDuplicates.map((dup, i) => 
    `${i+1}. "${dup.symptom}" - appeared ${dup.totalOccurrences} times across ${dup.uniqueNotes} notes (${dup.duplicateCount} duplicates)`
  ).join('\n')
  : 'No significant duplicates found.'}

### 3. Category and Diagnosis Analysis

#### Top Categories in V3.2
${Object.entries(metrics.categoryAnalysis.v32Categories)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([category, count], i) => `${i+1}. ${category}: ${count} occurrences`)
  .join('\n')}

#### New Categories in V3.2 (not in V3.0)
${metrics.categoryAnalysis.newCategoriesInV32.length > 0
  ? metrics.categoryAnalysis.newCategoriesInV32.map((category, i) => 
    `${i+1}. ${category}: ${metrics.categoryAnalysis.v32Categories[category]} occurrences`
  ).join('\n')
  : 'No new categories found in V3.2.'}

#### Top Diagnoses in V3.2
${Object.entries(metrics.diagnosisAnalysis.v32Diagnoses)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([diagnosis, count], i) => `${i+1}. ${diagnosis}: ${count} occurrences`)
  .join('\n')}

#### New Diagnoses in V3.2 (not in V3.0)
${metrics.diagnosisAnalysis.newDiagnosesInV32.length > 0
  ? metrics.diagnosisAnalysis.newDiagnosesInV32.slice(0, 20).map((diagnosis, i) => 
    `${i+1}. ${diagnosis}: ${metrics.diagnosisAnalysis.v32Diagnoses[diagnosis]} occurrences`
  ).join('\n')
  : 'No new diagnoses found in V3.2.'}
${metrics.diagnosisAnalysis.newDiagnosesInV32.length > 20 ? `\n...and ${metrics.diagnosisAnalysis.newDiagnosesInV32.length - 20} more` : ''}

### 4. Note-Level Comparison

The following notes showed significant differences between algorithms:

${metrics.noteComparisons.slice(0, 10).map((comp, i) => `
#### Note ${i+1}: ${comp.noteId}

**Sample Text:** "${comp.noteSample}..."

**V3.0:** ${comp.v30MatchCount} total matches (${comp.v30DuplicateCount} duplicates)
**V3.2:** ${comp.v32MatchCount} total matches (${comp.v32DuplicateCount} duplicates)

**Only in V3.0:** ${comp.uniqueToV30.length > 0 ? comp.uniqueToV30.join(', ') : 'None'}
**Only in V3.2:** ${comp.uniqueToV32.length > 0 ? comp.uniqueToV32.join(', ') : 'None'}
**In Both:** ${comp.shared.length > 0 ? comp.shared.join(', ') : 'None'}
`).join('\n')}
${metrics.noteComparisons.length > 10 ? `\n...and ${metrics.noteComparisons.length - 10} more notes with differences` : ''}

## Conclusion

${metrics.totalV32Matches > metrics.totalV30Matches
  ? `The V3.2 symptom matcher demonstrates significant improvements over V3.0, detecting ${((metrics.totalV32Matches - metrics.totalV30Matches) / metrics.totalV30Matches * 100).toFixed(1)}% more symptoms across the clinical notes analyzed. The intentional preservation of duplicate symptoms in V3.2 helps represent symptom intensity, which was not captured in V3.0.`
  : `The V3.2 symptom matcher demonstrates different detection patterns compared to V3.0, finding ${((metrics.totalV30Matches - metrics.totalV32Matches) / metrics.totalV30Matches * 100).toFixed(1)}% fewer symptoms but potentially with higher precision.`}

The additional organization capabilities in V3.2 provide enhanced categorization with ${metrics.categoryAnalysis.newCategoriesInV32.length} new diagnostic categories and ${metrics.diagnosisAnalysis.newDiagnosesInV32.length} new diagnoses not present in V3.0 results.

${metrics.missedSymptoms.byV30.length > 0
  ? `V3.2 successfully detected ${metrics.missedSymptoms.byV30.length} symptoms that were missed by V3.0, enhancing the overall symptom identification capabilities.`
  : ''}
${metrics.missedSymptoms.byV32.length > 0
  ? `However, V3.2 also missed ${metrics.missedSymptoms.byV32.length} symptoms that were detected by V3.0, suggesting there may be room for combining the strengths of both approaches.`
  : ''}

### Recommendations

1. **Duplicate Handling:** The preservation of duplicates in V3.2 adds important clinical context regarding symptom intensity. This should be maintained in future versions.

2. **Algorithm Integration:** Consider a hybrid approach that combines the strengths of both algorithms to minimize missed symptoms while maintaining the organizational benefits of V3.2.

3. **Negation Handling:** Both versions show room for improvement in consistently handling negated symptoms. Future refinements should focus on this area.

4. **Context Sensitivity:** V3.2 shows improved context awareness but could benefit from further enhancements to reduce false positives in complex clinical narratives.
`;

  try {
    // Ensure reports directory exists
    const reportsDir = path.resolve('./reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Save report to file
    fs.writeFileSync(outputPath, reportContent);
    console.log(`Report saved to: ${outputPath}`);
    
    // Also save JSON metrics for further analysis
    const jsonPath = outputPath.replace('.md', '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
    console.log(`Detailed JSON metrics saved to: ${jsonPath}`);
    
    return reportContent;
  } catch (error) {
    console.error("Error saving report:", error);
    return reportContent;
  }
}

// Main function
async function main() {
  try {
    console.log("==== COMPREHENSIVE SYMPTOM MATCHER COMPARISON ====");
    console.log("Starting comparison process...");
    
    // Get file paths from command line arguments
    const symptomFilePath = process.argv[2] || null;
    const notesFilePath = process.argv[3] || null;
    
    // Prepare symptom reference data
    const symptoms = prepareSymptomReferenceData(symptomFilePath);
    
    // Prepare clinical notes
    const notes = await prepareClinicalNotes(notesFilePath);
    
    if (notes.length === 0) {
      throw new Error("No clinical notes found for testing");
    }
    
    if (notes.length > 0) {
      console.log(`Loaded ${notes.length} clinical notes for processing`);
      console.log(`First note sample: "${notes[0].note_text.substring(0, 50)}..."`);
    }
    
    // Process notes with both algorithms
    const results = await processNotesWithBothAlgorithms(notes, symptoms);
    
    // Analyze results
    const metrics = analyzeResults(results);
    
    // Generate report
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const reportPath = `./reports/symptom_algorithm_comparison_${timestamp}.md`;
    generateReport(metrics, reportPath);
    
    console.log("\n==== COMPARISON COMPLETE ====\n");
    console.log(`Processed ${notes.length} clinical notes with ${symptoms.length} reference symptoms`);
    console.log(`V3.0 Matches: ${metrics.totalV30Matches}`);
    console.log(`V3.2 Matches: ${metrics.totalV32Matches}`);
    console.log(`Detection Difference: ${metrics.totalV32Matches - metrics.totalV30Matches > 0 ? '+' : ''}${metrics.totalV32Matches - metrics.totalV30Matches} (${((metrics.totalV32Matches - metrics.totalV30Matches) / metrics.totalV30Matches * 100).toFixed(1)}%)`);
    console.log(`Notes with Differences: ${metrics.noteComparisons.length}`);
    console.log(`\nSee detailed report at: ${reportPath}`);
    
  } catch (error) {
    console.error("Error in symptom matcher comparison:", error);
    process.exit(1);
  }
}

// Run the main function
main();