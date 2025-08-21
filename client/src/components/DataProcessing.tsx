/**
 * DataProcessing.tsx
 * Utility component for processing and filtering symptom data for visualizations
 */

// Export a more flexible interface for symptom data that matches the database schema
export interface ExtractedSymptom {
  id: number;
  
  // BOTH formats must be supported - snake_case from database AND camelCase in components
  
  // Snake case format fields (directly from database)
  symptom_id: string;
  symptom_segment: string;
  diagnostic_category: string;
  diagnosis: string;
  symptom_problem: string;
  symp_prob: string;
  diagnosis_icd10_code: string;
  dos_date: string;
  patient_id: string;
  user_id?: number;
  pre_processed?: boolean;
  symptom_segments_in_note?: number;
  symptom_present?: string;
  symptom_detected?: string;
  validated?: string;
  housing_status?: string;
  food_status?: string;
  financial_status?: string;
  mention_id?: string;
  
  // HRSN fields
  ZCode_HRSN?: string;
  sympProb?: string;
  
  // HRSN camelCase variants
  zCodeHrsn?: string;
  symptomProblem?: string;
  
  // CamelCase variants (used by React components)
  symptomId: string;
  symptomSegment: string;
  diagnosticCategory: string;
  diagnosisIcd10Code: string;
  dosDate: string;
  patientId: string;
  userId?: number;
  
  // Additional fields for visualizations
  value?: number;      // For visualizations that need a value
  label?: string;      // Display label for charts
  category?: string;   // Category for grouping
  text?: string;       // Generic text field
  date?: string;       // Generic date field
  group?: string;      // For grouping operations
  serviceDate?: string; // Alternative date field
  
  // Other fields that might be added
  [key: string]: any;  // Allow other properties
}

/**
 * Filter extracted symptom data to only include the selected patient
 */
/**
 * Filter symptoms by type - "Symptom" or "Problem" based on the sympProb field
 */
export const filterSymptomsByType = (
  symptoms: ExtractedSymptom[],
  type: 'Symptom' | 'Problem'
): ExtractedSymptom[] => {
  if (!symptoms || symptoms.length === 0) {
    console.log("No symptoms provided for filtering by type");
    return [];
  }
  
  console.log(`Filtering ${symptoms.length} symptoms by type: ${type}`);
  
  // Debug the actual data fields that are coming from the server
  if (symptoms.length > 0) {
    const sampleSymptom = symptoms[0];
    console.log("FIELD VALUES INSPECTION (from server):", {
      symp_prob: sampleSymptom.symp_prob,
      sympProb: sampleSymptom.sympProb,
      zcode_hrsn: sampleSymptom.zcode_hrsn,
      ZCodeHrsn: sampleSymptom.ZCodeHrsn,
      ZCode_HRSN: sampleSymptom.ZCode_HRSN,
      fieldNames: Object.keys(sampleSymptom).filter(key => 
        key.includes('prob') || key.includes('code') || key.includes('hrsn') || key.includes('HRSN')
      )
    });
  }
  
  // Filter for Problems or Symptoms using ONLY the sympProb field
  const filteredSymptoms = symptoms.filter(symptom => {
    // Check both snake_case and camelCase versions of the symp_prob field
    const sympProbValue = symptom.symp_prob || symptom.sympProb || '';
    
    // Check if the type matches what we're looking for
    return typeof sympProbValue === 'string' && sympProbValue === type;
  });
  
  console.log(`Filtered ${filteredSymptoms.length} ${type} records from ${symptoms.length} total symptoms`);
  
  return filteredSymptoms;
};

