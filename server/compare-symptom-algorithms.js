/**
 * Comprehensive Symptom Matcher Algorithm Comparison Tool
 * 
 * This script runs both the V3.0 and V3.2 symptom matcher algorithms on
 * real clinical notes from your database and generates a detailed comparison report.
 * 
 * Usage: node server/compare-symptom-algorithms.js [path_to_symptom_file] [path_to_notes_file]
 * Example: node server/compare-symptom-algorithms.js attached_assets/Symptom_Segments_asof_4_30_25_MASTER.xlsx
 * 
 * If no notes file is provided, the script will try to load notes from the database.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

// Import the symptom matchers
const originalMatcher = require('./utils/symptomExtractor');
const v32Matcher = require('./utils/symptomMatcherV3_2');

// Sample clinical notes that contain various symptom patterns
const CLINICAL_NOTE_TEMPLATES = [
  "Patient reports experiencing {SYMPTOM}. Has been ongoing for several weeks.",
  "The patient presents with {SYMPTOM} which started about 2 months ago.",
  "Patient complains of {SYMPTOM} that is affecting daily activities.",
  "Patient states {SYMPTOM} is worse in the mornings.",
  "Symptoms include {SYMPTOM} which patient rates as 7/10 in severity."
];

// Negation patterns to test negation handling
const NEGATION_TEMPLATES = [
  "Patient denies {SYMPTOM}.",
  "No evidence of {SYMPTOM}.",
  "Patient reports no {SYMPTOM}.",
  "Patient has ruled out {SYMPTOM}.",
  "Negative for {SYMPTOM}."
];

// Context patterns to test context awareness
const CONTEXT_TEMPLATES = [
  "Patient was counseled about {SYMPTOM} as a possible side effect, but has not experienced it.",
  "Patient was asked about {SYMPTOM} but denies experiencing it.",
  "Literature mentions {SYMPTOM} as a common symptom, but patient has not experienced this.",
  "Patient's mother had {SYMPTOM}, patient is concerned about hereditary risk.",
  "Patient reports that spouse has {SYMPTOM}, but patient does not."
];

// Find the most recent Symptom_Segments file if none provided
function findMostRecentSymptomFile() {
  const files = fs.readdirSync('./attached_assets');
  const symptomFiles = files.filter(f => 
    f.startsWith('Symptom_Segments_asof_') && 
    (f.endsWith('.xlsx') || f.endsWith('.csv'))
  );
  
  if (symptomFiles.length === 0) {
    throw new Error("No Symptom_Segments file found in attached_assets directory");
  }
  
  // Sort by date in filename (newest first)
  symptomFiles.sort((a, b) => {
    const dateA = a.match(/asof_(\d+_\d+_\d+)/)[1];
    const dateB = b.match(/asof_(\d+_\d+_\d+)/)[1];
    return dateB.localeCompare(dateA);
  });
  
  return path.join('./attached_assets', symptomFiles[0]);
}

// Load symptoms from Excel or CSV file
function loadSymptomsFromFile(filePath) {
  try {
    console.log(`Loading symptoms from: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    let symptoms = [];
    
    if (filePath.endsWith('.xlsx')) {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      symptoms = xlsx.utils.sheet_to_json(worksheet);
    } else if (filePath.endsWith('.csv')) {
      const csvData = fs.readFileSync(filePath, 'utf8');
      const rows = csvData.split('\n');
      const headers = rows[0].split(',').map(h => h.trim());
      
      symptoms = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        const symptom = {};
        headers.forEach((header, i) => {
          symptom[header] = values[i];
        });
        return symptom;
      });
    } else {
      throw new Error("Unsupported file format. Please use .xlsx or .csv");
    }
    
    console.log(`Loaded ${symptoms.length} symptoms from file`);
    return symptoms;
  } catch (error) {
    console.error("Error loading symptoms:", error);
    process.exit(1);
  }
}

// Load clinical notes from database or file
async function loadClinicalNotes(notesFilePath = null) {
  try {
    let notes = [];
    
    if (notesFilePath && fs.existsSync(notesFilePath)) {
      // Load notes from file if provided
      console.log(`Loading notes from file: ${notesFilePath}`);
      
      if (notesFilePath.endsWith('.xlsx')) {
        const workbook = xlsx.readFile(notesFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        notes = xlsx.utils.sheet_to_json(worksheet);
      } else if (notesFilePath.endsWith('.csv')) {
        const csvData = fs.readFileSync(notesFilePath, 'utf8');
        const rows = csvData.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());
        
        notes = rows.slice(1).map(row => {
          if (!row.trim()) return null;
          const values = row.split(',').map(v => v.trim());
          const note = {};
          headers.forEach((header, i) => {
            note[header] = values[i];
          });
          return note;
        }).filter(n => n !== null);
      } else {
        throw new Error("Unsupported notes file format. Please use .xlsx or .csv");
      }
      
      console.log(`Loaded ${notes.length} notes from file`);
    } else {
      try {
        // Try to load from database
        console.log("Loading clinical notes from database...");
        
        // Import database utilities (adjust path as needed)
        const db = require('../server/db');
        const notes_db = await db.query('SELECT * FROM notes LIMIT 1000');
        
        notes = notes_db.rows.map(note => ({
          patient_id: note.patient_id,
          note_id: note.id,
          note_text: note.note_text,
          dos_date: note.dos_date,
          template_type: 'database'
        }));
        
        console.log(`Loaded ${notes.length} notes from database`);
      } catch (dbError) {
        console.error("Could not load notes from database:", dbError.message);
        
        // Fallback to test notes if needed
        console.log("Generating a sample of real-world style clinical notes...");
        
        // Create a sample of realistic clinical notes
        const sampleNotes = [
          {
            patient_id: "P10001", 
            note_id: "N50001",
            note_text: "Patient presents with anxiety and depression. Reports trouble sleeping and fatigue that has been ongoing for several months. Patient states having difficulty concentrating at work.",
            dos_date: "2025-01-15",
            template_type: 'sample'
          },
          {
            patient_id: "P10002",
            note_id: "N50002",
            note_text: "Patient reports experiencing panic attacks and social anxiety. States symptoms are worse when in crowded places. Has been using breathing techniques with some relief but still struggles with daily tasks.",
            dos_date: "2025-02-20",
            template_type: 'sample'
          },
          {
            patient_id: "P10003",
            note_id: "N50003",
            note_text: "Patient denies suicidal ideation but reports feeling hopeless at times. Describes mood as 'empty' and has lost interest in previously enjoyed activities. Sleep has been disrupted with early morning awakening.",
            dos_date: "2025-03-05",
            template_type: 'sample'
          },
          {
            patient_id: "P10004",
            note_id: "N50004",
            note_text: "Patient presents with symptoms of PTSD including flashbacks, nightmares, and heightened startle response. Reports avoiding situations that remind them of the traumatic event. Describes feeling emotionally numb.",
            dos_date: "2025-01-30",
            template_type: 'sample'
          },
          {
            patient_id: "P10005",
            note_id: "N50005",
            note_text: "Patient was counseled about potential side effects of new medication including insomnia and headaches but has not experienced these symptoms. Current medications are well-tolerated with no reported issues.",
            dos_date: "2025-02-10",
            template_type: 'sample'
          }
        ];
        
        notes = sampleNotes;
        console.log(`Created ${notes.length} sample clinical notes for testing`);
      }
    }
    
    // Normalize note structure if needed
    const normalizedNotes = notes.map(note => {
      // Determine which fields contain the note text and other required data
      const noteText = note.note_text || note.Note_Text || note.text || note.content || note.note_content;
      const patientId = note.patient_id || note.Patient_ID || note["Patient_ID#"] || "unknown_patient";
      const noteId = note.note_id || note.Note_ID || note.id || `note_${uuidv4().substring(0, 8)}`;
      const dosDate = note.dos_date || note["Date_of_Service_(DOS)"] || note.service_date || new Date().toISOString().slice(0, 10);
      
      // Skip notes without text
      if (!noteText) {
        console.warn(`Note ${noteId} has no text content and will be skipped`);
        return null;
      }
      
      return {
        patient_id: patientId,
        note_id: noteId,
        note_text: noteText,
        dos_date: dosDate,
        template_type: note.template_type || 'external'
      };
    }).filter(note => note !== null);
    
    return normalizedNotes;
  } catch (error) {
    console.error("Error loading clinical notes:", error);
    throw error;
  }
}

// Process notes with both algorithm versions
async function processNotesWithBothAlgorithms(testNotes, symptoms) {
  console.log("Processing notes with both algorithm versions...");
  
  // Process with original matcher (V3.0)
  console.log("Running original symptom matcher (V3.0)...");
  const originalResults = await originalMatcher.extractSymptoms(testNotes, symptoms);
  
  // Map original results by note ID
  const originalByNote = {};
  originalResults.forEach(result => {
    const noteId = result.note_id;
    if (!originalByNote[noteId]) {
      originalByNote[noteId] = [];
    }
    originalByNote[noteId].push(result);
  });
  
  // Process with V3.2 refined matcher
  console.log("\nRunning refined symptom matcher (V3.2)...");
  const v32Results = {};
  
  for (const note of testNotes) {
    const refinedResult = v32Matcher.refinedSymptomMatcher(note.note_text, symptoms, {
      debug: true,
      preserveDuplicates: true
    });
    
    // Add patient ID and note ID to results
    if (refinedResult.matches) {
      refinedResult.matches.forEach(match => {
        match.patient_id = note.patient_id;
        match.note_id = note.note_id;
        match.dos_date = note.dos_date;
      });
    }
    
    v32Results[note.note_id] = refinedResult.matches || [];
  }
  
  return {
    original: originalByNote,
    v32: v32Results,
    testNotes
  };
}

// Analyze results and generate comparison report
function analyzeResults(results) {
  const { original, v32, testNotes } = results;
  
  // Initialize counters for different test categories
  const totalNotes = testNotes.length;
  let standardNotesCount = 0;
  let negationNotesCount = 0;
  let contextNotesCount = 0;
  
  const metrics = {
    // Overall metrics
    totalNotes,
    originalTotalMatches: 0,
    v32TotalMatches: 0,
    
    // Categorized metrics
    standard: {
      total: 0,
      originalMatches: 0,
      v32Matches: 0,
      sharedMatches: 0,
      uniqueToOriginal: 0,
      uniqueToV32: 0
    },
    negation: {
      total: 0,
      originalMatches: 0,
      v32Matches: 0,
      correctRejection: 0, // Correctly didn't match negated symptoms
      falsePositives: 0   // Incorrectly matched negated symptoms
    },
    context: {
      total: 0,
      originalMatches: 0,
      v32Matches: 0,
      v32CorrectContext: 0
    },
    
    // Detailed analysis
    notesWithDifferences: [],
    organizationStats: {
      byCategory: {},
      byDiagnosis: {},
      bySegment: {}
    }
  };
  
  // Process each test note
  testNotes.forEach(note => {
    const noteId = note.note_id;
    const templateType = note.template_type;
    const originalMatches = original[noteId] || [];
    const v32Matches = v32[noteId] || [];
    
    // Count total matches
    metrics.originalTotalMatches += originalMatches.length;
    metrics.v32TotalMatches += v32Matches.length;
    
    // Track symptom texts for comparison
    const originalSymptoms = new Set(originalMatches.map(m => m.symptom_segment.toLowerCase()));
    const v32Symptoms = new Set(v32Matches.map(m => m.symptom_segment.toLowerCase()));
    
    // Skip notes with no matches in either algorithm if not a negation test
    if (templateType !== 'negation' && originalSymptoms.size === 0 && v32Symptoms.size === 0) {
      return;
    }
    
    // Calculate shared and unique symptoms
    const uniqueToOriginal = Array.from(originalSymptoms).filter(s => !v32Symptoms.has(s));
    const uniqueToV32 = Array.from(v32Symptoms).filter(s => !originalSymptoms.has(s));
    const shared = Array.from(originalSymptoms).filter(s => v32Symptoms.has(s));
    
    // Check for differences and add to report if there are any
    if (uniqueToOriginal.length > 0 || uniqueToV32.length > 0) {
      metrics.notesWithDifferences.push({
        noteId,
        noteText: note.note_text,
        expectedSymptom: note.expected_symptom,
        expectedResult: note.expected_result,
        templateType,
        originalCount: originalMatches.length,
        v32Count: v32Matches.length,
        uniqueToOriginal,
        uniqueToV32,
        shared
      });
    }
    
    // Update category-specific metrics
    switch (templateType) {
      case 'standard':
        standardNotesCount++;
        metrics.standard.total++;
        metrics.standard.originalMatches += originalMatches.length;
        metrics.standard.v32Matches += v32Matches.length;
        metrics.standard.sharedMatches += shared.length;
        metrics.standard.uniqueToOriginal += uniqueToOriginal.length;
        metrics.standard.uniqueToV32 += uniqueToV32.length;
        break;
        
      case 'negation':
        negationNotesCount++;
        metrics.negation.total++;
        metrics.negation.originalMatches += originalMatches.length;
        metrics.negation.v32Matches += v32Matches.length;
        
        // Check if algorithms correctly handled negation
        const expectedSymptom = note.expected_symptom.toLowerCase();
        const originalHasNegated = Array.from(originalSymptoms).some(s => 
          s.includes(expectedSymptom));
        const v32HasNegated = Array.from(v32Symptoms).some(s => 
          s.includes(expectedSymptom));
          
        if (!v32HasNegated) metrics.negation.correctRejection++;
        if (v32HasNegated) metrics.negation.falsePositives++;
        break;
        
      case 'context':
        contextNotesCount++;
        metrics.context.total++;
        metrics.context.originalMatches += originalMatches.length;
        metrics.context.v32Matches += v32Matches.length;
        
        // V3.2 should be able to handle context better
        const hasExpectedSymptom = Array.from(v32Symptoms).some(s => 
          s.includes(note.expected_symptom.toLowerCase()));
        
        // For context tests, v3.2 should not match symptoms in certain contexts
        if (!hasExpectedSymptom) {
          metrics.context.v32CorrectContext++;
        }
        break;
    }
    
    // Update organization statistics
    v32Matches.forEach(match => {
      // By category
      const category = match.category || match.diagnostic_category || 'Unknown';
      if (!metrics.organizationStats.byCategory[category]) {
        metrics.organizationStats.byCategory[category] = 0;
      }
      metrics.organizationStats.byCategory[category]++;
      
      // By diagnosis
      const diagnosis = match.diagnosis || 'Unknown';
      if (!metrics.organizationStats.byDiagnosis[diagnosis]) {
        metrics.organizationStats.byDiagnosis[diagnosis] = 0;
      }
      metrics.organizationStats.byDiagnosis[diagnosis]++;
      
      // By segment
      const segment = match.symptom_segment || 'Unknown';
      if (!metrics.organizationStats.bySegment[segment]) {
        metrics.organizationStats.bySegment[segment] = 0;
      }
      metrics.organizationStats.bySegment[segment]++;
    });
  });
  
  return metrics;
}

// Generate a markdown report
function generateReport(metrics, outputPath) {
  const reportContent = `# Symptom Matcher Algorithm Comparison Report
Generated: ${new Date().toISOString()}

## Overview

This report compares the performance of Symptom Matcher V3.0 (original) and V3.2 (refined) 
across ${metrics.totalNotes} test clinical notes.

### Summary Statistics

| Metric | Original (V3.0) | Refined (V3.2) | Difference |
|--------|----------------|----------------|------------|
| Total Matches | ${metrics.originalTotalMatches} | ${metrics.v32TotalMatches} | ${metrics.v32TotalMatches - metrics.originalTotalMatches > 0 ? '+' : ''}${metrics.v32TotalMatches - metrics.originalTotalMatches} |
| Match Rate | ${(metrics.originalTotalMatches / metrics.totalNotes).toFixed(2)} per note | ${(metrics.v32TotalMatches / metrics.totalNotes).toFixed(2)} per note | ${((metrics.v32TotalMatches - metrics.originalTotalMatches) / metrics.totalNotes).toFixed(2)} |

## Performance by Test Category

### Standard Symptom Matching (${metrics.standard.total} tests)

For simple symptom mentions in clinical notes:

- Original algorithm: ${metrics.standard.originalMatches} matches
- Refined V3.2 algorithm: ${metrics.standard.v32Matches} matches 
- Improvement: ${metrics.standard.v32Matches - metrics.standard.originalMatches > 0 ? '+' : ''}${metrics.standard.v32Matches - metrics.standard.originalMatches} matches (${metrics.standard.total > 0 ? ((metrics.standard.v32Matches - metrics.standard.originalMatches) / metrics.standard.total).toFixed(2) : 0} per note)
- Shared symptoms: ${metrics.standard.sharedMatches}
- Unique to original: ${metrics.standard.uniqueToOriginal}
- Unique to V3.2: ${metrics.standard.uniqueToV32}

### Negation Handling (${metrics.negation.total} tests)

For notes with negated symptoms (e.g., "Patient denies headache"):

- Original algorithm: ${metrics.negation.originalMatches} false matches
- Refined V3.2 algorithm: ${metrics.negation.v32Matches} false matches
- V3.2 correctly rejected negated symptoms: ${metrics.negation.correctRejection}/${metrics.negation.total} tests (${metrics.negation.total > 0 ? (metrics.negation.correctRejection / metrics.negation.total * 100).toFixed(1) : 0}%)
- V3.2 incorrectly matched negated symptoms: ${metrics.negation.falsePositives}/${metrics.negation.total} tests (${metrics.negation.total > 0 ? (metrics.negation.falsePositives / metrics.negation.total * 100).toFixed(1) : 0}%)

### Context Awareness (${metrics.context.total} tests)

For notes with symptoms mentioned in context that should not be extracted:

- Original algorithm: ${metrics.context.originalMatches} false matches
- Refined V3.2 algorithm: ${metrics.context.v32Matches} matches
- V3.2 correctly handled context: ${metrics.context.v32CorrectContext}/${metrics.context.total} tests (${metrics.context.total > 0 ? (metrics.context.v32CorrectContext / metrics.context.total * 100).toFixed(1) : 0}%)

## Organization Capabilities (V3.2 Only)

The V3.2 algorithm organizes extracted symptoms by:

### Categories
${Object.entries(metrics.organizationStats.byCategory)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([category, count]) => `- ${category}: ${count} matches`)
  .join('\n')}
${Object.keys(metrics.organizationStats.byCategory).length > 10 ? `\n...and ${Object.keys(metrics.organizationStats.byCategory).length - 10} more categories` : ''}

### Diagnoses
${Object.entries(metrics.organizationStats.byDiagnosis)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([diagnosis, count]) => `- ${diagnosis}: ${count} matches`)
  .join('\n')}
${Object.keys(metrics.organizationStats.byDiagnosis).length > 10 ? `\n...and ${Object.keys(metrics.organizationStats.byDiagnosis).length - 10} more diagnoses` : ''}

## Specific Differences

${metrics.notesWithDifferences.length > 0 
  ? `The following ${metrics.notesWithDifferences.length} notes showed differences between the algorithms:`
  : 'No significant differences were found between algorithms across all test notes.'}

${metrics.notesWithDifferences.slice(0, 20).map((diff, i) => `
### Difference ${i+1}: ${diff.templateType.toUpperCase()} Test

**Note Text:**
"${diff.noteText}"

**Expected Symptom:** ${diff.expectedSymptom}
**Expected Result:** ${diff.expectedResult}

**Original (V3.0):** ${diff.originalCount} matches
**Refined (V3.2):** ${diff.v32Count} matches

**Unique to Original:** ${diff.uniqueToOriginal.length > 0 ? diff.uniqueToOriginal.join(', ') : 'None'}
**Unique to V3.2:** ${diff.uniqueToV32.length > 0 ? diff.uniqueToV32.join(', ') : 'None'}
**Shared:** ${diff.shared.length > 0 ? diff.shared.join(', ') : 'None'}
`).join('\n')}
${metrics.notesWithDifferences.length > 20 ? `\n...and ${metrics.notesWithDifferences.length - 20} more differences (see full report)` : ''}

## Conclusion

${metrics.v32TotalMatches > metrics.originalTotalMatches
  ? `The V3.2 refined symptom matcher identified ${metrics.v32TotalMatches - metrics.originalTotalMatches} more symptoms (${((metrics.v32TotalMatches - metrics.originalTotalMatches) / metrics.originalTotalMatches * 100).toFixed(1)}% increase) compared to the original algorithm.`
  : `The V3.2 refined symptom matcher identified ${metrics.originalTotalMatches - metrics.v32TotalMatches} fewer symptoms (${((metrics.originalTotalMatches - metrics.v32TotalMatches) / metrics.originalTotalMatches * 100).toFixed(1)}% decrease) compared to the original algorithm.`}

${metrics.negation.correctRejection > 0
  ? `The V3.2 algorithm correctly handled negation in ${metrics.negation.correctRejection}/${metrics.negation.total} test cases (${(metrics.negation.correctRejection / metrics.negation.total * 100).toFixed(1)}%).`
  : `The V3.2 algorithm did not show improvement in negation handling.`}

${metrics.context.v32CorrectContext > 0
  ? `The V3.2 algorithm correctly handled contextual references in ${metrics.context.v32CorrectContext}/${metrics.context.total} test cases (${(metrics.context.v32CorrectContext / metrics.context.total * 100).toFixed(1)}%).`
  : `The V3.2 algorithm did not show improvement in context handling.`}

Additionally, the V3.2 algorithm provides comprehensive organization capabilities that were not available in the original algorithm, categorizing symptoms by diagnosis, category, and more.
`;

  try {
    // Save report to file
    fs.writeFileSync(outputPath, reportContent);
    console.log(`Report saved to: ${outputPath}`);
    
    // Also save detailed JSON results
    const jsonPath = outputPath.replace('.md', '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
    console.log(`Detailed JSON results saved to: ${jsonPath}`);
    
    return reportContent;
  } catch (error) {
    console.error("Error saving report:", error);
    return reportContent;
  }
}

// Main function
async function main() {
  try {
    console.log("Starting Symptom Matcher Algorithm Comparison...");
    
    // Determine symptom file path
    const symptomFilePath = process.argv[2] || findMostRecentSymptomFile();
    
    // Load symptoms from file
    const symptoms = loadSymptomsFromFile(symptomFilePath);
    
    // Generate test notes
    const testNotes = generateTestNotes(symptoms, 2); // 2 notes per template type
    
    // Process notes with both algorithms
    const results = await processNotesWithBothAlgorithms(testNotes, symptoms);
    
    // Analyze results
    const metrics = analyzeResults(results);
    
    // Generate report
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const reportPath = `./reports/symptom_algorithm_comparison_${timestamp}.md`;
    
    // Ensure reports directory exists
    if (!fs.existsSync('./reports')) {
      fs.mkdirSync('./reports', { recursive: true });
    }
    
    const report = generateReport(metrics, reportPath);
    
    console.log("\n==== COMPARISON COMPLETE ====\n");
    console.log(`Total notes analyzed: ${metrics.totalNotes}`);
    console.log(`V3.0 Matches: ${metrics.originalTotalMatches}`);
    console.log(`V3.2 Matches: ${metrics.v32TotalMatches}`);
    console.log(`Improvement: ${metrics.v32TotalMatches - metrics.originalTotalMatches > 0 ? '+' : ''}${metrics.v32TotalMatches - metrics.originalTotalMatches} (${((metrics.v32TotalMatches - metrics.originalTotalMatches) / metrics.originalTotalMatches * 100).toFixed(1)}%)`);
    console.log(`Notes with differences: ${metrics.notesWithDifferences.length}`);
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error("Error in symptom matcher comparison:", error);
    process.exit(1);
  }
}

// Run the main function
main();