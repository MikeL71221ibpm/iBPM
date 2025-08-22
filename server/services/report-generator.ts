// Report Generator Service for Daily Patient Reports
// Generates 4 bubble charts + narrative summary per patient

import { PatientMatcher, MatchResult } from './patient-matcher';
import { db } from '../db';
import { extractedSymptoms } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { ChartGeneratorService, BubbleChartDataPoint } from './chart-generator';

export interface PatientReport {
  patient: {
    patient_id: string;
    patient_name: string;
    scheduled_fields: any;
  };
  bubbleCharts: {
    hrsn: any[];
    diagnosis: any[];
    category: any[];
    symptom: any[];
  };
  chartImages?: {
    symptoms: Buffer;
    diagnoses: Buffer;
    hrsn: Buffer;
    categories: Buffer;
  };
  narrativeSummary: string;
  status: 'success' | 'no_data' | 'error';
}

export interface BatchReportResult {
  reports: PatientReport[];
  summary: {
    total: number;
    successful: number;
    no_data: number;
    errors: number;
  };
}

export class ReportGenerator {
  private chartGenerator: ChartGeneratorService;

  constructor(private userId: number) {
    this.chartGenerator = new ChartGeneratorService(userId);
  }

  async generateBatchReports(
    matchResults: MatchResult[], 
    progressCallback?: (currentIndex: number, total: number) => Promise<void> | void,
    useGridFormat = false
  ): Promise<BatchReportResult> {
    const reports: PatientReport[] = [];
    const validMatches = matchResults.filter(m => m.status === 'found' && m.matched);
    
    console.log(`🚀 PARALLEL PROCESSING: Processing ${validMatches.length} patients with optimized batching`);
    
    // PERMANENT PARALLEL PROCESSING: Process in batches of 5 for optimal performance
    const BATCH_SIZE = 5;
    const batches: MatchResult[][] = [];
    
    for (let i = 0; i < validMatches.length; i += BATCH_SIZE) {
      batches.push(validMatches.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`⚡ BATCH CONFIGURATION: ${batches.length} batches of up to ${BATCH_SIZE} patients each (PERMANENT)`);
    
    let completedPatients = 0;
    
    // Process all batches with parallel execution within each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📊 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} patients (PARALLEL)`);
      
      // PARALLEL EXECUTION: All patients in this batch process simultaneously
      const batchPromises = batch.map(match => 
        this.generateSinglePatientReport(match, useGridFormat)
      );
      
      const batchReports = await Promise.all(batchPromises);
      reports.push(...batchReports);
      
      completedPatients += batch.length;
      
      // Update progress for the entire batch
      if (progressCallback) {
        await progressCallback(completedPatients, validMatches.length);
      }
      
      console.log(`✅ PARALLEL BATCH ${batchIndex + 1} COMPLETE: ${completedPatients}/${validMatches.length} patients processed`);
    }
    
    // Add unmatched patients as error reports
    for (const match of matchResults) {
      if (match.status !== 'found' || !match.matched) {
        reports.push({
          patient: {
            patient_id: match.scheduled?.patient_id || 'Unknown',
            patient_name: match.scheduled?.patient_name || 'Unknown',
            scheduled_fields: match.scheduled || {}
          },
          bubbleCharts: {
            hrsn: [],
            diagnosis: [],
            category: [],
            symptom: []
          },
          narrativeSummary: `Patient not found in database. Status: ${match.status}`,
          status: 'no_data'
        });
      }
    }

    const summary = {
      total: reports.length,
      successful: reports.filter(r => r.status === 'success').length,
      no_data: reports.filter(r => r.status === 'no_data').length,
      errors: reports.filter(r => r.status === 'error').length,
    };

    return { reports, summary };
  }

