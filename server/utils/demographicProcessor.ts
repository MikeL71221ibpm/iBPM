/**
 * Demographic Data Processor for HRSN Analysis
 * Processes demographic fields from CSV uploads and integrates with patient records
 */

import { calculateAgeRange, parseDateOfBirth, validateAgeRange } from './ageCalculator';

export interface DemographicData {
  age_range?: string;
  date_of_birth?: string;
  gender?: string;
  race?: string;
  ethnicity?: string;
  zip_code?: string;
}

export interface ProcessedDemographicData {
  age_range: string | null;
  date_of_birth: Date | null;
  gender: string | null;
  race: string | null;
  ethnicity: string | null;
  zip_code: string | null;
  has_hrsn_demographics: boolean;
}

/**
 * Process demographic data from CSV row
 */
export function processDemographicData(csvRow: any): ProcessedDemographicData {
  const result: ProcessedDemographicData = {
    age_range: null,
    date_of_birth: null,
    gender: null,
    race: null,
    ethnicity: null,
    zip_code: null,
    has_hrsn_demographics: false
  };

  // Process date of birth and age range
  const dobString = csvRow.date_of_birth || csvRow.dateOfBirth || csvRow.dob;
  const ageRangeString = csvRow.age_range || csvRow.ageRange || csvRow.age;

  if (dobString && dobString.trim() !== '') {
    const parsedDob = parseDateOfBirth(dobString.trim());
    if (parsedDob) {
      result.date_of_birth = parsedDob;
      result.age_range = calculateAgeRange(parsedDob);
    }
  } else if (ageRangeString && ageRangeString.trim() !== '') {
    const cleanAgeRange = ageRangeString.trim();
    if (validateAgeRange(cleanAgeRange)) {
      result.age_range = cleanAgeRange;
    }
  }

  // Process other demographic fields
  result.gender = cleanDemographicField(csvRow.gender);
  result.race = cleanDemographicField(csvRow.race);
  result.ethnicity = cleanDemographicField(csvRow.ethnicity);
  result.zip_code = cleanDemographicField(csvRow.zip_code || csvRow.zipCode || csvRow.zip);

  // Determine if we have sufficient demographics for HRSN analysis
  result.has_hrsn_demographics = !!(
    result.age_range && 
    result.gender && 
    result.race && 
    result.ethnicity && 
    result.zip_code
  );

  return result;
}

/**
 * Clean and validate demographic field values
 */
function cleanDemographicField(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const cleaned = value.trim();
  if (cleaned === '' || cleaned.toLowerCase() === 'unknown' || cleaned.toLowerCase() === 'n/a') {
    return null;
  }
  
  return cleaned;
}

/**
 * Check if patient data has complete HRSN demographic requirements
 */
export function hasCompleteHrsnDemographics(demographics: ProcessedDemographicData): boolean {
  return demographics.has_hrsn_demographics;
}

/**
 * Generate demographic summary for logging
 */
export function getDemographicSummary(demographics: ProcessedDemographicData): string {
  const fields = [];
  if (demographics.age_range) fields.push(`Age: ${demographics.age_range}`);
  if (demographics.gender) fields.push(`Gender: ${demographics.gender}`);
  if (demographics.race) fields.push(`Race: ${demographics.race}`);
  if (demographics.ethnicity) fields.push(`Ethnicity: ${demographics.ethnicity}`);
  if (demographics.zip_code) fields.push(`Zip: ${demographics.zip_code}`);
  
  return fields.length > 0 ? fields.join(', ') : 'No demographic data';
}

/**
 * Validate CSV headers for demographic fields
 */
export function validateDemographicHeaders(headers: string[]): {
  hasAnyDemographics: boolean;
  hasCompleteHrsn: boolean;
  missingRequired: string[];
} {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[_\s]/g, ''));
  
  const demographicFields = {
    age: normalizedHeaders.some(h => h.includes('age') || h.includes('dob') || h.includes('dateofbirth')),
    gender: normalizedHeaders.includes('gender'),
    race: normalizedHeaders.includes('race'),
    ethnicity: normalizedHeaders.includes('ethnicity'),
    zip: normalizedHeaders.some(h => h.includes('zip'))
  };

  const hasAnyDemographics = Object.values(demographicFields).some(Boolean);
  const hasCompleteHrsn = Object.values(demographicFields).every(Boolean);
  
  const missingRequired = [];
  if (!demographicFields.age) missingRequired.push('age_range or date_of_birth');
  if (!demographicFields.gender) missingRequired.push('gender');
  if (!demographicFields.race) missingRequired.push('race');
  if (!demographicFields.ethnicity) missingRequired.push('ethnicity');
  if (!demographicFields.zip) missingRequired.push('zip_code');

  return {
    hasAnyDemographics,
    hasCompleteHrsn,
    missingRequired
  };
}