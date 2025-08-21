/**
 * Advanced Symptom Matcher V3.2
 * 
 * A context-aware symptom matching algorithm that preserves all matches
 * while organizing them by symptom_segment, Diagnosis, Diagnostic Category,
 * and Diagnosis Code for comprehensive analysis.
 * 
 * Version: 3.2.0
 * Release Date: May 19, 2025
 */

/**
 * Normalize text for consistent processing
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identify sections in a clinical note
 * @param {string} noteText - The clinical note text
 * @returns {Array} - Identified sections
 */
function identifySections(noteText) {
  const sections = [];
  const sectionHeaders = [
    { name: 'chief_complaint', patterns: ['chief complaint:', 'cc:', 'reason for visit:'] },
    { name: 'history', patterns: ['history:', 'history of present illness:', 'hpi:', 'past medical history:', 'pmh:'] },
    { name: 'symptoms', patterns: ['symptoms:', 'subjective:', 'patient reports:'] },
    { name: 'physical_exam', patterns: ['physical exam:', 'examination:', 'pe:'] },
    { name: 'assessment', patterns: ['assessment:', 'impression:', 'diagnosis:'] },
    { name: 'plan', patterns: ['plan:', 'treatment plan:', 'recommendations:'] },
    { name: 'medication', patterns: ['medications:', 'meds:', 'current medications:'] },
    { name: 'allergies', patterns: ['allergies:', 'drug allergies:'] }
  ];
  
  // Find all potential section starts
  const sectionStarts = [];
  
  for (const header of sectionHeaders) {
    for (const pattern of header.patterns) {
      let index = noteText.indexOf(pattern);
      while (index !== -1) {
        sectionStarts.push({
          index,
          name: header.name,
          pattern
        });
        index = noteText.indexOf(pattern, index + 1);
      }
    }
  }
  
  // Sort section starts by index
  sectionStarts.sort((a, b) => a.index - b.index);
  
  // If no sections were found, return an empty array
  if (sectionStarts.length === 0) {
    return [];
  }
  
  // Define sections based on identified headers
  for (let i = 0; i < sectionStarts.length; i++) {
    const currentSection = sectionStarts[i];
    const nextSection = sectionStarts[i + 1];
    
    const startIndex = currentSection.index + currentSection.pattern.length;
    const endIndex = nextSection ? nextSection.index : noteText.length;
    
    sections.push({
      type: currentSection.name,
      text: noteText.substring(startIndex, endIndex).trim(),
      startIndex,
      endIndex
    });
  }
  
  return sections;
}

/**
 * Extract explicitly reported symptoms
 * @param {string} noteText - Clinical note text
 * @returns {Array} - Extracted symptom lists
 */