  private async generateSinglePatientReport(match: MatchResult, useGridFormat = false): Promise<PatientReport> {
    try {
      const patient = match.matched;
      const patientId = patient.patient_id;

      // PERFORMANCE OPTIMIZATION: Get all patient data in parallel for maximum speed
      const [symptomData, bubbleChartsData, narrativeSummary, chartImages] = await Promise.all([
        this.getPatientSymptoms(patientId),
        this.generateBubbleChartsData(patientId),
        this.generateNarrativeSummary(patientId, patient, useGridFormat),
        this.generateChartImages(patientId)
      ]);
      
      console.log(`⚡ Patient ${patientId}: Generated ${symptomData.length} symptoms, 4 charts, summary (${useGridFormat ? 'GRID' : 'LINEAR'})`);

      return {
        patient: {
          patient_id: patientId,
          patient_name: patient.patient_name,
          scheduled_fields: match.scheduled
        },
        bubbleCharts: bubbleChartsData,
        chartImages,
        narrativeSummary,
        status: symptomData.length > 0 ? 'success' : 'no_data'
      };

    } catch (error) {
      console.error('Error generating patient report:', error);
      return {
        patient: {
          patient_id: match.scheduled.patient_id,
          patient_name: match.scheduled.patient_name,
          scheduled_fields: match.scheduled
        },
        bubbleCharts: {
          hrsn: [],
          diagnosis: [],
          category: [],
          symptom: []
        },
        narrativeSummary: 'Error generating report',
        status: 'error'
      };
    }
  }

  private async getPatientSymptoms(patientId: string) {
    return await db
      .select()
      .from(extractedSymptoms)
      .where(
        and(
          eq(extractedSymptoms.user_id, this.userId),
          eq(extractedSymptoms.patient_id, patientId)
        )
      );
  }

  private async getPatientNotes(patientId: string) {
    // Get notes data - using same approach as Search section
    return await db
      .select()
      .from(extractedSymptoms)
      .where(
        and(
          eq(extractedSymptoms.user_id, this.userId),
          eq(extractedSymptoms.patient_id, patientId)
        )
      );
  }

  private async generateChartImages(patientId: string) {
    try {
      const [symptoms, diagnoses, hrsn, categories] = await Promise.all([
        this.chartGenerator.generatePatientBubbleChart(patientId, 'symptoms'),
        this.chartGenerator.generatePatientBubbleChart(patientId, 'diagnoses'),
        this.chartGenerator.generatePatientBubbleChart(patientId, 'hrsn'),
        this.chartGenerator.generatePatientBubbleChart(patientId, 'categories')
      ]);

      return { symptoms, diagnoses, hrsn, categories };
    } catch (error) {
      console.error('Error generating chart images:', error);
      // Return empty chart images if generation fails
      const emptyChart = await this.chartGenerator.generateEmptyChart('No Data Available');
      return {
        symptoms: emptyChart,
        diagnoses: emptyChart,
        hrsn: emptyChart,
        categories: emptyChart
      };
    }
  }

  private async generateBubbleChartsData(patientId: string) {
    // Keep legacy data structure for compatibility
    const bubbleData = {
      hrsn: [],
      diagnosis: [],
      category: [],
      symptom: []
    };

    return bubbleData;
  }

