import { InsertExtractedSymptom } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// HRSN Categories - Complete list for comprehensive disparity analysis
const HRSN_CATEGORIES = [
  'access_to_health_care',
  'clothing',
  'disabilities',
  'education',
  'employment',
  'family_and_community_support',
  'finances_financial_stress',
  'finances_income_poverty',
  'financial_strain',
  'food_insecurity',
  'general_non_specific',
  'has_a_car',
  'homelessness',
  'housing_housing_instability_insecurity',
  'housing_poor_housing_quality_inadequate_housing',
  'immigration_migration',
  'incarceration',
  'mental_health',
  'physical_activity',
  'primary_language',
  'safety_child_abuse',
  'safety_general_safety',
  'safety_intimate_partner_violence',
  'safety_neighborhood_safety',
  'sheltered_homelessness',
  'social_connections_isolation',
  'stress',
  'substance_use',
  'transportation',
  'transportation_insecurity',
  'unsheltered_homelessness',
  'utility_insecurity',
  'veteran_status'
];

// HRSN Keywords mapped to categories - using same pattern as symptom extraction
const HRSN_KEYWORDS: Record<string, string[]> = {
  'access_to_health_care': [
    'healthcare access', 'medical care', 'insurance', 'health insurance', 'uninsured',
    'medicaid', 'medicare', 'clinic access', 'specialist access', 'prescription access',
    'healthcare cost', 'medical cost', 'cannot afford', 'delayed care', 'missed appointment'
  ],
  'clothing': [
    'clothing', 'clothes', 'apparel', 'garments', 'wardrobe', 'outfit',
    'need clothes', 'lack clothing', 'winter clothes', 'work clothes'
  ],
  'disabilities': [
    'disability', 'disabled', 'handicap', 'impairment', 'mobility', 'wheelchair',
    'blind', 'deaf', 'cognitive', 'intellectual disability', 'developmental delay',
    'autism', 'adhd', 'learning disability'
  ],
  'education': [
    'education', 'school', 'college', 'university', 'diploma', 'ged', 'degree',
    'literacy', 'reading', 'writing', 'math skills', 'dropout', 'graduation',
    'educational attainment', 'academic'
  ],
  'employment': [
    'employment', 'job', 'work', 'career', 'occupation', 'unemployed', 'jobless',
    'fired', 'laid off', 'workless', 'seeking work', 'job search', 'interview',
    'workplace', 'employer', 'income from work'
  ],
  'family_and_community_support': [
    'family support', 'community support', 'social support', 'relatives', 'friends',
    'neighbors', 'church', 'congregation', 'support group', 'social network',
    'isolated', 'alone', 'lonely'
  ],
  'finances_financial_stress': [
    'financial stress', 'money stress', 'financial worry', 'financial anxiety',
    'money problems', 'financial burden', 'debt stress', 'bill stress',
    'financial pressure', 'economic stress'
  ],
  'finances_income_poverty': [
    'poverty', 'poor', 'low income', 'financial hardship', 'broke', 'bankrupt',
    'welfare', 'food stamps', 'snap', 'tanf', 'ssi', 'ssdi', 'social security',
    'government assistance', 'public assistance'
  ],
  'financial_strain': [
    'financial strain', 'money tight', 'financial difficulty', 'cash flow',
    'budget', 'savings', 'debt', 'bills', 'expenses', 'cost', 'afford',
    'financial crisis', 'economic hardship'
  ],
  'food_insecurity': [
    'food insecurity', 'hunger', 'hungry', 'starving', 'malnutrition', 'food stamps',
    'snap', 'food bank', 'food pantry', 'meals on wheels', 'free lunch',
    'cannot afford food', 'skip meals', 'food shortage'
  ],
  'general_non_specific': [
    'social determinant', 'social issue', 'life stress', 'personal problem',
    'family issue', 'social problem', 'life challenge', 'hardship'
  ],
  'has_a_car': [
    'car', 'vehicle', 'automobile', 'truck', 'van', 'transportation',
    'reliable car', 'own car', 'family car', 'personal vehicle'
  ],
  'homelessness': [
    'homeless', 'homelessness', 'without home', 'no home', 'street',
    'living on street', 'rough sleeping', 'couch surfing', 'transient'
  ],
  'housing_housing_instability_insecurity': [
    'housing instability', 'housing insecurity', 'eviction', 'foreclosure',
    'rent behind', 'housing crisis', 'temporary housing', 'unstable housing',
    'housing stress', 'moving frequently'
  ],
  'housing_poor_housing_quality_inadequate_housing': [
    'poor housing', 'inadequate housing', 'substandard housing', 'housing quality',
    'mold', 'leaks', 'pests', 'unsafe housing', 'overcrowded', 'no heat',
    'no hot water', 'housing conditions'
  ],
  'immigration_migration': [
    'immigration', 'immigrant', 'migration', 'migrant', 'refugee', 'asylum',
    'undocumented', 'deportation', 'visa', 'green card', 'citizenship',
    'naturalization', 'border'
  ],
  'incarceration': [
    'incarceration', 'prison', 'jail', 'arrested', 'convicted', 'criminal justice',
    'probation', 'parole', 'legal trouble', 'court', 'charges', 'sentence'
  ],
  'mental_health': [
    'depression', 'anxiety', 'mental health', 'psychiatric', 'therapy',
    'counseling', 'medication', 'suicidal', 'bipolar', 'schizophrenia',
    'ptsd', 'trauma', 'stress', 'emotional', 'psychological'
  ],
  'physical_activity': [
    'exercise', 'physical activity', 'fitness', 'sports', 'gym', 'walking',
    'running', 'sedentary', 'inactive', 'physical fitness'
  ],
  'primary_language': [
    'language', 'english', 'spanish', 'interpreter', 'translation', 'bilingual',
    'language barrier', 'communication', 'speak english', 'native language'
  ],
  'safety_child_abuse': [
    'child abuse', 'child neglect', 'child protection', 'cps', 'foster care',
    'child welfare', 'physical abuse', 'sexual abuse', 'emotional abuse'
  ],
  'safety_general_safety': [
    'safety', 'safe', 'danger', 'dangerous', 'threat', 'violence', 'crime',
    'assault', 'robbery', 'burglary', 'personal safety'
  ],
  'safety_intimate_partner_violence': [
    'domestic violence', 'intimate partner violence', 'abusive relationship',
    'domestic abuse', 'partner abuse', 'spousal abuse', 'dv', 'ipv'
  ],
  'safety_neighborhood_safety': [
    'neighborhood safety', 'community safety', 'gang', 'drug activity',
    'crime rate', 'unsafe neighborhood', 'violence in area'
  ],
  'sheltered_homelessness': [
    'shelter', 'homeless shelter', 'transitional housing', 'emergency housing',
    'temporary shelter', 'staying in shelter'
  ],
  'social_connections_isolation': [
    'social isolation', 'lonely', 'alone', 'isolated', 'no friends',
    'social connection', 'community connection', 'social network'
  ],
  'stress': [
    'stress', 'stressed', 'overwhelmed', 'pressure', 'tension', 'anxiety',
    'worry', 'burden', 'strain'
  ],
  'substance_use': [
    'alcohol', 'drug', 'substance', 'addiction', 'alcoholism', 'drinking',
    'cocaine', 'heroin', 'marijuana', 'prescription drug', 'opioid',
    'abuse', 'dependency', 'recovery', 'sobriety'
  ],
  'transportation': [
    'transportation', 'transport', 'bus', 'subway', 'taxi', 'uber', 'lyft',
    'public transit', 'ride', 'travel', 'getting around'
  ],
  'transportation_insecurity': [
    'transportation insecurity', 'no transportation', 'cannot get around',
    'transportation barrier', 'mobility issue', 'stranded'
  ],
  'unsheltered_homelessness': [
    'unsheltered', 'sleeping outside', 'living outdoors', 'rough sleeping',
    'street sleeping', 'tent', 'camp'
  ],
  'utility_insecurity': [
    'utility', 'electricity', 'gas', 'water', 'heat', 'air conditioning',
    'utility bill', 'shut off', 'disconnected', 'no power', 'no heat'
  ],
  'veteran_status': [
    'veteran', 'military', 'army', 'navy', 'air force', 'marines',
    'service member', 'combat', 'deployment', 'va', 'veterans affairs'
  ]
};

