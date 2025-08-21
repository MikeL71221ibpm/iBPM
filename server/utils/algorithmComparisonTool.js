/**
 * Symptom Matcher Algorithm Comparison Tool
 * 
 * This utility performs automated comparison between different symptom matcher
 * versions (original vs. V3.2) across the entire symptom database.
 * 
 * It runs scheduled comparisons and generates comprehensive reports
 * showing differences in matching performance.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { storage } = require('../storage');
const { extractSymptoms } = require('./symptomExtractor'); // Original matcher
const { extractSymptoms: extractSymptomsV32 } = require('./symptomExtractorV3_2'); // V3.2 matcher
const schedule = require('node-schedule');

// Promisify file operations
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

// Base directory for reports
const REPORTS_DIR = path.join(process.cwd(), 'reports', 'algorithm_comparison');

/**
 * Run a full comparison between symptom matcher algorithms
 * @param {Object} options - Comparison options
 * @returns {Object} Comparison results
 */
async function runAlgorithmComparison(options = {}) {
  try {
    console.log('Starting full algorithm comparison...');
    const startTime = Date.now();
    
    // Set default options
    const config = {
      sampleSize: options.sampleSize || -1, // -1 means use all available notes
      preserveDuplicates: options.preserveDuplicates !== false,
      useWordBoundaries: options.useWordBoundaries !== false,
      considerNegation: options.considerNegation !== false,
      saveReport: options.saveReport !== false,
      logProgress: options.logProgress !== false,
      ...options
    };
    
    // Step 1: Get all clinical notes
    let allNotes = [];
    try {
      if (config.logProgress) console.log('Retrieving all clinical notes...');
      allNotes = await getAllClinicalNotes();
      if (config.logProgress) console.log(`Retrieved ${allNotes.length} clinical notes for comparison`);
    } catch (error) {
      console.error('Error retrieving clinical notes:', error);
      throw new Error('Failed to retrieve clinical notes for comparison');
    }
    
    // Step 2: Get symptom master data (reference database)
    let symptomMaster = [];
    try {
      if (config.logProgress) console.log('Loading symptom reference database...');
      symptomMaster = await storage.getSymptomMaster();
      if (config.logProgress) console.log(`Loaded ${symptomMaster.length} reference symptoms`);
    } catch (error) {
      console.error('Error retrieving symptom master:', error);
      throw new Error('Failed to retrieve symptom master data');
    }
    
    // Step 3: Apply sampling if requested
    let notesForProcessing = allNotes;
    if (config.sampleSize > 0 && config.sampleSize < allNotes.length) {
      if (config.logProgress) console.log(`Using sample of ${config.sampleSize} notes`);
      notesForProcessing = getRandomSample(allNotes, config.sampleSize);
    }
    
    // Processing options
    const processingOptions = {
      preserveDuplicates: config.preserveDuplicates,
      debug: true, // We want organization data
      useWordBoundaries: config.useWordBoundaries,
      considerNegation: config.considerNegation
    };
    
    // Step 4: Process with original algorithm
    if (config.logProgress) console.log('Processing with original algorithm...');
    const originalResults = await extractSymptoms(notesForProcessing, symptomMaster);
    if (config.logProgress) console.log(`Original algorithm extracted ${originalResults.length || 0} symptoms`);
    
    // Step 5: Process with V3.2 algorithm
    if (config.logProgress) console.log('Processing with V3.2 algorithm...');
    const v32Results = await extractSymptomsV32(notesForProcessing, symptomMaster, processingOptions);
    if (config.logProgress) console.log(`V3.2 algorithm extracted ${v32Results.extractedSymptoms.length || 0} symptoms`);
    
    // Step 6: Calculate comparison metrics
    if (config.logProgress) console.log('Calculating comparison metrics...');
    const comparisonMetrics = calculateComparisonMetrics(originalResults, v32Results.extractedSymptoms);
    
    // Get organization summary if available
    const organizationSummary = v32Results.organizationData ? {
      bySymptomSegment: Object.keys(v32Results.organizationData.bySymptomSegment).length,
      byDiagnosis: Object.keys(v32Results.organizationData.byDiagnosis).length,
      byCategory: Object.keys(v32Results.organizationData.byCategory).length,
      byDiagnosisCode: Object.keys(v32Results.organizationData.byDiagnosisCode).length
    } : undefined;
    
    // Step 7: Prepare final comparison report
    const comparisonReport = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      notesProcessed: notesForProcessing.length,
      comparisonMetrics,
      originalAlgorithm: {
        version: 'v3.0',
        extractedCount: originalResults.length || 0,
      },
      v32Algorithm: {
        version: 'v3.2',
        extractedCount: v32Results.extractedSymptoms.length || 0,
        organizationSummary
      },
      processingOptions: config
    };
    
    // Step 8: Save report if requested
    if (config.saveReport) {
      await saveComparisonReport(comparisonReport);
      if (config.logProgress) console.log('Comparison report saved');
    }
    
    if (config.logProgress) console.log('Algorithm comparison completed');
    
    return comparisonReport;
  } catch (error) {
    console.error('Error during algorithm comparison:', error);
    throw error;
  }
}