  private async generateNarrativeSummary(patientId: string, patient: any, useGridFormat = false): Promise<string> {
    // Use EXACT same Summary algorithm as Search section
    const symptoms = await this.getPatientSymptoms(patientId);
    
    if (symptoms.length === 0) {
      return `No clinical data available for ${patient.patient_name} (ID: ${patientId}).`;
    }
    
    if (useGridFormat) {
      return this.generateGridFormatSummary(patientId, patient, symptoms);
    }

    // Get all notes for contact and provider counting
    const notes = await this.getPatientNotes(patientId);
    const summaryThreshold = 10; // Default threshold matching frontend
    
    // Calculate unique providers
    const uniqueProviders = new Set(notes.map(note => note.provider_id || 'unknown')).size;
    
    // Calculate date range
    const dates = notes
      .map(note => note.dos_date)
      .filter(date => date)
      .sort();
    const firstDate = dates[0] || "N/A";
    const lastDate = dates[dates.length - 1] || "N/A";
    
    // Get diagnosis information
    const diagnosis1 = patient.diagnosis1 || '';
    const diagnosis2 = patient.diagnosis2 || '';
    const diagnosis3 = patient.diagnosis3 || '';
    const diagnoses = [diagnosis1, diagnosis2, diagnosis3].filter(d => d && d !== '[Diagnosis data not available]');
    const diagnosisText = diagnoses.length > 0 ? diagnoses.join('; ') : '[No diagnosis on record]';
    
    // Calculate symptom frequencies - EXACT algorithm from frontend
    const symptomFreq: Record<string, number> = {};
    symptoms.forEach(item => {
      const symptom = item.symptom_segment || '';
      if (symptom && symptom.trim()) {
        symptomFreq[symptom] = (symptomFreq[symptom] || 0) + 1;
      }
    });
    
    // Group symptoms by frequency
    const maxFreq = Math.max(...Object.values(symptomFreq), 0);
    const symptomOutput = [];
    
    for (let i = Math.max(maxFreq, summaryThreshold); i >= 1; i--) {
      let currentSymptoms: string[] = [];
      
      if (i === summaryThreshold) {
        // Group for threshold and above
        currentSymptoms = Object.entries(symptomFreq)
          .filter(([_, freq]) => freq >= summaryThreshold)
          .map(([name]) => name)
          .sort();
      } else if (i < summaryThreshold) {
        // Individual counts below threshold
        currentSymptoms = Object.entries(symptomFreq)
          .filter(([_, freq]) => freq === i)
          .map(([name]) => name)
          .sort();
      }
      
      if (currentSymptoms.length > 0) {
        let displayText;
        if (i === summaryThreshold && summaryThreshold > 1) {
          displayText = `${summaryThreshold} times or more`;
        } else {
          const timesText = i === 1 ? 'time' : 'times';
          displayText = `${i} ${timesText}`;
        }
        
        symptomOutput.push(`- these symptoms ${displayText} over the timeperiod [${currentSymptoms.join(', ')}];`);
      }
    }
    
    // Calculate diagnosis trends - EXACT algorithm from frontend
    const diagnosisSymptomCount: Record<string, number> = {};
    symptoms.forEach(item => {
      const diagnosis = item.diagnosis || '';
      if (diagnosis && diagnosis.trim()) {
        diagnosisSymptomCount[diagnosis] = (diagnosisSymptomCount[diagnosis] || 0) + 1;
      }
    });
    
    const maxDiagCount = Math.max(...Object.values(diagnosisSymptomCount), 0);
    const diagnosisOutput = [];
    
    for (let i = Math.max(maxDiagCount, summaryThreshold); i >= 1; i--) {
      let currentDiagnoses: string[] = [];
      
      if (i === summaryThreshold) {
        currentDiagnoses = Object.entries(diagnosisSymptomCount)
          .filter(([_, count]) => count >= summaryThreshold)
          .map(([name]) => name)
          .sort();
      } else if (i < summaryThreshold) {
        currentDiagnoses = Object.entries(diagnosisSymptomCount)
          .filter(([_, count]) => count === i)
          .map(([name]) => name)
          .sort();
      }
      
      if (currentDiagnoses.length > 0) {
        let displayText;
        if (i >= summaryThreshold && summaryThreshold > 1) {
          const symptomText = summaryThreshold <= 1 ? 'symptom' : 'symptoms';
          displayText = `${summaryThreshold} ${symptomText} or more`;
        } else {
          const symptomText = i === 1 ? 'symptom' : 'symptoms';
          displayText = `${i} ${symptomText}`;
        }
        
        diagnosisOutput.push(`- these diagnoses had ${displayText} associated with them over the timeperiod [${currentDiagnoses.join(', ')}]`);
      }
    }
    
    // Calculate diagnostic category trends - EXACT algorithm from frontend
    const categoryDiagnosisCount: Record<string, Set<string>> = {};
    symptoms.forEach(item => {
      const category = item.diagnostic_category || '';
      const diagnosis = item.diagnosis || '';
      if (category && category.trim() && diagnosis && diagnosis.trim()) {
        if (!categoryDiagnosisCount[category]) {
          categoryDiagnosisCount[category] = new Set();
        }
        categoryDiagnosisCount[category].add(diagnosis);
      }
    });
    
    // Convert sets to counts
    const categoryCounts: Record<string, number> = {};
    Object.entries(categoryDiagnosisCount).forEach(([category, diagnosisSet]) => {
      categoryCounts[category] = diagnosisSet.size;
    });
    
    const maxCatCount = Math.max(...Object.values(categoryCounts), 0);
    const categoryOutput = [];
    
    for (let i = Math.max(maxCatCount, summaryThreshold); i >= 1; i--) {
      let currentCategories: string[] = [];
      
      if (i === summaryThreshold) {
        currentCategories = Object.entries(categoryCounts)
          .filter(([_, count]) => count >= summaryThreshold)
          .map(([name]) => name)
          .sort();
      } else if (i < summaryThreshold) {
        currentCategories = Object.entries(categoryCounts)
          .filter(([_, count]) => count === i)
          .map(([name]) => name)
          .sort();
      }
      
      if (currentCategories.length > 0) {
        let displayText;
        if (i >= summaryThreshold && summaryThreshold > 1) {
          const diagnosisText = summaryThreshold <= 1 ? 'diagnosis' : 'diagnoses';
          displayText = `${summaryThreshold} ${diagnosisText} or more`;
        } else {
          const diagnosisText = i === 1 ? 'diagnosis' : 'diagnoses';
          displayText = `${i} ${diagnosisText}`;
        }
        
        categoryOutput.push(`- these diagnostic categories had ${displayText} associated with them over the timeperiod [${currentCategories.join(', ')}]`);
      }
    }
    
    // Calculate Last Two Sessions - EXACT algorithm from frontend
    const sortedNotes = [...notes].sort((a, b) => {
      const dateA = new Date(a.dos_date || 0);
      const dateB = new Date(b.dos_date || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    const lastTwoSessions = sortedNotes.slice(0, 2);
    const lastTwoDates = lastTwoSessions.map(note => note.dos_date);
    
    const lastTwoSymptoms: Record<string, number> = {};
    symptoms.forEach(item => {
      const itemPatientId = String(item.patient_id || '');
      const selectedPatientId = String(patientId || '');
      const itemDate = item.dos_date;
      
      const dateMatches = lastTwoDates.some(lastDate => {
        return itemDate === lastDate || 
               (itemDate && lastDate && new Date(itemDate).getTime() === new Date(lastDate).getTime());
      });
      
      if (itemPatientId === selectedPatientId && dateMatches) {
        const symptom = item.symptom_segment || '';
        if (symptom && symptom.trim()) {
          lastTwoSymptoms[symptom] = (lastTwoSymptoms[symptom] || 0) + 1;
        }
      }
    });
    
    const sortedLastTwo = Object.entries(lastTwoSymptoms)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');
    
    // Calculate HRSN Trends - EXACT algorithm from frontend
    const hrsnProblems: Record<string, number> = {};
    symptoms.forEach(item => {
      if (item.symp_prob === "Problem") {
        const symptom = item.symptom_segment || '';
        if (symptom && symptom.trim()) {
          hrsnProblems[symptom] = (hrsnProblems[symptom] || 0) + 1;
        }
      }
    });
    
    const maxHrsnFreq = Math.max(...Object.values(hrsnProblems), 0);
    const hrsnOutput = [];
    
    for (let i = Math.max(maxHrsnFreq, summaryThreshold); i >= 1; i--) {
      let currentHrsns: string[] = [];
      
      if (i === summaryThreshold) {
        currentHrsns = Object.entries(hrsnProblems)
          .filter(([_, freq]) => freq >= summaryThreshold)
          .map(([name]) => name)
          .sort();
      } else if (i < summaryThreshold) {
        currentHrsns = Object.entries(hrsnProblems)
          .filter(([_, freq]) => freq === i)
          .map(([name]) => name)
          .sort();
      }
      
      if (currentHrsns.length > 0) {
        let displayText;
        if (i === summaryThreshold && summaryThreshold > 1) {
          displayText = `${summaryThreshold} times or more`;
        } else {
          const timesText = i === 1 ? 'time' : 'times';
          displayText = `${i} ${timesText}`;
        }
        
        hrsnOutput.push(`- these HRSN problems were expressed ${displayText} over the timeperiod [${currentHrsns.join(', ')}];`);
      }
    }
    
    // Build COMPLETE Summary format matching frontend EXACTLY
    return `Summary:

The person has had ${notes.length} contacts with ${uniqueProviders} number of staff submitting notes from ${firstDate} through ${lastDate}.

The diagnosis on the record is: ${diagnosisText}

The person has expressed

Symptom Trends:
${symptomOutput.length > 0 ? symptomOutput.join('\n') : 'No symptoms recorded'}

Diagnosis Trends:
${diagnosisOutput.length > 0 ? diagnosisOutput.join('\n') : 'No diagnosis data available'}

Diagnostic Category Trends:
${categoryOutput.length > 0 ? categoryOutput.join('\n') : 'No diagnostic category data available'}

Over the last two sessions they have expressed these symptoms: ${sortedLastTwo || 'none documented'}.

HRSN Trends:
${hrsnOutput.length > 0 ? hrsnOutput.join('\n') : 'No HRSN problems documented'}`;
  }

  private async generateGridFormatSummary(patientId: string, patient: any, symptoms: any[]): Promise<string> {
    // Get all notes for contact and provider counting
    const notes = await this.getPatientNotes(patientId);
    const summaryThreshold = 10; // Default threshold matching frontend
    
    // Calculate unique providers and date range
    const uniqueProviders = new Set(notes.map(note => note.provider_id || 'unknown')).size;
    const dates = notes.map(note => note.dos_date).filter(date => date).sort();
    const firstDate = dates[0] || "N/A";
    const lastDate = dates[dates.length - 1] || "N/A";
    
    // Get diagnosis information
    const diagnosis1 = patient.diagnosis1 || '';
    const diagnosis2 = patient.diagnosis2 || '';
    const diagnosis3 = patient.diagnosis3 || '';
    const diagnoses = [diagnosis1, diagnosis2, diagnosis3].filter(d => d && d !== '[Diagnosis data not available]');
    const diagnosisText = diagnoses.length > 0 ? diagnoses.join('; ') : '[No diagnosis on record]';
    
    // Calculate all frequency data (same algorithms as before)
    const { symptomFreq, symptomsByDiagnosis, symptomsByCategory } = this.calculateSymptomData(symptoms);
    const { diagnosisSymptomCount } = this.calculateDiagnosisData(symptoms);
    const { categoryCounts } = this.calculateCategoryData(symptoms);
    const { hrsnProblems } = this.calculateHrsnData(symptoms);
    const lastTwoSymptoms = await this.calculateLastTwoSessions(patientId, symptoms, notes);
    
    // Build grid-based summary
    return `Summary:

The person has had ${notes.length} contacts with ${uniqueProviders} number of staff submitting notes from ${firstDate} through ${lastDate}.

The diagnosis on the record is: ${diagnosisText}

The person has expressed

${this.formatGridSection('Symptom Trends', symptomFreq, 'symptoms', summaryThreshold, { 
  enableGrouping: true, 
  groupingOptions: { byDiagnosis: symptomsByDiagnosis, byCategory: symptomsByCategory }
})}

${this.formatGridSection('Diagnosis Trends', diagnosisSymptomCount, 'diagnoses', summaryThreshold)}

${this.formatGridSection('Diagnostic Category Trends', categoryCounts, 'categories', summaryThreshold)}

Over the last two sessions they have expressed these symptoms: ${lastTwoSymptoms || 'none documented'}.

${this.formatGridSection('HRSN Trends', hrsnProblems, 'HRSN problems', summaryThreshold)}`;
  }

  private calculateSymptomData(symptoms: any[]) {
    const symptomFreq: Record<string, number> = {};
    const symptomsByDiagnosis: Record<string, string[]> = {};
    const symptomsByCategory: Record<string, string[]> = {};
    
    symptoms.forEach(item => {
      const symptom = item.symptom_segment || '';
      const diagnosis = item.diagnosis || '';
      const category = item.diagnostic_category || '';
      
      if (symptom && symptom.trim()) {
        symptomFreq[symptom] = (symptomFreq[symptom] || 0) + 1;
        
        // Group by diagnosis
        if (diagnosis && diagnosis.trim()) {
          if (!symptomsByDiagnosis[diagnosis]) symptomsByDiagnosis[diagnosis] = [];
          if (!symptomsByDiagnosis[diagnosis].includes(symptom)) {
            symptomsByDiagnosis[diagnosis].push(symptom);
          }
        }
        
        // Group by category
        if (category && category.trim()) {
          if (!symptomsByCategory[category]) symptomsByCategory[category] = [];
          if (!symptomsByCategory[category].includes(symptom)) {
            symptomsByCategory[category].push(symptom);
          }
        }
      }
    });
    
    return { symptomFreq, symptomsByDiagnosis, symptomsByCategory };
  }

  private calculateDiagnosisData(symptoms: any[]) {
    const diagnosisSymptomCount: Record<string, number> = {};
    symptoms.forEach(item => {
      const diagnosis = item.diagnosis || '';
      if (diagnosis && diagnosis.trim()) {
        diagnosisSymptomCount[diagnosis] = (diagnosisSymptomCount[diagnosis] || 0) + 1;
      }
    });
    return { diagnosisSymptomCount };
  }

  private calculateCategoryData(symptoms: any[]) {
    const categoryDiagnosisCount: Record<string, Set<string>> = {};
    symptoms.forEach(item => {
      const category = item.diagnostic_category || '';
      const diagnosis = item.diagnosis || '';
      if (category && category.trim() && diagnosis && diagnosis.trim()) {
        if (!categoryDiagnosisCount[category]) {
          categoryDiagnosisCount[category] = new Set();
        }
        categoryDiagnosisCount[category].add(diagnosis);
      }
    });
    
    const categoryCounts: Record<string, number> = {};
    Object.entries(categoryDiagnosisCount).forEach(([category, diagnosisSet]) => {
      categoryCounts[category] = diagnosisSet.size;
    });
    
    return { categoryCounts };
  }

  private calculateHrsnData(symptoms: any[]) {
    const hrsnProblems: Record<string, number> = {};
    symptoms.forEach(item => {
      if (item.symp_prob === "Problem") {
        const symptom = item.symptom_segment || '';
        if (symptom && symptom.trim()) {
          hrsnProblems[symptom] = (hrsnProblems[symptom] || 0) + 1;
        }
      }
    });
    return { hrsnProblems };
  }

  private async calculateLastTwoSessions(patientId: string, symptoms: any[], notes: any[]): Promise<string> {
    const sortedNotes = [...notes].sort((a, b) => {
      const dateA = new Date(a.dos_date || 0);
      const dateB = new Date(b.dos_date || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    const lastTwoSessions = sortedNotes.slice(0, 2);
    const lastTwoDates = lastTwoSessions.map(note => note.dos_date);
    
    const lastTwoSymptoms: Record<string, number> = {};
    symptoms.forEach(item => {
      const itemPatientId = String(item.patient_id || '');
      const selectedPatientId = String(patientId || '');
      const itemDate = item.dos_date;
      
      const dateMatches = lastTwoDates.some(lastDate => {
        return itemDate === lastDate || 
               (itemDate && lastDate && new Date(itemDate).getTime() === new Date(lastDate).getTime());
      });
      
      if (itemPatientId === selectedPatientId && dateMatches) {
        const symptom = item.symptom_segment || '';
        if (symptom && symptom.trim()) {
          lastTwoSymptoms[symptom] = (lastTwoSymptoms[symptom] || 0) + 1;
        }
      }
    });
    
    return Object.entries(lastTwoSymptoms)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');
  }

  private formatGridSection(
    title: string, 
    data: Record<string, number>, 
    itemType: string, 
    threshold: number,
    options?: { enableGrouping?: boolean; groupingOptions?: any }
  ): string {
    const maxFreq = Math.max(...Object.values(data), 0);
    const output = [];
    
    output.push(`${title}:`);
    
    // Process each frequency level
    for (let i = Math.max(maxFreq, threshold); i >= 1; i--) {
      let currentItems: string[] = [];
      
      if (i === threshold) {
        currentItems = Object.entries(data)
          .filter(([_, freq]) => freq >= threshold)
          .map(([name]) => name)
          .sort();
      } else if (i < threshold) {
        currentItems = Object.entries(data)
          .filter(([_, freq]) => freq === i)
          .map(([name]) => name)
          .sort();
      }
      
      if (currentItems.length > 0) {
        const displayText = this.getFrequencyDisplayText(i, threshold, itemType);
        
        if (i === 1 && currentItems.length > 0) {
          // Frequency 1: Show count + collapsible format
          output.push(`- ${currentItems.length} ${itemType} (1 time each) [Collapsible - Click to expand]`);
          
          if (options?.enableGrouping && options.groupingOptions) {
            // Add grouping hint for symptoms
            output.push(`  [When expanded: Group by Diagnosis OR Diagnostic Category]`);
          }
          
          // Show collapsed preview (first few items)
          const preview = currentItems.slice(0, 3).join(', ');
          const remaining = currentItems.length > 3 ? `... and ${currentItems.length - 3} more` : '';
          output.push(`  Preview: ${preview}${remaining ? ' ' + remaining : ''}`);
          
        } else {
          // Higher frequencies: Show in 3x3 grid format
          output.push(`- ${itemType} ${displayText}:`);
          output.push(this.formatAs3x3Grid(currentItems));
        }
      }
    }
    
    if (output.length === 1) {
      output.push(`No ${itemType} documented`);
    }
    
    return output.join('\n');
  }

  private getFrequencyDisplayText(frequency: number, threshold: number, itemType: string): string {
    if (frequency === threshold && threshold > 1) {
      return `${threshold} times or more`;
    } else {
      const timesText = frequency === 1 ? 'time' : 'times';
      return `${frequency} ${timesText}`;
    }
  }

  private formatAs3x3Grid(items: string[]): string {
    if (items.length === 0) return '  [No items]';
    
    const grid = [];
    for (let i = 0; i < items.length; i += 3) {
      const row = items.slice(i, i + 3);
      // Format as boxes with consistent width
      const paddedRow = row.map(item => `[${item}]`).join('  ');
      grid.push(`  ${paddedRow}`);
    }
    
    return grid.join('\n');
  }

  private calculateDateRange(symptoms: any[]): string {
    if (symptoms.length === 0) return 'No data available';
    
    const dates = symptoms
      .map(s => s.date_of_service)
      .filter(d => d)
      .sort();
    
    if (dates.length === 0) return 'No dates available';
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    if (firstDate === lastDate) {
      return new Date(firstDate).toLocaleDateString();
    }
    
    return `${new Date(firstDate).toLocaleDateString()} through ${new Date(lastDate).toLocaleDateString()}`;
  }
}