/**
 * Demographic Data Generator
 * 
 * Generates realistic demographic data with proper distributions while
 * maintaining patient-level consistency across all records for each patient.
 */

// Age range distributions based on healthcare demographics
export const AGE_RANGES = {
  '18-25': { weight: 15, minAge: 18, maxAge: 25 },
  '26-35': { weight: 25, minAge: 26, maxAge: 35 },
  '36-50': { weight: 30, minAge: 36, maxAge: 50 },
  '51-65': { weight: 20, minAge: 51, maxAge: 65 },
  '65+': { weight: 10, minAge: 65, maxAge: 85 }
};

// Gender distribution
export const GENDER_DISTRIBUTION = {
  'Female': 52,
  'Male': 46,
  'Non-binary': 1,
  'Other': 1
};

// Race distribution (approximate US demographics)
export const RACE_DISTRIBUTION = {
  'White': 60,
  'Black or African American': 18,
  'Hispanic or Latino': 12,
  'Asian': 6,
  'Native American': 2,
  'Pacific Islander': 1,
  'Other': 1
};

// Ethnicity distribution
export const ETHNICITY_DISTRIBUTION = {
  'Non-Hispanic': 82,
  'Hispanic or Latino': 18
};

// Northeast US ZIP codes with realistic distribution
export const NORTHEAST_ZIP_CODES = [
  // New York
  '10001', '10002', '10003', '10009', '10010', '10011', '10016', '10017', '10018', '10019',
  '10021', '10022', '10023', '10024', '10025', '10026', '10027', '10028', '10029', '10030',
  '10451', '10452', '10453', '10454', '10455', '10456', '10457', '10458', '10459', '10460',
  '11201', '11202', '11203', '11204', '11205', '11206', '11207', '11208', '11209', '11210',
  
  // Massachusetts
  '02101', '02102', '02103', '02104', '02105', '02106', '02107', '02108', '02109', '02110',
  '02111', '02112', '02113', '02114', '02115', '02116', '02117', '02118', '02119', '02120',
  '02121', '02122', '02123', '02124', '02125', '02126', '02127', '02128', '02129', '02130',
  
  // Connecticut
  '06001', '06002', '06010', '06013', '06016', '06018', '06019', '06020', '06023', '06026',
  '06103', '06104', '06105', '06106', '06107', '06108', '06109', '06110', '06111', '06112',
  
  // New Jersey
  '07001', '07002', '07003', '07004', '07005', '07006', '07007', '07008', '07009', '07010',
  '07094', '07095', '07096', '07097', '07302', '07304', '07305', '07306', '07307', '07310',
  
  // Pennsylvania
  '19101', '19102', '19103', '19104', '19106', '19107', '19109', '19111', '19112', '19114',
  '19115', '19116', '19118', '19119', '19120', '19121', '19122', '19123', '19124', '19125',
  
  // Rhode Island
  '02801', '02802', '02804', '02806', '02807', '02808', '02809', '02812', '02813', '02814',
  
  // Vermont
  '05001', '05009', '05030', '05031', '05032', '05033', '05034', '05035', '05036', '05037',
  
  // New Hampshire
  '03031', '03032', '03033', '03034', '03036', '03037', '03038', '03040', '03041', '03042',
  
  // Maine
  '04001', '04002', '04003', '04005', '04006', '04007', '04008', '04009', '04010', '04011'
];

/**
 * Seeded random number generator for consistent results
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: string) {
    this.seed = this.hashCode(seed);
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
  
  weightedChoice(distribution: Record<string, number>): string {
    const totalWeight = Object.values(distribution).reduce((sum, weight) => sum + weight, 0);
    let random = this.next() * totalWeight;
    
    for (const [item, weight] of Object.entries(distribution)) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }
    
    return Object.keys(distribution)[0];
  }
}

/**
 * Generate demographic data for a patient
 */
