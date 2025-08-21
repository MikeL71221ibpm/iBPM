/**
 * Quick Symptom Matcher - Simple and Working
 * 
 * This is a straightforward symptom matching function that works reliably
 * without the complex debugging that was causing crashes.
 */

function quickSymptomMatcher(noteText, symptomDatabase) {
  // Ensure we have valid inputs
  if (!noteText || typeof noteText !== 'string' || !symptomDatabase || !Array.isArray(symptomDatabase)) {
    return [];
  }
  
  const matches = [];
  const normalizedText = noteText.toLowerCase();
  
  // Simple, reliable matching
  for (const symptom of symptomDatabase) {
    if (symptom.symptom_segment && typeof symptom.symptom_segment === 'string') {
      const symptomText = symptom.symptom_segment.toLowerCase();
      
      if (normalizedText.includes(symptomText)) {
        matches.push({
          symptom_segment: symptom.symptom_segment,
          diagnosis: symptom.Diagnosis || 'Unknown',
          diagnostic_category: symptom.DiagnosticCategory || 'Unknown',
          icd10_code: symptom.DiagnosisCode || 'Unknown',
          confidence: 1.0,
          position: normalizedText.indexOf(symptomText)
        });
      }
    }
  }
  
  return matches;
}

export { quickSymptomMatcher };