/**
 * Get all clinical notes from the database
 * @returns {Promise<Array>} Array of clinical notes
 */
async function getAllClinicalNotes() {
  // Get all patient IDs from the database
  const patients = await storage.getPatients();
  
  const allNotes = [];
  for (const patient of patients) {
    try {
      // Use the appropriate method based on what's available in storage
      const patientId = patient.id || patient.patient_id;
      const notes = await (storage.getClinicalNotesByPatientId ? 
                           storage.getClinicalNotesByPatientId(patientId) : 
                           storage.getNotesByPatientId(patientId));
      
      if (notes && notes.length > 0) {
        allNotes.push(...notes);
      }
    } catch (error) {
      console.error(`Error retrieving notes for patient ${patient.id}:`, error);
    }
  }
  
  return allNotes;
}

/**
 * Get a random sample of notes
 * @param {Array} notes - All clinical notes
 * @param {number} sampleSize - Number of notes to sample
 * @returns {Array} Sample of notes
 */
function getRandomSample(notes, sampleSize) {
  if (sampleSize >= notes.length) return notes;
  
  // Fisher-Yates shuffle algorithm
  const shuffled = [...notes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, sampleSize);
}

/**
 * Calculate comparison metrics between algorithms
 * @param {Array} originalResults - Results from original algorithm
 * @param {Array} v32Results - Results from V3.2 algorithm
 * @returns {Object} Comparison metrics
 */
function calculateComparisonMetrics(originalResults, v32Results) {
  // Create maps of symptoms for faster lookup
  const originalMap = new Map();
  const v32Map = new Map();
  
  // Normalize and map original results
  originalResults.forEach(symptom => {
    const key = `${symptom.patient_id}-${symptom.symptom_segment.toLowerCase()}-${symptom.dos_date || 'unknown_date'}`;
    originalMap.set(key, symptom);
  });
  
  // Normalize and map V3.2 results
  v32Results.forEach(symptom => {
    const key = `${symptom.patient_id}-${symptom.symptom_segment.toLowerCase()}-${symptom.dos_date || 'unknown_date'}`;
    v32Map.set(key, symptom);
  });
  
  // Calculate shared and unique matches
  const sharedKeys = new Set();
  const uniqueToOriginal = new Set();
  const uniqueToV32 = new Set();
  
  // Find shared and unique to original
  for (const key of originalMap.keys()) {
    if (v32Map.has(key)) {
      sharedKeys.add(key);
    } else {
      uniqueToOriginal.add(key);
    }
  }
  
  // Find unique to V3.2
  for (const key of v32Map.keys()) {
    if (!originalMap.has(key)) {
      uniqueToV32.add(key);
    }
  }
  
  // Calculate performance improvement
  const improvement = v32Map.size - originalMap.size;
  const improvementPercentage = originalMap.size > 0 ? 
    (improvement / originalMap.size) * 100 : 0;
  
  // Categorize improvements by symptom type
  const categoryImprovements = {};
  const diagnosisImprovements = {};
  
  // Analyze improvements by category
  for (const key of uniqueToV32) {
    const symptom = v32Map.get(key);
    const category = symptom.category || 'unknown';
    const diagnosis = symptom.diagnosis || 'unknown';
    
    // Update category counts
    if (!categoryImprovements[category]) {
      categoryImprovements[category] = 0;
    }
    categoryImprovements[category]++;
    
    // Update diagnosis counts
    if (!diagnosisImprovements[diagnosis]) {
      diagnosisImprovements[diagnosis] = 0;
    }
    diagnosisImprovements[diagnosis]++;
  }
  
  return {
    originalTotal: originalMap.size,
    v32Total: v32Map.size,
    shared: sharedKeys.size,
    uniqueToOriginal: uniqueToOriginal.size,
    uniqueToV32: uniqueToV32.size,
    improvement,
    improvementPercentage,
    categoryImprovements,
    diagnosisImprovements,
    
    // Calculate precision and recall metrics
    // Using original as "ground truth" for reference
    recall: sharedKeys.size / originalMap.size, // How many of original were found by V3.2
    precision: sharedKeys.size / v32Map.size,   // What percentage of V3.2 matches were "correct"
    f1Score: 2 * ((sharedKeys.size / originalMap.size) * (sharedKeys.size / v32Map.size)) / 
             ((sharedKeys.size / originalMap.size) + (sharedKeys.size / v32Map.size))
  };
}

