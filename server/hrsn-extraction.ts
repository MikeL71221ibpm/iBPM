/**
 * Enhanced HRSN Extraction Algorithm
 * 
 * This module extends the existing symptom extraction to automatically identify
 * HRSN (Health-Related Social Needs) indicators in clinical notes and map them
 * to the 33 categorical HRSN columns for comprehensive social determinant tracking.
 */

// HRSN Category Mapping - Defines keywords and patterns for each HRSN category
export const HRSN_CATEGORIES = {
  financial_status: [
    'financial difficulty', 'money problems', 'financial stress', 'can\'t afford',
    'unable to pay', 'financial hardship', 'poverty', 'low income', 'broke',
    'financial strain', 'economic hardship', 'debt', 'bankruptcy'
  ],
  
  transportation: [
    'transportation issues', 'no car', 'no vehicle', 'can\'t get to', 'transportation barriers',
    'no ride', 'bus problems', 'transportation difficulties', 'mobility issues',
    'unable to travel', 'no transportation', 'transport problems'
  ],
  
  has_a_car: [
    'has car', 'owns vehicle', 'drives own car', 'personal vehicle', 'own transportation',
    'has vehicle', 'car owner', 'vehicle available'
  ],
  
  access_to_health_care: [
    'no insurance', 'can\'t access healthcare', 'healthcare barriers', 'no doctor',
    'unable to see doctor', 'healthcare access', 'medical access', 'no medical care',
    'insurance problems', 'coverage issues', 'uninsured', 'underinsured'
  ],
  
  clothing: [
    'inadequate clothing', 'no warm clothes', 'clothing needs', 'insufficient clothing',
    'lacks clothing', 'clothing problems', 'clothes needed', 'clothing insecurity'
  ],
  
  disabilities: [
    'disability', 'disabled', 'handicapped', 'mobility impairment', 'physical limitation',
    'sensory impairment', 'cognitive disability', 'developmental disability',
    'functional limitation', 'accessibility needs'
  ],
  
  education: [
    'education problems', 'school issues', 'learning difficulties', 'illiterate',
    'reading problems', 'education barriers', 'school dropout', 'educational needs',
    'literacy issues', 'learning disabilities'
  ],
  
  employment: [
    'unemployed', 'job loss', 'employment issues', 'work problems', 'lost job',
    'no job', 'workplace issues', 'employment barriers', 'job stress',
    'work difficulties', 'career problems', 'unemployment'
  ],
  
  family_and_community_support: [
    'family problems', 'no support', 'social isolation', 'family conflict',
    'lack of support', 'community problems', 'family issues', 'social problems',
    'relationship difficulties', 'family stress', 'social needs'
  ],
  
  finances_financial_stress: [
    'financial stress', 'money worries', 'financial anxiety', 'economic stress',
    'financial pressure', 'money stress', 'financial concerns', 'budget problems'
  ],
  
  finances_income_poverty: [
    'low income', 'poverty', 'poor', 'income problems', 'financial need',
    'economic disadvantage', 'income insecurity', 'below poverty line'
  ],
  
  financial_strain: [
    'financial strain', 'economic burden', 'financial burden', 'money strain',
    'financial pressure', 'economic strain', 'financial difficulty'
  ],
  
  food_insecurity: [
    'food insecurity', 'hungry', 'no food', 'can\'t afford food', 'food problems',
    'lack of food', 'food access', 'nutritional needs', 'food assistance',
    'food pantry', 'food stamps', 'SNAP benefits', 'meal problems'
  ],
  
  general_non_specific: [
    'social needs', 'social problems', 'social issues', 'life problems',
    'social determinants', 'social circumstances', 'life circumstances'
  ],
  
  homelessness: [
    'homeless', 'no home', 'living on street', 'shelter', 'homelessness',
    'without housing', 'sleeping rough', 'no place to live', 'transient'
  ],
  
  housing_instability: [
    'housing unstable', 'temporary housing', 'couch surfing', 'moving frequently',
    'housing insecurity', 'unstable housing', 'housing problems', 'eviction',
    'housing stress', 'temporary shelter'
  ],
  
  housing_housing_instability_insecurity: [
    'housing issues', 'housing problems', 'housing insecurity', 'housing instability',
    'housing stress', 'housing difficulties', 'housing concerns'
  ],
  
  housing_poor_housing_quality_inadequate_housing: [
    'poor housing', 'inadequate housing', 'substandard housing', 'housing quality',
    'unsafe housing', 'overcrowded', 'housing conditions', 'housing problems'
  ],
  
  immigration_migration: [
    'immigrant', 'immigration issues', 'language barriers', 'undocumented',
    'migration problems', 'visa issues', 'citizenship problems', 'cultural barriers'
  ],
  
  inadequate_housing: [
    'inadequate housing', 'poor housing conditions', 'housing inadequate',
    'substandard housing', 'housing quality issues'
  ],
  
  incarceration: [
    'incarcerated', 'jail', 'prison', 'criminal justice', 'legal problems',
    'court issues', 'probation', 'parole', 'arrest', 'detention'
  ],
  
  mental_health: [
    'depression', 'anxiety', 'mental health', 'psychological', 'psychiatric',
    'emotional problems', 'mental illness', 'psychological distress',
    'mental health issues', 'emotional stress'
  ],
  
  physical_activity: [
    'sedentary', 'no exercise', 'physical inactivity', 'activity problems',
    'exercise barriers', 'mobility issues', 'physical limitations'
  ],
  
  primary_language: [
    'language barriers', 'English problems', 'language difficulties',
    'communication problems', 'interpreter needed', 'language issues'
  ],
  
  race_ethnicity: [
    'discrimination', 'racial issues', 'ethnic problems', 'cultural barriers',
    'prejudice', 'bias', 'racial stress', 'ethnic discrimination'
  ],
  
  safety_child_abuse: [
    'child abuse', 'child neglect', 'child safety', 'child protection',
    'family violence', 'child endangerment', 'child welfare'
  ],
  
  safety_general_safety: [
    'safety concerns', 'unsafe environment', 'safety issues', 'security problems',
    'danger', 'safety risks', 'personal safety', 'environmental safety'
  ],
  
  safety_intimate_partner_violence: [
    'domestic violence', 'intimate partner violence', 'domestic abuse',
    'partner abuse', 'relationship violence', 'IPV', 'abusive relationship'
  ],
  
  safety_neighborhood_safety: [
    'neighborhood safety', 'community safety', 'area unsafe', 'crime problems',
    'violent neighborhood', 'unsafe area', 'community violence'
  ],
  
  sheltered_homelessness: [
    'shelter', 'homeless shelter', 'emergency shelter', 'transitional housing',
    'sheltered homeless', 'staying in shelter'
  ],
  
  social_connections_isolation: [
    'social isolation', 'lonely', 'no friends', 'social problems', 'isolated',
    'alone', 'social support', 'loneliness', 'social disconnection'
  ],
  
  stress: [
    'stress', 'stressed', 'overwhelmed', 'pressure', 'tension', 'stressful',
    'life stress', 'chronic stress', 'emotional stress'
  ],
  
  substance_use: [
    'substance abuse', 'drug use', 'alcohol problems', 'addiction', 'substance use',
    'drinking problems', 'drug abuse', 'chemical dependency', 'substance issues'
  ],
  
  transportation_insecurity: [
    'transportation insecurity', 'unreliable transportation', 'transportation access',
    'transport barriers', 'mobility barriers', 'transportation challenges'
  ],
  
  unsheltered_homelessness: [
    'unsheltered', 'sleeping outside', 'living on streets', 'rough sleeping',
    'outdoor sleeping', 'street homeless', 'living rough'
  ],
  
  utility_insecurity: [
    'utility problems', 'no electricity', 'no heat', 'utility shut off',
    'energy insecurity', 'utility bills', 'power problems', 'heating problems'
  ],
  
  veteran_status: [
    'veteran', 'military service', 'armed forces', 'military background',
    'combat veteran', 'service member', 'military history'
  ]
};

