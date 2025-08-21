/**
 * Age Calculation Utility for HRSN Analysis
 * Converts Date of Birth to Age Range categories for demographic analysis
 */

export function calculateAgeRange(dateOfBirth: Date): string {
  const today = new Date();
  const age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate()) 
    ? age - 1 
    : age;

  // Return standardized age range categories
  if (adjustedAge < 18) return "Under 18";
  if (adjustedAge >= 18 && adjustedAge <= 24) return "18-24";
  if (adjustedAge >= 25 && adjustedAge <= 34) return "25-34";
  if (adjustedAge >= 35 && adjustedAge <= 44) return "35-44";
  if (adjustedAge >= 45 && adjustedAge <= 54) return "45-54";
  if (adjustedAge >= 55 && adjustedAge <= 64) return "55-64";
  if (adjustedAge >= 65 && adjustedAge <= 74) return "65-74";
  if (adjustedAge >= 75) return "75+";
  
  return "Unknown";
}

export function parseDateOfBirth(dobString: string): Date | null {
  if (!dobString || dobString.trim() === '') return null;
  
  // Handle various date formats
  const cleanDob = dobString.trim();
  
  // Try parsing common formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
  ];
  
  let parsedDate: Date | null = null;
  
  if (formats[0].test(cleanDob)) {
    // YYYY-MM-DD format
    parsedDate = new Date(cleanDob);
  } else if (formats[1].test(cleanDob) || formats[2].test(cleanDob)) {
    // MM/DD/YYYY or M/D/YYYY format
    parsedDate = new Date(cleanDob);
  } else if (formats[3].test(cleanDob)) {
    // MM-DD-YYYY format
    const [month, day, year] = cleanDob.split('-');
    parsedDate = new Date(`${year}-${month}-${day}`);
  } else {
    // Try generic parsing as fallback
    parsedDate = new Date(cleanDob);
  }
  
  // Validate the parsed date
  if (parsedDate && !isNaN(parsedDate.getTime())) {
    const currentYear = new Date().getFullYear();
    const birthYear = parsedDate.getFullYear();
    
    // Reasonable birth year validation (1900 to current year)
    if (birthYear >= 1900 && birthYear <= currentYear) {
      return parsedDate;
    }
  }
  
  return null;
}

export function validateAgeRange(ageRange: string): boolean {
  const validRanges = [
    "Under 18", "18-24", "25-34", "35-44", 
    "45-54", "55-64", "65-74", "75+", "Unknown"
  ];
  return validRanges.includes(ageRange);
}