export const filterSymptomsByPatient = (
  symptoms: ExtractedSymptom[],
  patientId?: string | null
): ExtractedSymptom[] => {
  // If no patient ID is provided, return all symptoms
  if (!patientId) {
    console.log("No patient ID provided for filtering, returning all symptoms");
    return symptoms;
  }
  
  console.log(`Filtering symptoms by patient ID: ${patientId}`);
  
  // IMPORTANT: Print sample data to see what fields are available
  if (symptoms.length > 0) {
    console.log("First symptom before filtering:", {
      patient_id: symptoms[0].patient_id,
      patientId: symptoms[0].patientId,
      allFields: Object.keys(symptoms[0])
    });
  }
  
  // Filter symptoms to only include the selected patient
  const filteredSymptoms = symptoms.filter(symptom => {
    // Check all possible ways the patient ID might be stored
    const matchesPatientId = 
      symptom.patient_id === patientId || 
      symptom.patientId === patientId ||
      // Also check for string/number type mismatches
      symptom.patient_id === String(patientId) ||
      symptom.patientId === String(patientId) ||
      String(symptom.patient_id) === patientId ||
      String(symptom.patientId) === patientId;
    
    // Debug when patient IDs are missing
    if (!symptom.patient_id && !symptom.patientId) {
      console.warn("Symptom without patient ID:", symptom);
    }
    
    return matchesPatientId;
  });
  
  console.log(`Filtered symptoms: ${filteredSymptoms.length} of ${symptoms.length} total symptoms`);
  
  // Convert all snake_case to camelCase for consistency
  const normalizedSymptoms = filteredSymptoms.map(symptom => {
    // Ensure all fields exist in both snake_case and camelCase formats
    const normalized: ExtractedSymptom = {
      ...symptom,
      // Ensure core fields are always present in both formats with non-null values
      symptom_segment: symptom.symptom_segment || symptom.symptomSegment || "Missing Segment",
      symptomSegment: symptom.symptomSegment || symptom.symptom_segment || "Missing Segment",
      dos_date: symptom.dos_date || symptom.dosDate || "2024-01-01",
      dosDate: symptom.dosDate || symptom.dos_date || "2024-01-01",
      diagnostic_category: symptom.diagnostic_category || symptom.diagnosticCategory || "Uncategorized",
      diagnosticCategory: symptom.diagnosticCategory || symptom.diagnostic_category || "Uncategorized",
      symptom_id: symptom.symptom_id || symptom.symptomId || "missing-id",
      symptomId: symptom.symptomId || symptom.symptom_id || "missing-id",
      patient_id: symptom.patient_id || symptom.patientId || patientId || "missing",
      patientId: symptom.patientId || symptom.patient_id || patientId || "missing",
      diagnosis: symptom.diagnosis || "Undiagnosed",
      symptom_problem: symptom.symptom_problem || symptom.symptomProblem || "Unknown",
      symptomProblem: symptom.symptomProblem || symptom.symptom_problem || "Unknown",
      symp_prob: symptom.symp_prob || symptom.sympProb || "Unknown",
      sympProb: symptom.sympProb || symptom.symp_prob || "Unknown",
      diagnosis_icd10_code: symptom.diagnosis_icd10_code || symptom.diagnosisIcd10Code || "Unknown",
      diagnosisIcd10Code: symptom.diagnosisIcd10Code || symptom.diagnosis_icd10_code || "Unknown",
      id: symptom.id
    };
    
    return normalized;
  });
  
  // Print useful debugging info
  if (normalizedSymptoms.length === 0 && symptoms.length > 0) {
    console.warn("No symptoms match the selected patient. First symptom patient ID:", 
      symptoms[0].patient_id || symptoms[0].patientId);
  } else if (normalizedSymptoms.length > 0) {
    console.log("First filtered & normalized symptom:", normalizedSymptoms[0]);
  }
  
  return normalizedSymptoms;
};

/**
 * Process data for Heatmap visualization
 * @param symptoms The extracted symptoms to process
 * @param groupingKeyName The field name to group by (e.g., 'symptom_segment', 'diagnosis', 'diagnostic_category')
 */