export function generatePatientDemographics(patientId: string): {
  ageRange: string;
  dob: string;
  gender: string;
  race: string;
  ethnicity: string;
  zipCode: string;
} {
  const rng = new SeededRandom(patientId);
  
  // Generate age range and specific age
  const ageRange = rng.weightedChoice(
    Object.fromEntries(
      Object.entries(AGE_RANGES).map(([range, data]) => [range, data.weight])
    )
  );
  
  const ageData = AGE_RANGES[ageRange as keyof typeof AGE_RANGES];
  const age = rng.nextInt(ageData.minAge, ageData.maxAge);
  
  // Calculate DOB (assuming current year is 2024)
  const currentYear = 2024;
  const birthYear = currentYear - age;
  const birthMonth = rng.nextInt(1, 12);
  const birthDay = rng.nextInt(1, 28); // Use 28 to avoid month-specific day issues
  
  const dob = `${birthMonth.toString().padStart(2, '0')}/${birthDay.toString().padStart(2, '0')}/${birthYear}`;
  
  // Generate other demographics
  const gender = rng.weightedChoice(GENDER_DISTRIBUTION);
  const race = rng.weightedChoice(RACE_DISTRIBUTION);
  const ethnicity = rng.weightedChoice(ETHNICITY_DISTRIBUTION);
  const zipCode = rng.choice(NORTHEAST_ZIP_CODES);
  
  return {
    ageRange,
    dob,
    gender,
    race,
    ethnicity,
    zipCode
  };
}

/**
 * Process CSV file and add demographic data
 */
export function enhanceRecordsWithDemographics(records: any[]): any[] {
  const patientDemographics = new Map<string, any>();
  
  return records.map(record => {
    const patientId = record.patient_id || record['Patient_ID#'];
    
    if (!patientId) {
      return record;
    }
    
    // Generate demographics once per patient
    if (!patientDemographics.has(patientId)) {
      patientDemographics.set(patientId, generatePatientDemographics(patientId));
    }
    
    const demographics = patientDemographics.get(patientId);
    
    // Apply demographics to record (only if fields are empty)
    return {
      ...record,
      age_range: record.age_range || demographics.ageRange,
      DOB: record.DOB || demographics.dob,
      gender: record.gender || demographics.gender,
      race: record.race || demographics.race,
      ethncity: record.ethncity || demographics.ethnicity,
      zip_code: record.zip_code || demographics.zipCode
    };
  });
}

/**
 * Generate demographic distribution report
 */
export function generateDemographicReport(records: any[]): {
  ageRangeDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  raceDistribution: Record<string, number>;
  ethnicityDistribution: Record<string, number>;
  totalPatients: number;
  totalRecords: number;
} {
  const uniquePatients = new Set();
  const ageRanges: Record<string, number> = {};
  const genders: Record<string, number> = {};
  const races: Record<string, number> = {};
  const ethnicities: Record<string, number> = {};
  
  records.forEach(record => {
    const patientId = record.patient_id || record['Patient_ID#'];
    if (patientId) {
      uniquePatients.add(patientId);
      
      // Count distributions (only count each patient once)
      if (!uniquePatients.has(`${patientId}-counted`)) {
        uniquePatients.add(`${patientId}-counted`);
        
        const ageRange = record.age_range;
        const gender = record.gender;
        const race = record.race;
        const ethnicity = record.ethncity;
        
        if (ageRange) ageRanges[ageRange] = (ageRanges[ageRange] || 0) + 1;
        if (gender) genders[gender] = (genders[gender] || 0) + 1;
        if (race) races[race] = (races[race] || 0) + 1;
        if (ethnicity) ethnicities[ethnicity] = (ethnicities[ethnicity] || 0) + 1;
      }
    }
  });
  
  return {
    ageRangeDistribution: ageRanges,
    genderDistribution: genders,
    raceDistribution: races,
    ethnicityDistribution: ethnicities,
    totalPatients: uniquePatients.size / 2, // Divide by 2 because we added "-counted" entries
    totalRecords: records.length
  };
}

/**
 * Test the demographic generator
 */
export function testDemographicGenerator(): void {
  console.log('Testing demographic generator...');
  
  // Test with sample patient IDs
  const samplePatients = ['0000001', '0000002', '0000003', '0000004', '0000005'];
  
  samplePatients.forEach(patientId => {
    const demographics = generatePatientDemographics(patientId);
    console.log(`Patient ${patientId}:`, demographics);
  });
  
  // Test consistency - same patient should get same demographics
  const patient1_first = generatePatientDemographics('0000001');
  const patient1_second = generatePatientDemographics('0000001');
  
  console.log('Consistency test:', 
    JSON.stringify(patient1_first) === JSON.stringify(patient1_second) ? 'PASSED' : 'FAILED'
  );
}