function extractExplicitSymptoms(noteText) {
  const explicitLists = [];
  
  // Regular expressions to match common reporting patterns
  const patterns = [
    {
      // "The patient reports X, Y, and Z"
      regex: /(?:patient|client)\s+(?:reports?|complains of|presents with|states?)\s+([^.]+?)(?:\.|\n|$)/gi,
      context: 'patient_report'
    },
    {
      // "Reports experiencing X, Y, and Z"
      regex: /reports?\s+(?:experiencing|having|with)\s+([^.]+?)(?:\.|\n|$)/gi,
      context: 'report_experiencing'
    },
    {
      // "Symptoms include X, Y, and Z"
      regex: /symptoms?\s+(?:include|consist of|are|is)\s+([^.]+?)(?:\.|\n|$)/gi,
      context: 'symptom_list'
    },
    {
      // "Presents with X, Y, and Z"
      regex: /presents?\s+with\s+([^.]+?)(?:\.|\n|$)/gi,
      context: 'presents_with'
    }
  ];
  
  // Extract symptoms using each pattern
  for (const pattern of patterns) {
    const matches = [...noteText.matchAll(pattern.regex)];
    
    for (const match of matches) {
      const symptomText = match[1];
      
      // Skip if no symptom text was found
      if (!symptomText) continue;
      
      // Split on commas and conjunctions
      const symptoms = symptomText
        .split(/,\s*|\s+and\s+|\s+or\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      if (symptoms.length > 0) {
        explicitLists.push({
          context: pattern.context,
          rawText: symptomText,
          symptoms
        });
      }
    }
  }
  
  return explicitLists;
}

/**
 * Check if a symptom is negated in the surrounding context
 * @param {string} context - Text containing the symptom
 * @param {string} symptom - Symptom text to check
 * @returns {boolean} - True if negated, false otherwise
 */
function checkForNegation(context, symptom) {
  // Find the symptom in the context
  const symptomIndex = context.indexOf(symptom);
  if (symptomIndex === -1) return false;
  
  // Extract the text before the symptom (limited window)
  const beforeSymptom = context.substring(Math.max(0, symptomIndex - 50), symptomIndex);
  
  // Common negation phrases
  const negationPhrases = [
    'no ', 'not ', 'denies', 'denied', 'negative for', 'without', 
    'absent', "doesn't have", 'does not have', 'rules out', 'ruled out'
  ];
  
  // Check if any negation phrase appears in the window before the symptom
  for (const phrase of negationPhrases) {
    if (beforeSymptom.includes(phrase)) {
      // CRITICAL IMPROVEMENT: Don't consider it negated if it follows a reporting phrase
      const reportingPhrases = [
        'reports', 'reported', 'complains of', 'presents with', 
        'experiencing', 'having', 'endorsed', 'stated'
      ];
      
      // Check if there's a reporting phrase between the negation and the symptom
      for (const reportPhrase of reportingPhrases) {
        const negIndex = beforeSymptom.lastIndexOf(phrase);
        const reportIndex = beforeSymptom.lastIndexOf(reportPhrase);
        
        // If reporting phrase appears after negation, symptom is not negated
        if (reportIndex > negIndex) {
          return false;
        }
      }
      
      return true;
    }
  }
  
  return false;
}

/**
 * Organize matched symptoms into different categorizations
 * @param {Array} matches - Matched symptoms
 * @returns {Object} - Organized results
 */
function organizeSymptomMatches(matches) {
  const bySymptomSegment = {};
  const byDiagnosis = {};
  const byCategory = {};
  const byDiagnosisCode = {};
  
  // Process each match
  for (const match of matches) {
    // Organize by symptom segment
    const symptomKey = match.symptom_segment || 'Unknown';
    if (!bySymptomSegment[symptomKey]) {
      bySymptomSegment[symptomKey] = [];
    }
    bySymptomSegment[symptomKey].push(match);
    
    // Organize by diagnosis
    const diagnosisKey = match.diagnosis || 'Unknown';
    if (!byDiagnosis[diagnosisKey]) {
      byDiagnosis[diagnosisKey] = [];
    }
    byDiagnosis[diagnosisKey].push(match);
    
    // Organize by category
    const categoryKey = match.category || 'Unknown';
    if (!byCategory[categoryKey]) {
      byCategory[categoryKey] = [];
    }
    byCategory[categoryKey].push(match);
    
    // Organize by diagnosis code
    const codeKey = match.diagnosisCode || 'Unknown';
    if (!byDiagnosisCode[codeKey]) {
      byDiagnosisCode[codeKey] = [];
    }
    byDiagnosisCode[codeKey].push(match);
  }
  
  return {
    bySymptomSegment,
    byDiagnosis,
    byCategory,
    byDiagnosisCode
  };
}

/**
 * Refined symptom matcher with comprehensive organization
 * 
 * @param {string} noteText - Clinical note text
 * @param {Array} symptomDatabase - Reference database of symptoms
 * @param {Object} options - Configuration options
 * @returns {Object} - Matched symptoms with organizational metadata
 */
function refinedSymptomMatcher(noteText, symptomDatabase, options = {}) {
  // Default options
  const config = {
    considerNegation: true,
    useWordBoundaries: true,
    detectSectionHeaders: true,
    minSymptomLength: 3,
    debugMode: false,
    ...options
  };
  
  // Initialize results
  const matches = [];
  const matchedIds = new Set();
  const sections = [];
  const debugInfo = config.debugMode ? { processingSteps: [] } : null;
  
  // Skip processing if inputs are invalid
  if (!noteText || typeof noteText !== 'string' || !symptomDatabase || !Array.isArray(symptomDatabase)) {
    if (debugInfo) debugInfo.processingSteps.push('Invalid input, skipping processing');
    return { matches, organizedResults: {}, debugInfo };
  }
  
  // First step: Clean and normalize the note text
  const normalizedText = normalizeText(noteText);
  if (debugInfo) debugInfo.processingSteps.push(`Normalized text: "${normalizedText.substring(0, 100)}..."`);
  
  // Second step: Identify sections in the note
  if (config.detectSectionHeaders) {
    const identifiedSections = identifySections(normalizedText);
    sections.push(...identifiedSections);
    if (debugInfo) debugInfo.processingSteps.push(`Identified ${sections.length} sections`);
  }
  
  // Third step: Extract explicit symptom lists
  const explicitSymptoms = extractExplicitSymptoms(normalizedText);
  if (debugInfo) {
    debugInfo.processingSteps.push(`Extracted explicit symptoms: ${JSON.stringify(explicitSymptoms)}`);
    debugInfo.explicitSymptoms = explicitSymptoms;
  }
  
  // Fourth step: Process each section for symptoms
  // If no sections were found, treat the entire note as one section
  if (sections.length === 0) {
    sections.push({ 
      type: 'default', 
      text: normalizedText, 
      startIndex: 0, 
      endIndex: normalizedText.length 
    });
  }
  
  // Process symptoms by section context
  for (const section of sections) {
    // Skip sections unlikely to contain symptom reports
    if (section.type === 'medication' || section.type === 'plan' || section.type === 'allergies') {
      continue;
    }
    
    const sectionText = section.text;
    const sectionType = section.type;
    
    if (debugInfo) debugInfo.processingSteps.push(`Processing section type: ${sectionType}`);
    
    // Process symptoms in this section
    for (const symptom of symptomDatabase) {
      const symptomText = symptom.symptom_segment;
      
      // Skip invalid or already matched symptoms
      if (!symptomText || typeof symptomText !== 'string' || 
          symptomText.length < config.minSymptomLength ||
          matchedIds.has(symptom.symptom_id)) {
        continue;
      }
      
      const normalizedSymptom = symptomText.toLowerCase();
      
      // Check if the symptom is in the explicit list
      // These are highest confidence matches
      let explicitMatch = false;
      for (const list of explicitSymptoms) {
        if (list.symptoms.some(s => s.toLowerCase().includes(normalizedSymptom) || 
                               normalizedSymptom.includes(s.toLowerCase()))) {
          matches.push({
            symptom_id: symptom.symptom_id,
            symptom_segment: symptom.symptom_segment,
            category: symptom.diagnostic_category || 'Unknown',
            diagnosis: symptom.diagnosis || 'Unknown',
            diagnosisCode: symptom.symptom_id ? symptom.symptom_id.split('.')[0] : 'Unknown',
            symp_prob: symptom.symp_prob || 'Symptom',
            confidence: 0.98,
            match_type: 'explicit_symptom_list',
            section_type: sectionType,
            reporting_context: list.context,
            negated: false,
            // Support for note processing fields
            extraction_version: 'v3.2',
            extraction_method: 'context_aware_matching'
          });
          
          matchedIds.add(symptom.symptom_id);
          explicitMatch = true;
          break;
        }
      }
      
      // Skip to next symptom if we already found this one in an explicit list
      if (explicitMatch) continue;
      
      // Standard full-text search with word boundaries if enabled
      let found = false;
      
      if (config.useWordBoundaries) {
        // Use safe regex with word boundaries
        try {
          const safeSymptomText = normalizedSymptom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const boundaryRegex = new RegExp(`\\b${safeSymptomText}\\b`, 'i');
          
          if (boundaryRegex.test(sectionText)) {
            found = true;
          }
        } catch (e) {
          // If regex fails, fall back to simple includes
          if (sectionText.includes(normalizedSymptom)) {
            found = true;
          }
        }
      } else {
        // Simple substring search
        if (sectionText.includes(normalizedSymptom)) {
          found = true;
        }
      }
      
      if (found) {
        // Check for negation if enabled
        const isNegated = config.considerNegation ? 
                          checkForNegation(sectionText, normalizedSymptom) : 
                          false;
        
        // Skip negated symptoms
        if (isNegated) continue;
        
        matches.push({
          symptom_id: symptom.symptom_id,
          symptom_segment: symptom.symptom_segment,
          category: symptom.diagnostic_category || 'Unknown',
          diagnosis: symptom.diagnosis || 'Unknown',
          diagnosisCode: symptom.symptom_id ? symptom.symptom_id.split('.')[0] : 'Unknown',
          symp_prob: symptom.symp_prob || 'Symptom',
          confidence: 0.92,
          match_type: 'section_context_match',
          section_type: sectionType,
          negated: false,
          // Support for note processing fields
          extraction_version: 'v3.2',
          extraction_method: 'context_aware_matching'
        });
        
        matchedIds.add(symptom.symptom_id);
      }
    }
  }
  
  // Organize results by different dimensions
  const organizedResults = organizeSymptomMatches(matches);
  
  // Final step: Check if we need to return debug info
  if (config.debugMode) {
    debugInfo.matchCount = matches.length;
    debugInfo.sections = sections.map(s => ({ type: s.type, length: s.text.length }));
    debugInfo.organizationSummary = {
      bySymptomSegment: Object.keys(organizedResults.bySymptomSegment).length,
      byDiagnosis: Object.keys(organizedResults.byDiagnosis).length,
      byCategory: Object.keys(organizedResults.byCategory).length,
      byDiagnosisCode: Object.keys(organizedResults.byDiagnosisCode).length
    };
    return { matches, organizedResults, debugInfo };
  }
  
  return { matches, organizedResults };
}

// Export all functions for use in server code using ES modules
export {
  refinedSymptomMatcher,
  normalizeText,
  checkForNegation,
  identifySections,
  extractExplicitSymptoms,
  organizeSymptomMatches
};