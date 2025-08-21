/**
 * Age Categorization Utilities
 * Supports both ONC standard categories and research/population health categories
 */

export type AgeCategoryType = 'onc' | 'research';

export interface AgeCategory {
  id: string;
  label: string;
  minAge: number;
  maxAge: number | null; // null for "85+" style categories
}

// ONC Standard Age Categories (Healthcare Regulatory)
export const ONC_AGE_CATEGORIES: AgeCategory[] = [
  { id: 'onc_0_4', label: '0–4 years', minAge: 0, maxAge: 4 },
  { id: 'onc_5_17', label: '5–17 years', minAge: 5, maxAge: 17 },
  { id: 'onc_18_64', label: '18–64 years', minAge: 18, maxAge: 64 },
  { id: 'onc_65_plus', label: '65+ years', minAge: 65, maxAge: null }
];

// Research/Population Health Age Categories (Granular)
export const RESEARCH_AGE_CATEGORIES: AgeCategory[] = [
  { id: 'research_infants', label: 'Infants (0–1 year)', minAge: 0, maxAge: 1 },
  { id: 'research_toddlers', label: 'Toddlers (1–3 years)', minAge: 1, maxAge: 3 },
  { id: 'research_preschoolers', label: 'Preschoolers (3–5 years)', minAge: 3, maxAge: 5 },
  { id: 'research_children', label: 'Children (6–12 years)', minAge: 6, maxAge: 12 },
  { id: 'research_adolescents', label: 'Adolescents (13–17 years)', minAge: 13, maxAge: 17 },
  { id: 'research_young_adults', label: 'Young Adults (18–25 years)', minAge: 18, maxAge: 25 },
  { id: 'research_adults', label: 'Adults (26–44 years)', minAge: 26, maxAge: 44 },
  { id: 'research_middle_aged', label: 'Middle-aged Adults (45–64 years)', minAge: 45, maxAge: 64 },
  { id: 'research_older_adults', label: 'Older Adults (65–74 years)', minAge: 65, maxAge: 74 },
  { id: 'research_elderly', label: 'Elderly (75–84+ years)', minAge: 75, maxAge: null }
];

/**
 * Categorizes an age into the appropriate category based on the selected system
 */
export function categorizeAge(age: number | string, categoryType: AgeCategoryType): string {
  const numericAge = typeof age === 'string' ? parseInt(age, 10) : age;
  
  if (isNaN(numericAge) || numericAge < 0) {
    return 'unknown';
  }

  const categories = categoryType === 'onc' ? ONC_AGE_CATEGORIES : RESEARCH_AGE_CATEGORIES;
  
  for (const category of categories) {
    if (numericAge >= category.minAge && (category.maxAge === null || numericAge <= category.maxAge)) {
      return category.id;
    }
  }
  
  return 'unknown';
}

/**
 * Gets the display label for an age category
 */
export function getAgeCategoryLabel(categoryId: string, categoryType: AgeCategoryType): string {
  const categories = categoryType === 'onc' ? ONC_AGE_CATEGORIES : RESEARCH_AGE_CATEGORIES;
  const category = categories.find(cat => cat.id === categoryId);
  return category?.label || categoryId;
}

/**
 * Converts legacy age_range field to categorized age
 * This handles backward compatibility during transition
 */
export function convertLegacyAgeRange(ageRange: string, categoryType: AgeCategoryType): string {
  if (!ageRange) return 'unknown';
  
  // Extract numeric value from legacy ranges like "25-34", "65+", etc.
  const matches = ageRange.match(/(\d+)/);
  if (!matches) return 'unknown';
  
  const age = parseInt(matches[1], 10);
  return categorizeAge(age, categoryType);
}

/**
 * Groups patient data by age categories
 */
export function groupPatientsByAge(patients: any[], categoryType: AgeCategoryType, ageField: string = 'age'): Record<string, any[]> {
  const categories = categoryType === 'onc' ? ONC_AGE_CATEGORIES : RESEARCH_AGE_CATEGORIES;
  const grouped: Record<string, any[]> = {};
  
  // Initialize all categories
  categories.forEach(category => {
    grouped[category.id] = [];
  });
  grouped['unknown'] = [];
  
  // Group patients
  patients.forEach(patient => {
    const age = patient[ageField] || patient.age_range; // Support both new 'age' and legacy 'age_range'
    let categoryId: string;
    
    if (age && typeof age === 'string' && age.includes('-')) {
      // Legacy age_range format
      categoryId = convertLegacyAgeRange(age, categoryType);
    } else {
      // New age field format
      categoryId = categorizeAge(age, categoryType);
    }
    
    grouped[categoryId].push(patient);
  });
  
  return grouped;
}

/**
 * Gets chart data for age distribution visualization
 */
export function getAgeDistributionChartData(patients: any[], categoryType: AgeCategoryType, ageField: string = 'age') {
  const grouped = groupPatientsByAge(patients, categoryType, ageField);
  const categories = categoryType === 'onc' ? ONC_AGE_CATEGORIES : RESEARCH_AGE_CATEGORIES;
  
  return categories
    .map(category => ({
      id: category.id,
      label: category.label,
      value: grouped[category.id].length,
      percentage: patients.length > 0 ? Math.round((grouped[category.id].length / patients.length) * 100) : 0
    }))
    .filter(item => item.value > 0) // Only show categories with data
    .sort((a, b) => b.value - a.value); // Sort by count descending
}