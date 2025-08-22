import { db } from '../db';
import { extractedSymptoms } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import sharp from 'sharp';

export interface BubbleChartDataPoint {
  x: number; // Date position (days from start)
  y: number; // Symptom/category index
  r: number; // Bubble size based on count
  label: string;
  count: number;
  date?: string;
  originalDate?: Date;
}

export interface ChartAxisData {
  labels: string[];
  dateRange: { start: Date; end: Date };
}

export class ChartGeneratorService {
  private readonly canvasWidth = 600; // Increased width for better landscape readability
  private readonly canvasHeight = 350; // Increased height for better Y-axis label space
  private userId: number;

  constructor(userId: number) {
    this.userId = userId;
  }

  async generatePatientBubbleChart(
    patientId: string,
    chartType: 'symptoms' | 'diagnoses' | 'hrsn' | 'categories'
  ): Promise<Buffer> {
    try {
      console.log(`🎯 CHART DEBUG: Generating ${chartType} chart for patient ${patientId}`);
      
      const data = await this.fetchPatientData(patientId, chartType);
      console.log(`📊 CHART DEBUG: Fetched ${data.length} records from database`);
      
      const chartData = this.processDataForChart(data, chartType);
      console.log(`📈 CHART DEBUG: Processed ${chartData.length} data points for chart`);
      
      if (chartData.length > 0) {
        console.log(`📋 CHART DEBUG: Sample data points:`, chartData.slice(0, 3).map(d => ({
          label: d.label,
          count: d.count,
          x: d.x,
          y: d.y,
          r: d.r,
          date: d.date
        })));
      }
      
      if (chartData.length === 0) {
        console.log(`❌ CHART DEBUG: No data points generated for ${chartType} - returning empty chart`);
        return this.generateEmptyChart(`${this.getChartTitle(chartType)} - No Data`);
      }

      const result = await this.generateBubbleChart(chartData, this.getChartTitle(chartType));
      console.log(`✅ CHART DEBUG: Generated ${chartType} chart - ${result.length} bytes`);
      
      return result;
    } catch (error) {
      console.error(`❌ CHART ERROR: Failed to generate ${chartType} chart for patient ${patientId}:`, error);
      return this.generateEmptyChart(`${this.getChartTitle(chartType)} - Error`);
    }
  }

  private getChartTitle(chartType: string): string {
    const titles = {
      symptoms: 'Symptoms Over Time',
      diagnoses: 'Diagnoses by Date',
      hrsn: 'HRSN Issues Timeline',
      categories: 'Diagnostic Categories'
    };
    return titles[chartType as keyof typeof titles] || 'Chart';
  }

  private async fetchPatientData(patientId: string, chartType: string) {
    // PERFORMANCE OPTIMIZATION: Single query with targeted field selection
    const symptoms = await db
      .select({
        patient_id: extractedSymptoms.patient_id,
        symptom_segment: extractedSymptoms.symptom_segment,
        diagnosis: extractedSymptoms.diagnosis,
        diagnostic_category: extractedSymptoms.diagnostic_category,
        symp_prob: extractedSymptoms.symp_prob,
        dos_date: extractedSymptoms.dos_date  // FIXED: Only dos_date exists in database
      })
      .from(extractedSymptoms)
      .where(
        and(
          eq(extractedSymptoms.user_id, this.userId),
          eq(extractedSymptoms.patient_id, patientId)
        )
      );

    return symptoms;
  }

