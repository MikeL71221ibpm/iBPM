import { InsertSymptomMaster } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Load all symptoms directly from a source CSV file without any filtering
 * @param filePath Optional path to the symptom CSV file; if not provided, uses the default
 */
export function generateSymptomLibrary(filePath?: string): InsertSymptomMaster[] {
  // If no file path was provided, use the default master file
  const csvFilePath = filePath || path.join(process.cwd(), 'attached_assets', 'Symptom_Segments_asof_4_30_25_MASTER.csv');
  
  console.log(`Loading symptoms from file: ${csvFilePath}`);
  
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`Symptom master file not found at: ${csvFilePath}`);
  }
  
  try {
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Parsed ${records.length} symptoms from CSV file`);
    
    // Map the CSV records to our schema format
    const symptomLibrary: InsertSymptomMaster[] = records.map((record: any) => ({
      symptom_id: record.symptom_id,
      symptom_segment: record.symptom_segment,
      diagnosis: record.diagnosis,
      diagnostic_category: record.diagnostic_category,
      symp_prob: record.symp_prob || "Symptom",
      zcode_hrsn: record.zcode_hrsn || "No"
    }));
    
    // Find and handle true duplicates (identical on all attributes) and symptom ID conflicts
    const processedLibrary: InsertSymptomMaster[] = [];
    const symptomIds = new Set<string>();
    const idConflicts: string[] = [];
    const trueDuplicates: string[] = [];
    
    // Create a map to track complete symptom records for true duplicate detection
    const symptomMap = new Map<string, InsertSymptomMaster>();
    
    // Process each symptom, ensuring unique IDs while keeping all non-duplicate symptoms
    for (const symptom of symptomLibrary) {
      // Create a composite key of all 6 attributes to detect true duplicates
      // Only use the attributes that are guaranteed to exist in our schema
      const compositeKey = JSON.stringify({
        id: symptom.symptom_id,
        segment: symptom.symptom_segment,
        diagnosis: symptom.diagnosis,
        category: symptom.diagnostic_category,
        sympProb: symptom.symp_prob,
        zcode: symptom.zcode_hrsn
        // Removed creation_date and modified_date which don't exist in our schema
      });
      
      // Check if this is a true duplicate (exact match on all fields)
      if (symptomMap.has(compositeKey)) {
        trueDuplicates.push(symptom.symptom_id);
        continue; // Skip true duplicates
      }
      
      // Not a true duplicate, add to our composite key map
      symptomMap.set(compositeKey, symptom);
      
      // Check if this symptom ID conflicts with another (same ID but different data)
      if (symptomIds.has(symptom.symptom_id)) {
        idConflicts.push(symptom.symptom_id);
        
        // Make the ID unique by adding a suffix
        let counter = 1;
        let newId = `${symptom.symptom_id}_${counter}`;
        
        // Keep incrementing counter until we find a unique ID
        while (symptomIds.has(newId)) {
          counter++;
          newId = `${symptom.symptom_id}_${counter}`;
        }
        
        // Add the modified symptom with unique ID
        const modifiedSymptom = { ...symptom, symptom_id: newId };
        processedLibrary.push(modifiedSymptom);
        symptomIds.add(newId);
      } else {
        // Original ID is unique, use as is
        processedLibrary.push(symptom);
        symptomIds.add(symptom.symptom_id);
      }
    }
    
    // Log duplicate information
    if (trueDuplicates.length > 0) {
      console.log(`⚠️ Found and removed ${trueDuplicates.length} true duplicates (identical on all attributes)`);
      console.log(`First few true duplicates: ${trueDuplicates.slice(0, 5)}`);
    }
    
    if (idConflicts.length > 0) {
      console.log(`⚠️ Found and fixed ${idConflicts.length} ID conflicts by adding suffixes`);
      console.log(`First few ID conflicts: ${idConflicts.slice(0, 5)}`);
    }
    
    console.log(`✅ Final symptom library contains ${processedLibrary.length} symptoms after processing`);
    return processedLibrary;
  } catch (error) {
    console.error(`Error loading symptoms from file: ${error}`);
    throw new Error(`Failed to load symptoms from file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// The code below is now unused since we load directly from CSV
// Keeping for reference purposes only
/**
 * Original function to generate symptom combinations (DEPRECATED)
 * We now load directly from CSV file instead
 */
function originalGenerateSymptomLibrary(): InsertSymptomMaster[] {
  // Core symptom categories used to generate the symptom library
  const symptomCategories = [
    {
      category: "Mood Disorders",
      diagnoses: [
        { name: "Major Depressive Disorder", symptoms: [] as string[] },
        { name: "Bipolar Disorder", symptoms: [] as string[] },
        { name: "Persistent Depressive Disorder", symptoms: [] as string[] },
        { name: "Seasonal Affective Disorder", symptoms: [] as string[] }
      ]
    },
    {
      category: "Anxiety Disorders",
      diagnoses: [
        { name: "Generalized Anxiety Disorder", symptoms: [] as string[] },
        { name: "Panic Disorder", symptoms: [] as string[] },
        { name: "Social Anxiety Disorder", symptoms: [] as string[] },
        { name: "Specific Phobias", symptoms: [] as string[] }
      ]
    },
    {
      category: "Trauma Disorders",
      diagnoses: [
        { name: "Post-Traumatic Stress Disorder", symptoms: [] as string[] },
        { name: "Acute Stress Disorder", symptoms: [] as string[] },
        { name: "Adjustment Disorder", symptoms: [] as string[] }
      ]
    },
    {
      category: "Substance-Related Disorders",
      diagnoses: [
        { name: "Alcohol Use Disorder", symptoms: [] as string[] },
        { name: "Opioid Use Disorder", symptoms: [] as string[] },
        { name: "Stimulant Use Disorder", symptoms: [] as string[] },
        { name: "Cannabis Use Disorder", symptoms: [] as string[] },
        { name: "Substance Use Disorder", symptoms: [] as string[] }
      ]
    },
    {
      category: "Thought Disorders",
      diagnoses: [
        { name: "Schizophrenia", symptoms: [] as string[] },
        { name: "Schizoaffective Disorder", symptoms: [] as string[] },
        { name: "Delusional Disorder", symptoms: [] as string[] },
        { name: "Paranoid Ideation", symptoms: [] as string[] }
      ]
    },
    {
      category: "Sleep-Wake Disorders",
      diagnoses: [
        { name: "Insomnia Disorder", symptoms: [] as string[] },
        { name: "Narcolepsy", symptoms: [] as string[] },
        { name: "Sleep Apnea", symptoms: [] as string[] },
        { name: "Circadian Rhythm Sleep Disorder", symptoms: [] as string[] }
      ]
    }
  ];

  // Critical symptom segments we must match - from identified patterns in EHR notes
  const criticalSegments = [
    // Directly from the test notes we've analyzed
    "depression",
    "anxiety", 
    "insomnia",
    "increased tolerance",
    "hopelessness",
    "talkativeness",
    "difficulty engaging",
    "people talk down",
    "loss of trust",
    "fatigue",
    "pain",
    "headache", 
    "sleep",
    "appetite",
    "stress",
    "mood",
    "sad", 
    "worried",
    "fear",
    "tired",
    
    // Expanded list of targeted symptoms with variations
    "increased tolerance requiring more substance",
    "constant feelings of hopelessness",
    "increased talkativeness",
    "difficulty engaging in social situations",
    "people talk down or insult often",
    "loss of trust in others",
    "persistent fatigue",
    "chronic pain",
    "recurrent headaches",
    "sleep disturbance",
    "changes in appetite",
    "stress response",
    "mood swings",
    "sadness",
    "worry",
    "fearfulness",
    "tiredness" 
  ];
  
  // Add critical segments to appropriate diagnoses
  criticalSegments.forEach(segment => {
    // Determine which diagnosis category this symptom belongs to based on keywords
    if (segment.includes("tolerance") || segment.includes("substance")) {
      const diagnosis = symptomCategories[3].diagnoses.find(d => d.name === "Substance Use Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else if (segment.includes("depression") || segment.includes("hopelessness") || segment.includes("sad")) {
      const diagnosis = symptomCategories[0].diagnoses.find(d => d.name === "Major Depressive Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else if (segment.includes("talkative") || segment.includes("mood swing")) {
      const diagnosis = symptomCategories[0].diagnoses.find(d => d.name === "Bipolar Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else if (segment.includes("anxiety") || segment.includes("worried") || segment.includes("fear")) {
      const diagnosis = symptomCategories[1].diagnoses.find(d => d.name === "Generalized Anxiety Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else if (segment.includes("engaging") || segment.includes("social")) {
      const diagnosis = symptomCategories[1].diagnoses.find(d => d.name === "Social Anxiety Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else if (segment.includes("talk down") || segment.includes("paranoi") || segment.includes("insult")) {
      const diagnosis = symptomCategories[4].diagnoses.find(d => d.name === "Paranoid Ideation");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else if (segment.includes("trust")) {
      const diagnosis = symptomCategories[2].diagnoses.find(d => d.name === "Adjustment Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else if (segment.includes("insomnia") || segment.includes("sleep")) {
      const diagnosis = symptomCategories[5].diagnoses.find(d => d.name === "Insomnia Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
    else {
      // For any segments that don't have a clear category, add to general anxiety
      const diagnosis = symptomCategories[1].diagnoses.find(d => d.name === "Generalized Anxiety Disorder");
      if (diagnosis && !diagnosis.symptoms.includes(segment)) diagnosis.symptoms.push(segment);
    }
  });
  
  // Now add the major symptoms from medical literature 
  // These are the core symptoms from DSM-5 and ICD-10 for each condition
  
  // Major Depressive Disorder
  symptomCategories[0].diagnoses[0].symptoms.push(
    ...addVariations([
      "depressed mood", "loss of interest", "reduced pleasure", "weight loss", 
      "weight gain", "appetite changes", "insomnia", "hypersomnia", 
      "psychomotor agitation", "psychomotor retardation", "fatigue", "loss of energy",
      "feelings of worthlessness", "excessive guilt", "diminished concentration", 
      "indecisiveness", "thoughts of death", "suicidal ideation", "suicide plan", 
      "suicide attempt"
    ])
  );
  
  // Bipolar Disorder
  symptomCategories[0].diagnoses[1].symptoms.push(
    ...addVariations([
      "elevated mood", "irritable mood", "inflated self-esteem", "grandiosity", 
      "decreased need for sleep", "more talkative", "pressured speech", "flight of ideas",
      "racing thoughts", "distractibility", "increased goal-directed activity", 
      "psychomotor agitation", "excessive involvement in activities", "impulsivity", 
      "high-risk behaviors", "mood swings", "rapid cycling", "mixed episode"
    ])
  );
  
  // Generalized Anxiety Disorder
  symptomCategories[1].diagnoses[0].symptoms.push(
    ...addVariations([
      "excessive anxiety", "persistent worry", "difficulty controlling worry", 
      "restlessness", "feeling keyed up", "feeling on edge", "easily fatigued", 
      "difficulty concentrating", "mind going blank", "irritability", 
      "muscle tension", "sleep disturbance", "avoidance behaviors", 
      "reassurance seeking", "somatic complaints", "excessive fear"
    ])
  );
  
  // Social Anxiety Disorder
  symptomCategories[1].diagnoses[2].symptoms.push(
    ...addVariations([
      "fear of social situations", "fear of scrutiny", "fear of embarrassment", 
      "fear of humiliation", "anxiety in social situations", "avoidance of social situations", 
      "performance anxiety", "physical symptoms in social settings", "blushing", 
      "sweating", "trembling", "rapid heartbeat", "freezing", "difficulty making eye contact", 
      "quiet voice", "difficulty speaking in groups"
    ])
  );
  
  // Post-Traumatic Stress Disorder
  symptomCategories[2].diagnoses[0].symptoms.push(
    ...addVariations([
      "exposure to trauma", "intrusive memories", "recurring dreams", "flashbacks", 
      "psychological distress", "physiological reactions", "avoidance of thoughts", 
      "avoidance of feelings", "avoidance of reminders", "negative beliefs", 
      "distorted cognitions", "persistent negative state", "diminished interest", 
      "detachment", "restricted affect", "irritable behavior", "angry outbursts", 
      "reckless behavior", "hypervigilance", "exaggerated startle", "concentration problems", 
      "sleep disturbance"
    ])
  );
  
  // Substance Use Disorder
  symptomCategories[3].diagnoses[4].symptoms.push(
    ...addVariations([
      "tolerance", "withdrawal", "using larger amounts", "using longer than intended",
      "desire to cut down", "inability to cut down", "time spent obtaining substance", 
      "time spent using substance", "time spent recovering from effects", "craving", 
      "failure to fulfill obligations", "social problems", "interpersonal problems", 
      "reduced activities", "physically hazardous use", "continued use despite problems",
      "blackouts", "hiding use", "minimizing use", "relapse"
    ])
  );

  // Now compile all these symptoms into the master list format
  const symptomLibrary: InsertSymptomMaster[] = [];
  let symptomIdCounter = 1;
  
  // First, add all the critical segments with top priority to ensure they're included
  criticalSegments.forEach(segment => {
    // Find which category and diagnosis this belongs to
    let foundCategory = "";
    let foundDiagnosis = "";
    
    for (const category of symptomCategories) {
      for (const diagnosis of category.diagnoses) {
        if (diagnosis.symptoms.includes(segment)) {
          foundCategory = category.category;
          foundDiagnosis = diagnosis.name;
          break;
        }
      }
      if (foundCategory) break;
    }
    
    // If not found in any category, assign to "Other"
    if (!foundCategory) {
      foundCategory = "Other Conditions";
      foundDiagnosis = "Unspecified Condition";
    }
    
    symptomLibrary.push({
      symptom_id: `S${symptomIdCounter.toString().padStart(4, '0')}`,
      symptom_segment: segment,
      diagnosis: foundDiagnosis,
      diagnostic_category: foundCategory,
      symp_prob: "Symptom",
      zcode_hrsn: "No"
    });
    
    symptomIdCounter++;
  });
  
  // Then add all the other symptoms from each category
  for (const category of symptomCategories) {
    for (const diagnosis of category.diagnoses) {
      // Only add symptoms not already in the library
      const existingSegments = symptomLibrary.map(s => s.symptom_segment);
      
      for (const segment of diagnosis.symptoms) {
        if (!existingSegments.includes(segment)) {
          symptomLibrary.push({
            symptom_id: `S${symptomIdCounter.toString().padStart(4, '0')}`,
            symptom_segment: segment,
            diagnosis: diagnosis.name,
            diagnostic_category: category.category,
            symp_prob: "Symptom",
            zcode_hrsn: "No"
          });
          
          symptomIdCounter++;
        }
      }
    }
  }
  
  // Generate a large number of combined phrases (but no more than needed)
  // This creates variations like "severe depression" or "frequent headaches"
  // Use a more controlled approach to prevent infinite loops
  console.log("Starting generation of combination symptoms...");
  
  // Set a target number of exactly 3,800 symptoms as required by the application
  // This is a critical requirement for comprehensive symptom matching
  const TARGET_SYMPTOM_COUNT = 3800;
  
  // Get base symptoms for combinations - using more symptoms per diagnosis to reach our target
  const baseSymptoms = criticalSegments.concat(
    symptomCategories.flatMap(cat => 
      cat.diagnoses.flatMap(diag => 
        diag.symptoms.slice(0, 15) // Take up to 15 symptoms from each diagnosis to generate more combinations
      )
    )
  );
  
  console.log(`Using ${baseSymptoms.length} base symptoms for combinations`);
  
  const modifiers = [
    "severe", "persistent", "frequent", "recurring", "chronic", 
    "mild", "moderate", "intense"
  ];
  
  const timeframes = [
    "daily", "weekly", "monthly", "constant", "intermittent",
    "often", "sometimes"
  ];
  
  // Create a deterministic set of variations rather than a potentially infinite loop
  let combinationCount = 0;
  
  // Use a counter to avoid getting stuck in a loop
  let iterationCount = 0;
  const MAX_ITERATIONS = 50000; // Safety limit
  
  console.log("Generating modifier combinations...");
  
  // Create modifier+symptom combinations that don't exist yet
  for (const symptom of baseSymptoms) {
    if (symptomLibrary.length >= TARGET_SYMPTOM_COUNT) break;
    
    for (const modifier of modifiers) {
      iterationCount++;
      if (iterationCount > MAX_ITERATIONS) {
        console.warn(`Reached max iterations (${MAX_ITERATIONS}), stopping early to prevent hanging`);
        break;
      }
      
      const newSegment = `${modifier} ${symptom}`;
      if (!symptomLibrary.some(s => s.symptom_segment === newSegment)) {
        // Find the category and diagnosis of the base symptom
        const baseSymptomEntry = symptomLibrary.find(s => s.symptom_segment === symptom);
        
        symptomLibrary.push({
          symptom_id: `S${symptomIdCounter.toString().padStart(4, '0')}`,
          symptom_segment: newSegment,
          diagnosis: baseSymptomEntry?.diagnosis || "Unspecified Condition",
          diagnostic_category: baseSymptomEntry?.diagnostic_category || "Other Conditions",
          symp_prob: "Symptom",
          zcode_hrsn: "No"
        });
        
        symptomIdCounter++;
        combinationCount++;
        
        if (symptomLibrary.length >= TARGET_SYMPTOM_COUNT) break;
      }
    }
    
    if (iterationCount > MAX_ITERATIONS) break;
    
    // Add timeframe+symptom combinations too
    if (symptomLibrary.length < TARGET_SYMPTOM_COUNT) {
      for (const timeframe of timeframes) {
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
          console.warn(`Reached max iterations (${MAX_ITERATIONS}), stopping early to prevent hanging`);
          break;
        }
        
        const newSegment = `${timeframe} ${symptom}`;
        if (!symptomLibrary.some(s => s.symptom_segment === newSegment)) {
          // Find the category and diagnosis of the base symptom
          const baseSymptomEntry = symptomLibrary.find(s => s.symptom_segment === symptom);
          
          symptomLibrary.push({
            symptom_id: `S${symptomIdCounter.toString().padStart(4, '0')}`,
            symptom_segment: newSegment,
            diagnosis: baseSymptomEntry?.diagnosis || "Unspecified Condition",
            diagnostic_category: baseSymptomEntry?.diagnostic_category || "Other Conditions",
            symp_prob: "Symptom",
            zcode_hrsn: "No"
          });
          
          symptomIdCounter++;
          combinationCount++;
          
          if (symptomLibrary.length >= TARGET_SYMPTOM_COUNT) break;
        }
      }
    }
    
    if (iterationCount > MAX_ITERATIONS) break;
  }
  
  console.log(`Generated ${combinationCount} combination symptoms after ${iterationCount} iterations`);
  
  // If we need more symptoms, generate some sentence-based symptoms
  if (symptomLibrary.length < TARGET_SYMPTOM_COUNT) {
    console.log(`Generating additional sentence-based symptoms to reach target count...`);
    
    const patientPhrases = [
      "Patient reports",
      "Patient complains of",
      "Patient states",
      "Patient exhibits",
      "Patient demonstrates"
    ];
    
    const remainingNeeded = TARGET_SYMPTOM_COUNT - symptomLibrary.length;
    let sentenceCount = 0;
    
    // Take more symptoms to generate more combinations
    const topSymptoms = symptomLibrary.slice(0, 200).map(s => s.symptom_segment);
    
    for (const symptom of topSymptoms) {
      if (sentenceCount >= remainingNeeded) break;
      
      for (const phrase of patientPhrases) {
        const newSegment = `${phrase} ${symptom}`;
        if (!symptomLibrary.some(s => s.symptom_segment === newSegment)) {
          // Find the category and diagnosis of the base symptom
          const baseSymptomEntry = symptomLibrary.find(s => s.symptom_segment === symptom);
          
          symptomLibrary.push({
            symptom_id: `S${symptomIdCounter.toString().padStart(4, '0')}`,
            symptom_segment: newSegment,
            diagnosis: baseSymptomEntry?.diagnosis || "Unspecified Condition",
            diagnostic_category: baseSymptomEntry?.diagnostic_category || "Other Conditions",
            symp_prob: "Symptom",
            zcode_hrsn: "No"
          });
          
          symptomIdCounter++;
          sentenceCount++;
          
          if (sentenceCount >= remainingNeeded) break;
        }
      }
    }
    
    console.log(`Added ${sentenceCount} sentence-based symptoms`);
  }
  
  // Log the symptom count
  console.log(`Generated ${symptomLibrary.length} total symptoms in library`);
  
  // Use all generated symptoms for exact matching
  // This is a critical requirement for matching exactly all symptom segments in the database
  let finalLibrary = [...symptomLibrary];
  
  // No artificial limiting or expanding of the library - use all naturally generated segments
  // The count will change over time as the system evolves
  console.log(`Returning final library with all ${finalLibrary.length} symptoms`);
  
  // Verify there are no duplicate symptom_ids
  const symptomIds = new Set<string>();
  const duplicates: string[] = [];
  
  for (const symptom of finalLibrary) {
    if (symptomIds.has(symptom.symptom_id)) {
      duplicates.push(symptom.symptom_id);
    } else {
      symptomIds.add(symptom.symptom_id);
    }
  }
  
  if (duplicates.length > 0) {
    console.error(`⚠️ Found ${duplicates.length} duplicate symptom IDs`);
    console.error(`First few duplicates: ${duplicates.slice(0, 5)}`);
  } else {
    console.log(`✅ All symptom IDs are unique!`);
  }
  
  return finalLibrary;
}

/**
 * Helper function to create symptom variations by adding 
 * common prefixes like "reports" or "complains of"
 */
function addVariations(symptoms: string[]): string[] {
  const variations: string[] = [...symptoms];
  
  for (const symptom of symptoms) {
    variations.push(
      `reports ${symptom}`,
      `complains of ${symptom}`,
      `exhibits ${symptom}`,
      `displays ${symptom}`,
      `shows ${symptom}`
    );
  }
  
  return variations;
}