// Type for notes to process
type Note = {
  id: number;
  patientId: string;
  dosDate: string;
  noteText: string;
  providerId: string | null;
};

// Progress callback type
type ProgressCallback = (progress: number, message: string) => void;

/**
 * Extract HRSN data using the same proven algorithm as symptom extraction
 * This ensures consistent data quality across all analytics
 */
export async function extractHrsnParallel(
  notes: Note[],
  userId: number | null = null,
  progressCallback?: ProgressCallback,
  boostMode: boolean = false
): Promise<InsertExtractedSymptom[]> {
  // If we have very few notes, don't bother with chunking
  if (notes.length < 10) {
    return extractHrsnInCurrentThread(notes, userId, progressCallback, boostMode);
  }

  const startTime = Date.now();
  const cpuCount = os.cpus().length;
  
  // Define number of chunks based on CPU count and boost mode
  const chunkCount = boostMode 
    ? Math.min(16, Math.max(2, cpuCount * 2)) // Ultra-boost: use 2x CPU cores for maximum parallelization
    : Math.min(4, Math.max(1, cpuCount - 1));
  console.log(`Starting HRSN extraction with ${chunkCount} chunks for ${notes.length} notes${boostMode ? ' (ULTRA-BOOST MODE)' : ''}...`);
  
  // Split notes into chunks
  const chunkSize = Math.ceil(notes.length / chunkCount);
  const chunks: Note[][] = [];
  
  for (let i = 0; i < notes.length; i += chunkSize) {
    chunks.push(notes.slice(i, i + chunkSize));
  }
  
  if (progressCallback) {
    progressCallback(0, `Processing ${notes.length} notes in ${chunkCount} parallel chunks...`);
  }

  // Process all chunks in parallel
  const results = await Promise.all(
    chunks.map(async (chunk, index) => {
      console.log(`Starting HRSN extraction chunk ${index + 1}/${chunkCount} with ${chunk.length} notes...`);
      return extractHrsnInCurrentThread(chunk, userId, (chunkProgress, message) => {
        const overallProgress = ((index + chunkProgress / 100) / chunkCount) * 100;
        if (progressCallback) {
          progressCallback(overallProgress, `Chunk ${index + 1}/${chunkCount}: ${message}`);
        }
      }, boostMode);
    })
  );

  // Combine results from all chunks
  const allExtractedHrsn = results.flat();
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`HRSN extraction completed: ${allExtractedHrsn.length} HRSN entries extracted from ${notes.length} notes in ${duration.toFixed(2)}s`);
  
  if (progressCallback) {
    progressCallback(100, `HRSN extraction complete: ${allExtractedHrsn.length} entries extracted`);
  }

  return allExtractedHrsn;
}