  private processDataForChart(symptoms: any[], chartType: string): BubbleChartDataPoint[] {
    if (symptoms.length === 0) return [];

    console.log(`🎯 MEDICAL CHART PROCESSING: ${chartType} with ${symptoms.length} symptoms`);

    // Use EXACT same pivot data processing as main application
    const pivotData = this.createMedicalPivotData(symptoms, chartType);
    
    if (!pivotData || pivotData.rows.length === 0 || pivotData.columns.length === 0) {
      console.log(`❌ No pivot data generated for ${chartType}`);
      return [];
    }

    console.log(`📊 MEDICAL PIVOT: ${pivotData.rows.length} rows, ${pivotData.columns.length} columns`);
    console.log(`📋 Sample rows: ${pivotData.rows.slice(0, 3).join(', ')}`);
    console.log(`📅 Sample columns: ${pivotData.columns.slice(0, 3).join(', ')}`);

    // Transform pivot data to medical bubble chart format - EXACT same as main app
    return this.pivotToMedicalBubbles(pivotData, chartType);
  }

  // EXACT SAME pivot data creation as main application themed-visualization-fixed-new.tsx
  private createMedicalPivotData(symptoms: any[], chartType: string): any {
    const fieldMap: Record<string, string> = {
      'symptoms': 'symptom_segment',
      'diagnoses': 'diagnosis',  // FIXED: Use correct database field name
      'hrsn': 'symptom_segment', // FIXED: HRSN uses symptom_segment filtered by symp_prob='Problem'
      'categories': 'diagnostic_category'
    };

    const fieldName = fieldMap[chartType];
    if (!fieldName) return null;

    console.log(`🔍 MEDICAL PIVOT: Processing ${fieldName} for ${chartType}`);

    // Group by date first with HRSN filtering
    const dateGroups: Record<string, any[]> = {};
    symptoms.forEach(symptom => {
      if (!symptom.dos_date || !symptom[fieldName]) return;
      
      // CRITICAL: For HRSN charts, only include symptoms where symp_prob = 'Problem'
      if (chartType === 'hrsn' && symptom.symp_prob !== 'Problem') {
        return; // Skip non-HRSN symptoms for HRSN charts
      }
      
      const date = new Date(symptom.dos_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(symptom);
    });

    // Get all unique items and dates
    const allItems = new Set<string>();
    const allDates = new Set<string>();
    
    Object.keys(dateGroups).forEach(date => {
      allDates.add(date);
      dateGroups[date].forEach(symptom => {
        // Apply HRSN filtering again for item collection
        if (chartType === 'hrsn' && symptom.symp_prob !== 'Problem') {
          return; // Skip non-HRSN symptoms
        }
        if (symptom[fieldName]) {
          allItems.add(symptom[fieldName]);
        }
      });
    });

    // Create pivot structure - EXACT same as main app
    const rows = Array.from(allItems).sort();
    const columns = Array.from(allDates).sort((a, b) => {
      const dateA = new Date(a + ', 2024');
      const dateB = new Date(b + ', 2024');
      return dateA.getTime() - dateB.getTime();
    });

    const data: Record<string, Record<string, number>> = {};
    let maxValue = 0;

    // Fill pivot data with counts - EXACT same logic as main app with HRSN filtering
    rows.forEach(item => {
      data[item] = {};
      columns.forEach(date => {
        const count = dateGroups[date]?.filter(s => {
          // Apply HRSN filtering for count calculation
          if (chartType === 'hrsn' && s.symp_prob !== 'Problem') {
            return false; // Skip non-HRSN symptoms
          }
          return s[fieldName] === item;
        }).length || 0;
        data[item][date] = count;
        if (count > maxValue) maxValue = count;
      });
    });

    console.log(`📊 MEDICAL PIVOT COMPLETE: ${rows.length} items, ${columns.length} dates, max: ${maxValue}`);

    return { rows, columns, data, maxValue };
  }

  // Transform medical pivot data to bubble chart format - EXACT same as main app
  private pivotToMedicalBubbles(pivotData: any, chartType: string): BubbleChartDataPoint[] {
    const bubbles: BubbleChartDataPoint[] = [];
    const { rows, columns, data, maxValue } = pivotData;

    // Create bubbles for each cell with data - EXACT same logic as main app
    rows.forEach((row: string, rowIndex: number) => {
      columns.forEach((column: string, colIndex: number) => {
        const count = data[row][column];
        if (count > 0) {
          // Calculate bubble size based on count relative to max - EXACT same as main app
          const relativeSize = count / maxValue;
          const baseSize = 8; // Minimum bubble size
          const maxSize = 25; // Maximum bubble size
          const bubbleRadius = baseSize + (relativeSize * (maxSize - baseSize));

          bubbles.push({
            x: colIndex * 50 + 30, // Spread bubbles horizontally
            y: rowIndex * 40 + 30, // Spread bubbles vertically
            r: Math.max(baseSize, Math.min(maxSize, bubbleRadius)),
            label: row,
            count: count,
            date: column
          });
        }
      });
    });

    console.log(`📈 MEDICAL BUBBLES: Generated ${bubbles.length} bubbles from ${rows.length}x${columns.length} pivot`);
    return bubbles;
  }

  private processSymptomDataForBubbles(symptoms: any[], startDate: Date, dayRange: number): BubbleChartDataPoint[] {
    const symptomMap = new Map<string, Map<string, number>>();
    
    symptoms.forEach(symptom => {
      const symptomName = symptom.symptom_segment || 'Unknown';
      const date = new Date(symptom.dos_date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!symptomMap.has(symptomName)) {
        symptomMap.set(symptomName, new Map());
      }
      const symptomDates = symptomMap.get(symptomName)!;
      symptomDates.set(dateKey, (symptomDates.get(dateKey) || 0) + 1);
    });

    const result: BubbleChartDataPoint[] = [];
    const symptomNames = Array.from(symptomMap.keys()).slice(0, 10);
    
    symptomNames.forEach((symptomName, yIndex) => {
      const dates = symptomMap.get(symptomName)!;
      dates.forEach((count, dateKey) => {
        const date = new Date(dateKey);
        const dayFromStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        result.push({
          x: dayFromStart,
          y: yIndex,
          r: Math.max(3, Math.min(15, count * 2 + 3)),
          label: symptomName,
          count,
          date: dateKey,
          originalDate: date
        });
      });
    });

    return result;
  }

  private processDiagnosisDataForBubbles(symptoms: any[], startDate: Date, dayRange: number): BubbleChartDataPoint[] {
    const diagnosisMap = new Map<string, Map<string, number>>();
    
    symptoms.forEach(symptom => {
      const diagnosisName = symptom.diagnosis || 'No Diagnosis';
      const date = new Date(symptom.dos_date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!diagnosisMap.has(diagnosisName)) {
        diagnosisMap.set(diagnosisName, new Map());
      }
      const diagnosisDates = diagnosisMap.get(diagnosisName)!;
      diagnosisDates.set(dateKey, (diagnosisDates.get(dateKey) || 0) + 1);
    });

    const result: BubbleChartDataPoint[] = [];
    const diagnosisNames = Array.from(diagnosisMap.keys()).slice(0, 8);
    
    diagnosisNames.forEach((diagnosisName, yIndex) => {
      const dates = diagnosisMap.get(diagnosisName)!;
      dates.forEach((count, dateKey) => {
        const date = new Date(dateKey);
        const dayFromStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        result.push({
          x: dayFromStart,
          y: yIndex,
          r: Math.max(3, Math.min(15, count * 2 + 3)),
          label: diagnosisName,
          count,
          date: dateKey,
          originalDate: date
        });
      });
    });

    return result;
  }

  private processHRSNDataForBubbles(symptoms: any[], startDate: Date, dayRange: number): BubbleChartDataPoint[] {
    const hrsnMap = new Map<string, Map<string, number>>();
    
    symptoms.forEach(symptom => {
      if (symptom.symp_prob === 'Problem' || symptom.financial_strain === 'Yes') {
        const hrsnType = symptom.symptom_segment || 'HRSN Issue';
        const date = new Date(symptom.dos_date);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!hrsnMap.has(hrsnType)) {
          hrsnMap.set(hrsnType, new Map());
        }
        const hrsnDates = hrsnMap.get(hrsnType)!;
        hrsnDates.set(dateKey, (hrsnDates.get(dateKey) || 0) + 1);
      }
    });

    const result: BubbleChartDataPoint[] = [];
    const hrsnNames = Array.from(hrsnMap.keys()).slice(0, 10);
    
    hrsnNames.forEach((hrsnName, yIndex) => {
      const dates = hrsnMap.get(hrsnName)!;
      dates.forEach((count, dateKey) => {
        const date = new Date(dateKey);
        const dayFromStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        result.push({
          x: dayFromStart,
          y: yIndex,
          r: Math.max(3, Math.min(15, count * 2 + 3)),
          label: hrsnName,
          count,
          date: dateKey,
          originalDate: date
        });
      });
    });

    return result;
  }