/**
 * Enhanced HRSN Extraction Function
 * Analyzes note text for HRSN indicators and returns categorized findings
 */
export function extractHrsnFromNote(noteText: string): Record<string, string> {
  const hrsnFindings: Record<string, string> = {};
  const lowerCaseText = noteText.toLowerCase();
  
  // Iterate through each HRSN category and check for keyword matches
  for (const [category, keywords] of Object.entries(HRSN_CATEGORIES)) {
    let foundMatch = false;
    
    for (const keyword of keywords) {
      if (lowerCaseText.includes(keyword.toLowerCase())) {
        foundMatch = true;
        break;
      }
    }
    
    // If any keyword match is found, mark this category as "Yes"
    if (foundMatch) {
      hrsnFindings[category] = 'Yes';
    }
  }
  
  return hrsnFindings;
}

/**
 * Enhanced Symptom Extraction with HRSN Analysis
 * Combines existing symptom extraction with HRSN categorization
 */
export function enhancedSymptomExtraction(noteText: string, existingSymptoms: any[] = []): {
  symptoms: any[];
  hrsnFindings: Record<string, string>;
} {
  // Extract HRSN indicators from the note text
  const hrsnFindings = extractHrsnFromNote(noteText);
  
  // Return both existing symptom data and new HRSN findings
  return {
    symptoms: existingSymptoms,
    hrsnFindings
  };
}

/**
 * Merge HRSN data with existing CSV data
 * Preserves existing HRSN data while adding new findings from note analysis
 */
export function mergeHrsnData(csvHrsnData: Record<string, any>, extractedHrsnData: Record<string, string>): Record<string, any> {
  const mergedData: Record<string, any> = { ...csvHrsnData };
  
  // Only add extracted HRSN findings if no existing data is present
  for (const [category, value] of Object.entries(extractedHrsnData)) {
    if (!mergedData[category] || mergedData[category] === '' || mergedData[category] === null) {
      mergedData[category] = value;
    }
  }
  
  return mergedData;
}

/**
 * Process a batch of notes with enhanced HRSN extraction
 */
export async function processNotesWithHrsnExtraction(notes: any[]): Promise<any[]> {
  const processedNotes = [];
  
  for (const note of notes) {
    const { symptoms, hrsnFindings } = enhancedSymptomExtraction(note.noteText, note.symptoms || []);
    
    processedNotes.push({
      ...note,
      symptoms,
      hrsnFindings
    });
  }
  
  return processedNotes;
}