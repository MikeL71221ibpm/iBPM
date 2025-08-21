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
    progressCallback?: (currentIndex: number, total: number) => void
  ): Promise<BatchReportResult> {
    const reports: PatientReport[] = [];
    const validMatches = matchResults.filter(m => m.status === 'found' && m.matched);
    
    for (let i = 0; i < validMatches.length; i++) {
      const match = validMatches[i];
      const report = await this.generateSinglePatientReport(match);
      reports.push(report);
      
      // Call progress callback if provided
      if (progressCallback) {
        progressCallback(i + 1, validMatches.length);
      }
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

  private async generateSinglePatientReport(match: MatchResult): Promise<PatientReport> {
    try {
      const patient = match.matched;
      const patientId = patient.patient_id;

      // Get all patient data for bubble charts and summary
      const [symptomData, bubbleChartsData, narrativeSummary, chartImages] = await Promise.all([
        this.getPatientSymptoms(patientId),
        this.generateBubbleChartsData(patientId),
        this.generateNarrativeSummary(patientId, patient),
        this.generateChartImages(patientId)
      ]);

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

  private async generateNarrativeSummary(patientId: string, patient: any): Promise<string> {
    // Use EXACT same Summary algorithm as Search section
    const symptoms = await this.getPatientSymptoms(patientId);
    
    if (symptoms.length === 0) {
      return `No clinical data available for ${patient.patient_name} (ID: ${patientId}).`;
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