export const processDataForHeatmap = (
  symptoms: ExtractedSymptom[], 
  groupingKeyName: string = 'symptom_segment'
): any[] => {
  console.log(`Processing ${symptoms?.length || 0} symptoms for heatmap with key "${groupingKeyName}"`);
  
  if (!symptoms || symptoms.length === 0) {
    console.log("No symptoms provided for heatmap visualization");
    return [];
  }
  
  try {
    // Track actual key-date combinations that exist in the real data
    const realDataPoints = new Map<string, Set<string>>();
    
    // Get unique values for the key field and dates that ACTUALLY EXIST in the data
    const uniqueKeys = new Set<string>();
    const realDates = new Set<string>();
    const counts: Record<string, Record<string, number>> = {};
    
    // First pass: collect only real dates and keys from actual symptom data
    symptoms.forEach(symptom => {
      // Log the symptom patient ID info
      if (realDataPoints.size === 0) {
        console.log(`Processing symptoms for heatmap with patient ID: ${symptom.patient_id || symptom.patientId}`);
      }
      
      // Get the grouping key (symptomSegment, diagnosis, diagnosticCategory, etc.)
      let groupKey = '';
      
      // Handle snake_case and camelCase variants of the same field
      switch (groupingKeyName) {
        case 'symptom_segment':
        case 'symptomSegment':
          if (symptom.symptom_segment !== undefined && symptom.symptom_segment !== null) {
            groupKey = String(symptom.symptom_segment).trim().replace(/\s+/g, ' ');
          } else if (symptom.symptomSegment !== undefined && symptom.symptomSegment !== null) {
            groupKey = String(symptom.symptomSegment).trim().replace(/\s+/g, ' ');
          } else {
            // Skip this symptom if it doesn't have a valid segment
            return;
          }
          break;
          
        case 'diagnosis':
          if (symptom.diagnosis !== undefined && symptom.diagnosis !== null) {
            groupKey = symptom.diagnosis;
          } else {
            // Skip this symptom if it doesn't have a valid diagnosis
            return;
          }
          break;
          
        case 'diagnostic_category':
        case 'diagnosticCategory':
          if (symptom.diagnostic_category !== undefined && symptom.diagnostic_category !== null) {
            groupKey = symptom.diagnostic_category;
          } else if (symptom.diagnosticCategory !== undefined && symptom.diagnosticCategory !== null) {
            groupKey = symptom.diagnosticCategory;
          } else {
            // Skip this symptom if it doesn't have a valid category
            return;
          }
          break;
          
        default:
          // Try direct access using the given field name
          const directValue = symptom[groupingKeyName] as string | undefined | null;
          if (directValue !== undefined && directValue !== null) {
            groupKey = directValue;
          } else {
            // Try camelCase and snake_case variants as a fallback
            const camelCaseKey = groupingKeyName.includes('_') ? 
                                convertToCamelCase(groupingKeyName) : null;
            const snakeCaseKey = /[A-Z]/.test(groupingKeyName) ? 
                                convertToSnakeCase(groupingKeyName) : null;
            
            if (camelCaseKey && symptom[camelCaseKey] !== undefined && symptom[camelCaseKey] !== null) {
              groupKey = symptom[camelCaseKey] as string;
            } else if (snakeCaseKey && symptom[snakeCaseKey] !== undefined && symptom[snakeCaseKey] !== null) {
              groupKey = symptom[snakeCaseKey] as string;
            } else {
              // Skip this symptom if we can't find the grouping field
              return;
            }
          }
      }
      
      // Skip if the group key is empty after all our checks
      if (!groupKey || groupKey.trim() === '') {
        return;
      }
      
      // Get the date string
      const dateStr = symptom.dos_date || symptom.dosDate;
      if (!dateStr) {
        // Skip if no date available
        return;
      }
      
      // Format date consistently for display
      let formattedDate: string;
      try {
        const date = new Date(dateStr);
        formattedDate = date.toLocaleDateString('en-US', { 
          month: 'numeric', day: 'numeric', year: '2-digit' 
        });
      } catch (e) {
        console.error('Error parsing date:', dateStr, e);
        return; // Skip this symptom if date can't be parsed
      }
      
      // Only add keys and dates that actually exist in the data
      uniqueKeys.add(groupKey);
      realDates.add(formattedDate);
      
      // Track which key-date combinations exist in the real data
      if (!realDataPoints.has(groupKey)) {
        realDataPoints.set(groupKey, new Set<string>());
      }
      realDataPoints.get(groupKey)?.add(formattedDate);
      
      // Initialize counts if needed
      if (!counts[groupKey]) {
        counts[groupKey] = {};
      }
      
      // Update counts - only for real data points
      counts[groupKey][formattedDate] = (counts[groupKey][formattedDate] || 0) + 1;
    });
    
    // If we didn't collect any valid data points, return empty array
    if (uniqueKeys.size === 0 || realDates.size === 0) {
      console.log('No valid data points found for heatmap');
      return [];
    }
    
    // Sort actual dates chronologically
    const sortedDates = Array.from(realDates).sort((a, b) => {
      // Parse dates considering different formats
      const parseDate = (dateStr: string) => {
        try {
          if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/').map(Number);
            return new Date(2000 + year, month - 1, day);
          } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day);
          } else {
            return new Date(dateStr);
          }
        } catch (e) {
          console.error('Error parsing date:', dateStr, e);
          return new Date();
        }
      };
      
      return parseDate(a).getTime() - parseDate(b).getTime();
    });
    
    console.log('Only including these real dates for heatmap:', sortedDates);
    
    // Convert to Nivo heatmap format - ONLY include real data points
    const heatmapData = Array.from(uniqueKeys).map(key => {
      const rowData = [];
      
      // Only include dates that actually have data for this key
      const keyDates = realDataPoints.get(key);
      if (!keyDates) return { id: key, data: [] };
      
      // CRITICAL: Only add data points for dates where this key actually has data
      const validDataPoints: Array<{x: string, y: number}> = [];
      Array.from(keyDates).forEach(date => {
        const count = counts[key][date] || 0;
        if (count > 0) {
          validDataPoints.push({
            x: date,
            y: count
          });
        }
      });
      
      return {
        id: key,
        data: validDataPoints
      };
    }).filter(item => item.data.length > 0); // Only include items with actual data
    
    // Debug the final data structure
    console.log('Processed heatmap data:', {
      groupCount: heatmapData.length,
      dateCount: sortedDates.length,
      firstGroup: heatmapData[0]?.id,
      datesIncluded: sortedDates
    });
    
    // Sort by most frequent items first (most important at the top)
    return heatmapData.sort((a, b) => {
      const aTotal = a.data.reduce((sum, d) => sum + d.y, 0);
      const bTotal = b.data.reduce((sum, d) => sum + d.y, 0);
      return bTotal - aTotal;
    });
  } catch (error) {
    console.error('Error processing data for heatmap:', error);
    return [];
  }
};