/**
 * Extract HRSN data in the current thread - uses same algorithm as symptom extraction
 */
function extractHrsnInCurrentThread(
  notes: Note[],
  userId: number | null = null,
  progressCallback?: ProgressCallback,
  boostMode: boolean = false
): Promise<InsertExtractedSymptom[]> {
  return new Promise((resolve) => {
    const extractedHrsn: InsertExtractedSymptom[] = [];
    let processedCount = 0;

    notes.forEach((note) => {
      // Extract HRSN data from note text using keyword matching
      const hrsnData = extractHrsnFromText(note.noteText);
      
      hrsnData.forEach((hrsn) => {
        extractedHrsn.push({
          id: uuidv4(),
          patientId: parseInt(note.patientId.toString()),
          dosDate: note.dosDate,
          providerId: note.providerId,
          symptomSegment: hrsn.category, // Store HRSN category in symptom field for compatibility
          symptomText: hrsn.text,
          diagnosis: `HRSN: ${hrsn.category}`,
          diagnosticCategory: 'Social Determinants of Health',
          userId: userId,
          extractedAt: new Date()
        });
      });

      processedCount++;
      if (progressCallback && processedCount % 100 === 0) {
        const progress = (processedCount / notes.length) * 100;
        progressCallback(progress, `Processed ${processedCount}/${notes.length} notes for HRSN extraction`);
      }
    });

    resolve(extractedHrsn);
  });
}

/**
 * Extract HRSN data from clinical note text using keyword matching
 * Uses the same proven algorithm as symptom extraction for consistency
 */
function extractHrsnFromText(noteText: string): { category: string; text: string }[] {
  const extractedHrsn: { category: string; text: string }[] = [];
  const lowerText = noteText.toLowerCase();
  
  // Check each HRSN category for keyword matches
  for (const [category, keywords] of Object.entries(HRSN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        // Extract context around the keyword (same as symptom extraction)
        const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
        const start = Math.max(0, keywordIndex - 50);
        const end = Math.min(noteText.length, keywordIndex + keyword.length + 50);
        const context = noteText.substring(start, end).trim();
        
        extractedHrsn.push({
          category: category,
          text: context
        });
        
        // Only extract one instance per category per note to avoid duplicates
        break;
      }
    }
  }
  
  return extractedHrsn;
}

/**
 * Get all HRSN categories for reference
 */
export function getHrsnCategories(): string[] {
  return HRSN_CATEGORIES;
}

/**
 * Get HRSN keywords for a specific category
 */
export function getHrsnKeywords(category: string): string[] {
  return HRSN_KEYWORDS[category] || [];
}