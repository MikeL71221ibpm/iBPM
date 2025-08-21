/**
 * Simple symptom matcher comparison script
 * 
 * This standalone script runs both symptom matchers (V3.0 and V3.2) on the same clinical note
 * and displays the differences between them.
 * 
 * Usage: node server/test-symptom-comparison.js
 */

const fs = require('fs');
const path = require('path');

// Original symptom extractor
const originalMatcher = require('./utils/symptomExtractor');

// V3.2 symptom matcher
const v32Matcher = require('./utils/symptomMatcherV3_2');

// Helper to normalize a symptom for display
function normalizeSymptom(symptom) {
  return {
    symptom_segment: symptom.symptom_segment || '(unknown)',
    symptom_id: symptom.symptom_id || 'unknown',
    category: symptom.category || symptom.diagnostic_category || 'unknown',
    diagnosis: symptom.diagnosis || 'unknown',
    confidence: symptom.confidence || 0,
  };
}

// Run a test with the given clinical note
async function runTest(noteText, sampleSymptoms) {
  console.log("\n==== SYMPTOM MATCHER COMPARISON TEST ====\n");
  
  console.log("SAMPLE CLINICAL NOTE:");
  console.log("------------------------");
  console.log(noteText);
  console.log("------------------------\n");
  
  // Format the note for processing
  const patientNote = {
    patient_id: 'test_patient',
    note_id: 'test_note_' + Date.now(),
    note_text: noteText,
    dos_date: new Date().toISOString().slice(0, 10)
  };
  
  // Process with original symptom matcher
  console.log("Running original symptom matcher (V3.0)...");
  const originalResults = await originalMatcher.extractSymptoms([patientNote], sampleSymptoms);
  
  console.log(`Found ${originalResults.length} symptoms with original matcher`);
  
  // Process with V3.2 refined symptom matcher
  console.log("\nRunning refined symptom matcher (V3.2)...");
  const refinedResults = v32Matcher.refinedSymptomMatcher(noteText, sampleSymptoms, {
    debug: true,
    preserveDuplicates: true
  });
  
  const v32Count = refinedResults.matches ? refinedResults.matches.length : 0;
  console.log(`Found ${v32Count} symptoms with V3.2 matcher`);
  
  // Create sets of symptoms for comparison
  const originalSymptoms = new Set();
  originalResults.forEach(s => originalSymptoms.add(s.symptom_segment.toLowerCase()));
  
  const v32Symptoms = new Set();
  if (refinedResults.matches) {
    refinedResults.matches.forEach(s => v32Symptoms.add(s.symptom_segment.toLowerCase()));
  }
  
  // Find unique symptoms
  const uniqueToOriginal = Array.from(originalSymptoms).filter(s => !v32Symptoms.has(s));
  const uniqueToV32 = Array.from(v32Symptoms).filter(s => !originalSymptoms.has(s));
  const shared = Array.from(originalSymptoms).filter(s => v32Symptoms.has(s));
  
  // Display comparison results
  console.log("\n==== COMPARISON RESULTS ====\n");
  console.log(`Original (V3.0): ${originalSymptoms.size} unique symptoms`);
  console.log(`Refined (V3.2): ${v32Symptoms.size} unique symptoms`);
  console.log(`Shared: ${shared.length} symptoms`);
  console.log(`Unique to original: ${uniqueToOriginal.length} symptoms`);
  console.log(`Unique to V3.2: ${uniqueToV32.length} symptoms`);
  
  const improvementCount = v32Symptoms.size - originalSymptoms.size;
  const improvementPercent = originalSymptoms.size ? 
    (improvementCount / originalSymptoms.size * 100).toFixed(1) : 0;
    
  console.log(`\nImprovement: ${improvementCount > 0 ? '+' : ''}${improvementCount} symptoms (${improvementPercent}%)`);
  
  // Display symptom details
  if (uniqueToV32.length > 0) {
    console.log("\nNEW SYMPTOMS (found by V3.2 only):");
    uniqueToV32.forEach(symptom => {
      const matchDetails = refinedResults.matches.find(m => 
        m.symptom_segment.toLowerCase() === symptom.toLowerCase());
      if (matchDetails) {
        console.log(`- ${matchDetails.symptom_segment} (Category: ${matchDetails.category || 'Unknown'}, Diagnosis: ${matchDetails.diagnosis || 'Unknown'})`);
      } else {
        console.log(`- ${symptom}`);
      }
    });
  }
  
  // Display organization if available
  if (refinedResults.organizationData) {
    console.log("\nORGANIZATION DATA (V3.2 only):");
    
    if (refinedResults.organizationData.byCategory) {
      console.log("\nBy Category:");
      Object.keys(refinedResults.organizationData.byCategory).forEach(category => {
        const count = refinedResults.organizationData.byCategory[category].length;
        console.log(`- ${category}: ${count} matches`);
      });
    }
    
    if (refinedResults.organizationData.byDiagnosis) {
      console.log("\nBy Diagnosis:");
      Object.keys(refinedResults.organizationData.byDiagnosis).forEach(diagnosis => {
        const count = refinedResults.organizationData.byDiagnosis[diagnosis].length;
        console.log(`- ${diagnosis}: ${count} matches`);
      });
    }
  }
  
  console.log("\n==== TEST COMPLETE ====");
}

// Create a sample symptoms database for testing
const sampleSymptoms = [
  { symptom_id: "1.1", symptom_segment: "Anxiety", diagnostic_category: "Mental Health", diagnosis: "Anxiety Disorder", symp_prob: "Symptom" },
  { symptom_id: "1.2", symptom_segment: "Depression", diagnostic_category: "Mental Health", diagnosis: "Depression", symp_prob: "Symptom" },
  { symptom_id: "1.3", symptom_segment: "Insomnia", diagnostic_category: "Mental Health", diagnosis: "Sleep Disorder", symp_prob: "Symptom" },
  { symptom_id: "1.4", symptom_segment: "Fatigue", diagnostic_category: "General", diagnosis: "Fatigue", symp_prob: "Symptom" },
  { symptom_id: "1.5", symptom_segment: "Headache", diagnostic_category: "Neurological", diagnosis: "Headache", symp_prob: "Symptom" },
  { symptom_id: "1.6", symptom_segment: "Difficulty concentrating", diagnostic_category: "Mental Health", diagnosis: "Cognitive Impairment", symp_prob: "Symptom" },
  { symptom_id: "1.7", symptom_segment: "Suicidal ideation", diagnostic_category: "Mental Health", diagnosis: "Suicidal Ideation", symp_prob: "Symptom" },
  { symptom_id: "1.8", symptom_segment: "Slow thinking", diagnostic_category: "Mental Health", diagnosis: "Cognitive Impairment", symp_prob: "Symptom" },
  { symptom_id: "1.9", symptom_segment: "Trouble sleeping", diagnostic_category: "Mental Health", diagnosis: "Sleep Disorder", symp_prob: "Symptom" },
];

// Sample clinical note for testing
const sampleNote = `
Patient presents today for follow-up on mental health concerns. 
The patient reports experiencing anxiety and depression that has been ongoing for several months.
Patient states having trouble sleeping, fatigue, and difficulty concentrating at work.
Patient denies suicidal ideation. Reports occasional headaches.
`;

// Run the test
runTest(sampleNote, sampleSymptoms)
  .catch(err => {
    console.error("Test failed:", err);
  });