/**
 * Process data for Bubble Chart visualization
 */
export const processDataForBubbleChart = (symptoms: ExtractedSymptom[]): any => {
  console.log("Processing real data for bubble chart, symptom count:", symptoms?.length || 0);
  
  if (!symptoms || symptoms.length === 0) {
    return [];
  }
  
  // Get dates for temporal analysis
  const dateSet = new Set<string>();
  symptoms.forEach(symptom => {
    const dateStr = symptom.dos_date || symptom.dosDate;
    if (dateStr) {
      dateSet.add(dateStr);
    }
  });
  const allDates = Array.from(dateSet);
  console.log("Real dates found for bubble chart:", allDates);
  
  // Group symptoms by segmentId+date and count occurrences
  const symptomsByIdAndDate: Record<string, Record<string, number>> = {};
  const symptomsMetadata: Record<string, {
    id: number,
    label: string,
    diagnosis: string,
    category: string
  }> = {};
  
  symptoms.forEach(symptom => {
    // Get segment ID from either snake_case or camelCase field
    let segmentId = symptom.symptom_segment || symptom.symptomSegment;
    
    // Skip if no segment ID
    if (!segmentId) return;
    
    // Normalize whitespace in the symptom segment
    if (typeof segmentId === 'string') {
      segmentId = segmentId.trim().replace(/\s+/g, ' ');
    }
    
    const dateStr = symptom.dos_date || symptom.dosDate;
    if (!dateStr) return;
    
    // Initialize segment metadata if needed
    if (!symptomsMetadata[segmentId]) {
      symptomsMetadata[segmentId] = {
        id: symptom.id,
        label: segmentId,
        diagnosis: symptom.diagnosis || 'Unknown',
        category: symptom.diagnostic_category || symptom.diagnosticCategory || 'Uncategorized'
      };
    }
    
    // Initialize segment+date counter if needed
    if (!symptomsByIdAndDate[segmentId]) {
      symptomsByIdAndDate[segmentId] = {};
    }
    
    // Count occurrences by date
    if (!symptomsByIdAndDate[segmentId][dateStr]) {
      symptomsByIdAndDate[segmentId][dateStr] = 1;
    } else {
      symptomsByIdAndDate[segmentId][dateStr]++;
    }
  });
  
  // Convert to array for visualization
  const processedData = Object.entries(symptomsByIdAndDate).map(([segmentId, dateCounts]) => {
    // Calculate total occurrences across all dates
    const totalCount = Object.values(dateCounts).reduce((sum, count) => sum + count, 0);
    
    // Get metadata for this segment
    const metadata = symptomsMetadata[segmentId];
    
    return {
      id: metadata.id,
      label: segmentId,
      value: totalCount, // Size based on total frequency
      category: metadata.category,
      diagnosis: metadata.diagnosis,
      color: getColorForCategory(metadata.category),
      // Add date-based data for temporal visualization
      dateData: allDates.map(date => ({
        date, 
        count: dateCounts[date] || 0
      }))
    };
  });
  
  // Sort by frequency (highest first) and limit to the top 50 for performance
  return processedData
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
};