  private processCategoryDataForBubbles(symptoms: any[], startDate: Date, dayRange: number): BubbleChartDataPoint[] {
    const categoryMap = new Map<string, Map<string, number>>();
    
    symptoms.forEach(symptom => {
      const category = symptom.diagnostic_category || 'Uncategorized';
      const date = new Date(symptom.dos_date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map());
      }
      const categoryDates = categoryMap.get(category)!;
      categoryDates.set(dateKey, (categoryDates.get(dateKey) || 0) + 1);
    });

    const result: BubbleChartDataPoint[] = [];
    const categoryNames = Array.from(categoryMap.keys()).slice(0, 8);
    
    categoryNames.forEach((categoryName, yIndex) => {
      const dates = categoryMap.get(categoryName)!;
      dates.forEach((count, dateKey) => {
        const date = new Date(dateKey);
        const dayFromStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        result.push({
          x: dayFromStart,
          y: yIndex,
          r: Math.max(3, Math.min(15, count * 2 + 3)),
          label: categoryName,
          count,
          date: dateKey,
          originalDate: date
        });
      });
    });

    return result;
  }

  generateBubbleChartSVG(
    data: BubbleChartDataPoint[],
    title: string
  ): string {
    const width = 600;
    const height = 400;
    const margin = { top: 50, right: 40, bottom: 90, left: 200 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    console.log(`🎯 Generating EXACT NIVO-STYLE CHART for ${title} with ${data.length} data points`);
    
    if (data.length === 0) {
      return this.generateEmptyChartSVG(title);
    }
    
    // Organize data exactly like the main app - by label and date
    const labelMap = new Map<string, { dates: string[], counts: number[], maxCount: number }>();
    data.forEach(point => {
      if (!labelMap.has(point.label)) {
        labelMap.set(point.label, { dates: [], counts: [], maxCount: 0 });
      }
      const labelData = labelMap.get(point.label)!;
      labelData.dates.push(point.date);
      labelData.counts.push(point.count);
      labelData.maxCount = Math.max(labelData.maxCount, point.count);
    });

    // Get unique labels sorted by frequency (like main app)
    const uniqueLabels = Array.from(labelMap.keys())
      .sort((a, b) => labelMap.get(b)!.maxCount - labelMap.get(a)!.maxCount)
      .slice(0, 10);
    
    // Get unique dates sorted
    const uniqueDates = Array.from(new Set(data.map(d => d.date))).sort();
    
    console.log(`📊 NIVO-STYLE Chart: ${uniqueLabels.length} labels, ${uniqueDates.length} dates, ${data.length} bubbles`);
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: white;">`;
    
    // Title - exactly like main app
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#333">${title}</text>`;
    
    // MAIN CHART AREA - exactly like Nivo ResponsiveScatterPlot
    svg += `<rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="white" stroke="none"/>`;
    
    // GRID LINES - Vertical (for dates) - exactly like Nivo
    const xStep = uniqueDates.length > 1 ? chartWidth / (uniqueDates.length - 1) : chartWidth / 2;
    uniqueDates.forEach((date, index) => {
      const x = margin.left + (index * xStep);
      svg += `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + chartHeight}" stroke="#f0f0f0" stroke-width="1"/>`;
    });
    
    // GRID LINES - Horizontal (for labels) - exactly like Nivo
    const yStep = uniqueLabels.length > 1 ? chartHeight / (uniqueLabels.length - 1) : chartHeight / 2;
    uniqueLabels.forEach((label, index) => {
      const y = margin.top + (index * yStep);
      svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>`;
    });
    
    // X-AXIS LABELS (dates) - exactly like main app
    uniqueDates.forEach((date, index) => {
      const x = margin.left + (index * xStep);
      svg += `<text x="${x}" y="${height - 30}" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">${date}</text>`;
    });
    
    // Y-AXIS LABELS (symptoms/categories) - exactly like main app
    uniqueLabels.forEach((label, index) => {
      const y = margin.top + (index * yStep) + 4; // +4 for better vertical centering
      const truncatedLabel = label.length > 25 ? label.substring(0, 25) + '...' : label;
      svg += `<text x="${margin.left - 10}" y="${y}" text-anchor="end" font-family="Arial" font-size="9" fill="#333">${truncatedLabel}</text>`;
    });
    
    // BUBBLE DATA POINTS - exactly like Nivo ResponsiveScatterPlot
    data.forEach(point => {
      const labelIndex = uniqueLabels.indexOf(point.label);
      const dateIndex = uniqueDates.indexOf(point.date);
      
      if (labelIndex >= 0 && dateIndex >= 0) {
        const x = margin.left + (dateIndex * xStep);
        const y = margin.top + (labelIndex * yStep);
        
        // Color based on count intensity - exactly like main app
        const intensity = Math.min(point.count / 5, 1); // Max intensity at count 5
        const blueValue = Math.floor(100 + (155 * intensity)); // From light blue to dark blue
        const fillColor = `rgb(${Math.floor(blueValue * 0.3)}, ${Math.floor(blueValue * 0.6)}, ${blueValue})`;
        
        // Bubble size - exactly like main app
        const radius = Math.max(3, Math.min(15, 3 + point.count * 2));
        
        svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fillColor}" stroke="#fff" stroke-width="1" opacity="0.8">`;
        svg += `<title>${point.label}: ${point.count} on ${point.date}</title>`;
        svg += `</circle>`;
        
        // Count labels on bubbles for better readability - exactly like main app
        if (point.count > 0) {
          svg += `<text x="${x}" y="${y + 3}" text-anchor="middle" font-family="Arial" font-size="8" fill="white" font-weight="bold">${point.count}</text>`;
        }
      }
    });
    
    svg += `</svg>`;
    return svg;
  }

  private generateEmptyChartSVG(title: string): string {
    const width = 600;
    const height = 400;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: white;">`;
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#333">${title}</text>`;
    svg += `<rect x="50" y="60" width="${width-100}" height="${height-140}" fill="#f8f9fa" stroke="#e9ecef" stroke-width="1" rx="8"/>`;
    svg += `<text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">No data available</text>`;
    svg += `<text x="${width/2}" y="${height/2 + 25}" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">No symptoms found for this patient</text>`;
    svg += `</svg>`;
    return svg;
  }

  async generateBubbleChart(data: BubbleChartDataPoint[], title: string): Promise<Buffer> {
    const svgString = this.generateBubbleChartSVG(data, title);
    
    try {
      const buffer = await sharp(Buffer.from(svgString))
        .png()
        .toBuffer();
      
      return buffer;
    } catch (error) {
      console.error('Error converting SVG to PNG:', error);
      throw error;
    }
  }

  generateEmptyChart(title: string): Buffer {
    const svgString = this.generateEmptyChartSVG(title);
    
    try {
      // For empty charts, we can return a simple buffer directly
      return Buffer.from(svgString);
    } catch (error) {
      console.error('Error generating empty chart:', error);
      // Return a minimal fallback
      return Buffer.from('<svg width="600" height="400"><text x="300" y="200" text-anchor="middle">Error generating chart</text></svg>');
    }
  }
}