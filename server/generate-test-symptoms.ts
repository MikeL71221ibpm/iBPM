/**
 * Quick script to generate a simplified test symptom library
 * This creates a small subset of symptoms for testing purposes
 */
import path from 'path';
import fs from 'fs';
import { InsertSymptomMaster } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

const TEST_SYMPTOM_LIBRARY_FILENAME = 'testSymptomLibrary.json';
const DATA_DIR = path.join(process.cwd(), 'server', 'data');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Creating data directory at ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const libraryFilePath = path.join(DATA_DIR, TEST_SYMPTOM_LIBRARY_FILENAME);

// Generate a simplified set of symptoms for testing
function generateTestSymptoms(): InsertSymptomMaster[] {
  console.log('Generating test symptoms...');
  
  const diagnosticCategories = [
    'Depression',
    'Anxiety',
    'Bipolar Disorder',
    'PTSD',
    'OCD',
    'Substance Abuse',
    'Schizophrenia'
  ];
  
  const symptoms: InsertSymptomMaster[] = [];
  
  // Create test data - 10 symptoms per category
  diagnosticCategories.forEach(category => {
    for (let i = 1; i <= 10; i++) {
      const symptomId = `SYM_${category.replace(/\s+/g, '')}_${i}`;
      const symptom: InsertSymptomMaster = {
        symptomId,
        symptomSegment: `${category} symptom ${i}`,
        diagnosis: `${category} Diagnosis`,
        diagnosticCategory: category,
        symptomProblem: null,
        sympProb: null
      };
      symptoms.push(symptom);
    }
  });
  
  // Add some common real symptoms that might be in actual notes
  const realSymptoms = [
    { symptom: 'depressed mood', category: 'Depression' },
    { symptom: 'loss of interest', category: 'Depression' },
    { symptom: 'fatigue', category: 'Depression' },
    { symptom: 'insomnia', category: 'Depression' },
    { symptom: 'excessive worry', category: 'Anxiety' },
    { symptom: 'restlessness', category: 'Anxiety' },
    { symptom: 'irritability', category: 'Anxiety' },
    { symptom: 'difficulty concentrating', category: 'Anxiety' },
    { symptom: 'elevated mood', category: 'Bipolar Disorder' },
    { symptom: 'racing thoughts', category: 'Bipolar Disorder' },
    { symptom: 'flashbacks', category: 'PTSD' },
    { symptom: 'nightmares', category: 'PTSD' },
    { symptom: 'intrusive thoughts', category: 'OCD' },
    { symptom: 'compulsive behaviors', category: 'OCD' },
    { symptom: 'alcohol cravings', category: 'Substance Abuse' },
    { symptom: 'withdrawal symptoms', category: 'Substance Abuse' },
    { symptom: 'hallucinations', category: 'Schizophrenia' },
    { symptom: 'delusions', category: 'Schizophrenia' },
    { symptom: 'homeless', category: 'HRSN' },
    { symptom: 'food insecurity', category: 'HRSN' },
    { symptom: 'financial problems', category: 'HRSN' },
    { symptom: 'lacks transportation', category: 'HRSN' },
    { symptom: 'healthcare access problems', category: 'HRSN' }
  ];

  realSymptoms.forEach((item, index) => {
    const symptomId = `SYM_REAL_${index + 1}`;
    const symptom: InsertSymptomMaster = {
      symptomId,
      symptomSegment: item.symptom,
      diagnosis: `${item.category} Diagnosis`,
      diagnosticCategory: item.category,
      symptomProblem: null,
      sympProb: null
    };
    symptoms.push(symptom);
  });

  return symptoms;
}

// Main function
async function main() {
  const symptoms = generateTestSymptoms();
  console.log(`Generated ${symptoms.length} test symptoms`);
  
  // Save to file
  fs.writeFileSync(libraryFilePath, JSON.stringify(symptoms, null, 2));
  console.log(`Saved test symptom library to ${libraryFilePath}`);
  
  console.log('Test symptom generation complete');
}

// Run the main function
main().catch(error => {
  console.error('Error generating test symptoms:', error);
  process.exit(1);
});