/**
 * Process data for Diagnostic Categories Pie Chart
 */
export const processDataForDiagnosticCategories = (symptoms: ExtractedSymptom[]): any[] => {
  if (!symptoms || symptoms.length === 0) {
    return [];
  }
  
  // Count symptom occurrences by diagnostic category
  const categoryCounts: Record<string, number> = {};
  
  symptoms.forEach(symptom => {
    const category = symptom.diagnostic_category || symptom.diagnosticCategory || 'Uncategorized';
    
    if (!categoryCounts[category]) {
      categoryCounts[category] = 1;
    } else {
      categoryCounts[category]++;
    }
  });
  
  // Convert to array format for Nivo pie chart
  const processedData = Object.entries(categoryCounts).map(([category, count]) => ({
    id: category,
    label: category,
    value: count,
    color: getColorForCategory(category)
  }));
  
  return processedData;
};

/**
 * Process data for Symptom Problems Bar Chart
 */
export const processDataForSymptomProblems = (symptoms: ExtractedSymptom[]): any[] => {
  if (!symptoms || symptoms.length === 0) {
    return [];
  }
  
  // Count symptom occurrences by diagnostic category
  const problemCounts: Record<string, number> = {};
  
  symptoms.forEach(symptom => {
    // Try to get symptom problem from various fields (supporting both snake_case and camelCase)
    const problem = 
      symptom.diagnosis || 
      symptom.symptom_problem || symptom.symptomProblem || 
      symptom.symp_prob || symptom.sympProb || 
      'Uncategorized';
    
    if (!problemCounts[problem]) {
      problemCounts[problem] = 1;
    } else {
      problemCounts[problem]++;
    }
  });
  
  // Convert to array format for Nivo bar chart
  const processedData = Object.entries(problemCounts)
    .map(([problem, count]) => ({
      id: problem,
      value: count,
      label: problem,
      color: getRandomColor()
    }))
    .sort((a, b) => b.value - a.value); // Sort by frequency
  
  return processedData;
};

// Helper function to get a color for a category
function getColorForCategory(category: string): string {
  const categoryColors: Record<string, string> = {
    'Depressive Disorders': '#FF6384',
    'Non-Categorical Disorders': '#36A2EB',
    'Safety': '#FFCD56',
    'Substance-Related Disorders': '#4BC0C0',
    'Bipolar & Related Disorders': '#9966FF',
    'Anxiety Disorders': '#FF9F40',
    'Uncategorized': '#C7C7C7',
  };
  
  return categoryColors[category] || getRandomColor();
}

// Convert snake_case to camelCase
function convertToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert camelCase to snake_case
function convertToSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Helper function to generate a random color
function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}