/**
 * Save comparison report to file
 * @param {Object} report - Comparison report
 * @returns {Promise<string>} Path to saved report
 */
async function saveComparisonReport(report) {
  try {
    // Create reports directory if it doesn't exist
    await mkdir(REPORTS_DIR, { recursive: true });
    
    // Generate report filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `algorithm_comparison_${timestamp}.json`;
    const filePath = path.join(REPORTS_DIR, filename);
    
    // Write report to file
    await writeFile(filePath, JSON.stringify(report, null, 2));
    
    // Also update the latest report reference
    const latestPath = path.join(REPORTS_DIR, 'latest_comparison.json');
    await writeFile(latestPath, JSON.stringify(report, null, 2));
    
    return filePath;
  } catch (error) {
    console.error('Error saving comparison report:', error);
    throw error;
  }
}

/**
 * Get the latest comparison report
 * @returns {Promise<Object>} Latest comparison report
 */
async function getLatestComparisonReport() {
  try {
    const latestPath = path.join(REPORTS_DIR, 'latest_comparison.json');
    if (!fs.existsSync(latestPath)) {
      return null;
    }
    
    const reportData = await readFile(latestPath, 'utf8');
    return JSON.parse(reportData);
  } catch (error) {
    console.error('Error reading latest comparison report:', error);
    return null;
  }
}

/**
 * Get all comparison reports
 * @returns {Promise<Array>} Array of comparison reports
 */
async function getAllComparisonReports() {
  try {
    // Create reports directory if it doesn't exist
    await mkdir(REPORTS_DIR, { recursive: true });
    
    // Get all report files
    const files = await readdir(REPORTS_DIR);
    const reportFiles = files.filter(file => 
      file !== 'latest_comparison.json' && file.endsWith('.json')
    );
    
    // Sort reports by timestamp (newest first)
    reportFiles.sort((a, b) => {
      const aTime = a.match(/algorithm_comparison_(.+)\.json/)[1];
      const bTime = b.match(/algorithm_comparison_(.+)\.json/)[1];
      return bTime.localeCompare(aTime);
    });
    
    // Load report data
    const reports = [];
    for (const file of reportFiles) {
      try {
        const reportData = await readFile(path.join(REPORTS_DIR, file), 'utf8');
        reports.push(JSON.parse(reportData));
      } catch (error) {
        console.error(`Error reading report ${file}:`, error);
      }
    }
    
    return reports;
  } catch (error) {
    console.error('Error retrieving comparison reports:', error);
    return [];
  }
}

/**
 * Schedule regular algorithm comparisons
 * @param {string} schedule - Cron schedule expression
 * @param {Object} options - Comparison options
 * @returns {Object} Scheduled job
 */
function scheduleRegularComparisons(cronSchedule = '0 2 * * 0', options = {}) {
  console.log(`Scheduling algorithm comparisons with cron: ${cronSchedule}`);
  
  // Schedule job using node-schedule
  const job = schedule.scheduleJob(cronSchedule, async () => {
    try {
      console.log(`Running scheduled algorithm comparison at ${new Date().toISOString()}`);
      await runAlgorithmComparison({
        saveReport: true,
        logProgress: true,
        ...options
      });
      console.log('Scheduled comparison completed successfully');
    } catch (error) {
      console.error('Error in scheduled comparison:', error);
    }
  });
  
  return job;
}

// Export functions for use in other modules
module.exports = {
  runAlgorithmComparison,
  getLatestComparisonReport,
  getAllComparisonReports,
  scheduleRegularComparisons
};