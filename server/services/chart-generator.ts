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
    // Get all symptoms for this patient
    const symptoms = await db
      .select()
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

  // Transform medical pivot data to bubble chart points - EXACT same as main app
  private pivotToMedicalBubbles(pivotData: any, chartType: string): BubbleChartDataPoint[] {
    const bubblePoints: BubbleChartDataPoint[] = [];
    
    // Calculate row frequencies for medical coloring - same as main app
    const rowTotals: Record<string, number> = {};
    let maxFrequency = 1;
    
    pivotData.rows.forEach((row: string) => {
      let count = 0;
      pivotData.columns.forEach((col: string) => {
        if (pivotData.data[row]?.[col] > 0) {
          count++;
        }
      });
      rowTotals[row] = count;
      if (count > maxFrequency) {
        maxFrequency = count;
      }
    });

    // Get date range for X positioning
    const startDate = new Date(pivotData.columns[0] + ', 2024');
    const endDate = new Date(pivotData.columns[pivotData.columns.length - 1] + ', 2024');
    const dayRange = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    console.log(`📍 MEDICAL POSITIONING: Date range ${dayRange} days, ${pivotData.rows.length} symptoms`);

    // Create bubble points with medical positioning - EXACT same as main app
    pivotData.rows.forEach((row: string, rowIndex: number) => {
      pivotData.columns.forEach((col: string, colIndex: number) => {
        const value = pivotData.data[row]?.[col] || 0;
        
        if (value > 0) {
          const frequency = rowTotals[row] || 1;
          const colDate = new Date(col + ', 2024');
          const dayOffset = Math.ceil((colDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          bubblePoints.push({
            x: dayOffset,
            y: rowIndex,
            r: Math.max(3, Math.min(12, value * 2)),
            count: value,
            frequency,
            label: row,
            date: col,
            originalDate: colDate
          });
        }
      });
    });

    console.log(`✅ MEDICAL BUBBLES: Generated ${bubblePoints.length} positioned points`);
    return bubblePoints;
  }

  private processSymptomDataForBubbles(symptoms: any[], startDate: Date, dayRange: number): BubbleChartDataPoint[] {
    const symptomMap = new Map<string, Map<string, number>>();
    
    symptoms.forEach(symptom => {
      const symptomName = symptom.symptom_segment || symptom.symptom_wording || 'Unknown';
      const date = new Date(symptom.dos_date);
      const dayFromStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dateKey = date.toISOString().split('T')[0];
      
      if (!symptomMap.has(symptomName)) {
        symptomMap.set(symptomName, new Map());
      }
      const symptomDates = symptomMap.get(symptomName)!;
      symptomDates.set(dateKey, (symptomDates.get(dateKey) || 0) + 1);
    });

    const result: BubbleChartDataPoint[] = [];
    const symptomNames = Array.from(symptomMap.keys()).slice(0, 15); // Limit for readability
    
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
      const diagnosis = symptom.diagnosis || 'No Diagnosis';
      const date = new Date(symptom.dos_date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!diagnosisMap.has(diagnosis)) {
        diagnosisMap.set(diagnosis, new Map());
      }
      const diagnosisDates = diagnosisMap.get(diagnosis)!;
      diagnosisDates.set(dateKey, (diagnosisDates.get(dateKey) || 0) + 1);
    });

    const result: BubbleChartDataPoint[] = [];
    const diagnosisNames = Array.from(diagnosisMap.keys()).slice(0, 10);
    
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
    const yStep = uniqueLabels.length > 0 ? chartHeight / uniqueLabels.length : chartHeight;
    uniqueLabels.forEach((label, index) => {
      const y = margin.top + (index * yStep) + (yStep / 2);
      svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>`;
    });
    
    // Y-AXIS LABELS with COLORED BULLETS - exactly like main app
    uniqueLabels.forEach((label, index) => {
      const y = margin.top + (index * yStep) + (yStep / 2);
      const frequency = labelMap.get(label)?.dates.length || 1;
      
      // Color intensity based on frequency - exactly like main app theming
      let color = '#CCCCFF'; // LOWEST
      if (frequency >= 10) color = '#6A0DAD'; // HIGHEST - purple
      else if (frequency >= 8) color = '#9370DB'; // HIGH - medium purple  
      else if (frequency >= 5) color = '#B19CD9'; // MEDIUM - light purple
      else if (frequency >= 2) color = '#CCCCFF'; // LOW - very light purple
      
      // AXIS TICK LINE - exactly like Nivo
      svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#ccc" stroke-width="1"/>`;
      
      // COLORED BULLET POINT - exactly like main app
      svg += `<circle cx="${margin.left - 15}" cy="${y}" r="4" fill="${color}"/>`;
      
      // LABEL TEXT - exactly like main app
      const displayText = `${label} (${frequency})`;
      svg += `<text x="${margin.left - 25}" y="${y}" text-anchor="end" dominant-baseline="middle" font-family="Arial" font-size="9" fill="#666">${displayText}</text>`;
    });
    
    // X-AXIS LABELS with TICK MARKS - exactly like Nivo
    uniqueDates.forEach((date, index) => {
      const x = margin.left + (index * xStep);
      const y = margin.top + chartHeight;
      
      // AXIS TICK LINE
      svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 5}" stroke="#ccc" stroke-width="1"/>`;
      
      // DATE LABEL - rotated 45 degrees like main app
      svg += `<text x="${x}" y="${y + 20}" text-anchor="start" font-family="Arial" font-size="8" fill="#666" transform="rotate(45, ${x}, ${y + 20})">${date}</text>`;
    });
    
    // MAIN AXIS LINES - exactly like Nivo
    svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#ccc" stroke-width="2"/>`;
    svg += `<line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#ccc" stroke-width="2"/>`;
    
    // BUBBLE DATA POINTS - exactly positioned like Nivo ResponsiveScatterPlot
    data.forEach(point => {
      const xIndex = uniqueDates.indexOf(point.date);
      const yIndex = uniqueLabels.indexOf(point.label);
      
      if (xIndex >= 0 && yIndex >= 0) {
        const x = margin.left + (xIndex * xStep);
        const y = margin.top + (yIndex * yStep) + (yStep / 2);
        
        // Bubble size based on count - exactly like main app calculateBubbleSize
        const radius = Math.max(3, Math.min(15, Math.sqrt(point.count) * 2));
        
        // Color based on frequency - exactly like main app
        const frequency = labelMap.get(point.label)?.dates.length || 1;
        let bubbleColor = '#CCCCFF'; // LOWEST
        if (frequency >= 10) bubbleColor = '#6A0DAD'; // HIGHEST
        else if (frequency >= 8) bubbleColor = '#9370DB'; // HIGH
        else if (frequency >= 5) bubbleColor = '#B19CD9'; // MEDIUM  
        else if (frequency >= 2) bubbleColor = '#CCCCFF'; // LOW
        
        // Draw bubble with proper styling
        svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${bubbleColor}" fill-opacity="0.7" stroke="${bubbleColor}" stroke-width="1">`;
        svg += `<title>${point.label}: ${point.count} occurrences on ${point.date}</title>`;
        svg += `</circle>`;
      }
    });
    
    // AXIS TITLES - exactly like main app
    svg += `<text x="${margin.left + chartWidth/2}" y="${height - 15}" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">Timeline (Days from Start)</text>`;
    svg += `<text x="20" y="${margin.top + chartHeight/2}" text-anchor="middle" font-family="Arial" font-size="10" fill="#666" transform="rotate(-90, 20, ${margin.top + chartHeight/2})">Medical Items</text>`;
    
    svg += '</svg>';
    return svg;
  }

  async generateBubbleChart(data: BubbleChartDataPoint[], title: string): Promise<Buffer> {
    try {
      // Generate FULL medical-grade chart with axes, labels, and grid
      const svgString = data.length === 0 ? 
        this.generateEmptyChartSVG(title) : 
        this.generateBubbleChartSVG(data, title);
      
      console.log(`🎯 Generated ${data.length} data points for chart: ${title}`);
      console.log(`📊 SVG size: ${svgString.length} characters`);
      
      // Enhanced Sharp conversion with medical-grade quality
      const pngBuffer = await sharp(Buffer.from(svgString))
        .png({
          quality: 95,         // Higher quality for medical charts
          compressionLevel: 6,
          adaptiveFiltering: true,  // Better for detailed charts
          palette: false       // Preserve full color range
        })
        .resize(600, 400, { 
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toBuffer();
      
      console.log(`✅ Sharp converted detailed SVG to PNG: ${pngBuffer.length} bytes`);
      
      // Validate image size
      if (pngBuffer.length < 1000) {
        throw new Error(`PNG too small (${pngBuffer.length} bytes) - likely conversion failed`);
      }
      
      return pngBuffer;
      
    } catch (error) {
      console.error('Error with Sharp chart generation:', error);
      
      // Enhanced Canvas fallback with FULL medical chart features
      try {
        console.log(`⚡ Sharp failed, using Canvas fallback with detailed medical chart`);
        const { createCanvas } = await import('canvas');
        const canvas = createCanvas(600, 400);
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 600, 400);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 600, 400);
        
        // Chart margins and dimensions  
        const margin = { top: 50, right: 40, bottom: 90, left: 150 };
        const chartWidth = 600 - margin.left - margin.right;
        const chartHeight = 400 - margin.top - margin.bottom;
        
        // Draw title
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, 300, 30);
        
        if (data.length === 0) {
          ctx.font = '12px Arial';
          ctx.fillStyle = 'gray';
          ctx.fillText('No data available for this patient', 300, 200);
        } else {
          // Get unique labels and date range
          const uniqueLabels = Array.from(new Set(data.map(d => d.label))).slice(0, 10);
          const dates = data.map(d => d.originalDate!).filter(d => d).sort((a, b) => a.getTime() - b.getTime());
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];
          const dayRange = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Draw chart background
          ctx.fillStyle = '#fafafa';
          ctx.fillRect(margin.left, margin.top, chartWidth, chartHeight);
          ctx.strokeStyle = '#ddd';
          ctx.strokeRect(margin.left, margin.top, chartWidth, chartHeight);
          
          // Draw Y-axis labels and grid
          ctx.fillStyle = '#666';
          ctx.font = '8px Arial';
          ctx.textAlign = 'right';
          uniqueLabels.forEach((label, index) => {
            const y = margin.top + (index + 0.5) * (chartHeight / uniqueLabels.length);
            const truncatedLabel = label.length > 15 ? label.substring(0, 12) + '...' : label;
            ctx.fillText(truncatedLabel, margin.left - 5, y + 3);
            
            // Grid line
            ctx.strokeStyle = '#eee';
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + chartWidth, y);
            ctx.stroke();
          });
          
          // Draw X-axis labels and grid
          const xTicks = Math.min(8, dayRange + 1);
          for (let i = 0; i <= xTicks; i++) {
            const dayValue = (i / xTicks) * dayRange;
            const x = margin.left + (i / xTicks) * chartWidth;
            const date = new Date(minDate.getTime() + dayValue * 24 * 60 * 60 * 1000);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            ctx.textAlign = 'center';
            ctx.fillText(dateStr, x, margin.top + chartHeight + 15);
            
            ctx.strokeStyle = '#eee';
            ctx.beginPath();
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, margin.top + chartHeight);
            ctx.stroke();
          }
          
          // Draw bubbles
          ctx.fillStyle = 'rgba(75, 192, 192, 0.6)';
          ctx.strokeStyle = 'rgba(75, 192, 192, 1)';
          data.forEach(point => {
            const x = margin.left + (point.x / dayRange) * chartWidth;
            const y = margin.top + (point.y + 0.5) * (chartHeight / uniqueLabels.length);
            const radius = Math.max(2, Math.min(12, point.r));
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          });
          
          // Axis titles
          ctx.fillStyle = '#666';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Days from Start', margin.left + chartWidth/2, 400 - 15);
          
          ctx.save();
          ctx.translate(15, margin.top + chartHeight/2);
          ctx.rotate(-Math.PI/2);
          ctx.fillText('Items', 0, 0);
          ctx.restore();
        }
        
        const buffer = canvas.toBuffer('image/png');
        console.log(`✅ Canvas fallback with medical axes PNG: ${buffer.length} bytes`);
        
        // Validate canvas output
        if (buffer.length < 1000) {
          throw new Error(`Canvas PNG too small (${buffer.length} bytes)`);
        }
        
        return buffer;
        
      } catch (canvasError) {
        console.error('Canvas fallback failed:', canvasError);
        // Final fallback to SVG
        const fallbackSvg = this.generateEmptyChartSVG(title + ' - Chart Error');
        return Buffer.from(fallbackSvg, 'utf8');
      }
    }
  }

  generateEmptyChartSVG(title: string): string {
    const width = 450;
    const height = 300;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="white" stroke="#ccc" stroke-width="1"/>`;
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">${title}</text>`;
    svg += `<text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">No data available for this patient</text>`;
    svg += '</svg>';
    
    return svg;
  }

  generateSimplifiedSVG(data: BubbleChartDataPoint[], title: string): string {
    const width = 450;
    const height = 300;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="white"/>`;
    svg += `<text x="${width/2}" y="25" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">${title}</text>`;
    
    if (data.length === 0) {
      svg += `<text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">No data available</text>`;
    } else {
      // Draw simplified bubble chart
      const maxValue = Math.max(...data.map(d => d.count || 1));
      const chartX = 50;
      const chartY = 50;
      const chartWidth = 350;
      const chartHeight = 200;
      
      // Draw simple grid
      svg += `<line x1="${chartX}" y1="${chartY + chartHeight}" x2="${chartX + chartWidth}" y2="${chartY + chartHeight}" stroke="#ddd" stroke-width="1"/>`;
      svg += `<line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${chartY + chartHeight}" stroke="#ddd" stroke-width="1"/>`;
      
      // Draw bubbles in grid layout
      data.slice(0, 10).forEach((point, index) => {
        const col = index % 5;
        const row = Math.floor(index / 5);
        const x = chartX + (col * 60) + 30;
        const y = chartY + (row * 80) + 40;
        const radius = Math.max(8, Math.min(25, (point.count || 1) / maxValue * 20 + 5));
        const color = `hsl(${(index * 137.5) % 360}, 65%, 55%)`;
        
        // Draw bubble
        svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>`;
        
        // Draw value in center
        svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="white">${point.count || 0}</text>`;
        
        // Draw label below
        const label = point.label.length > 12 ? point.label.substring(0, 9) + '...' : point.label;
        svg += `<text x="${x}" y="${y + radius + 15}" text-anchor="middle" font-family="Arial" font-size="9" fill="black">${label}</text>`;
      });
    }
    
    svg += '</svg>';
    return svg;
  }

  async generateEmptyChart(title: string): Promise<Buffer> {
    const svgString = this.generateEmptyChartSVG(title);
    return Buffer.from(svgString, 'utf8');
  }

  // Convert patient data to bubble chart format
  processSymptomData(symptoms: any[]): BubbleChartDataPoint[] {
    const symptomCounts = new Map<string, number>();
    
    symptoms.forEach(symptom => {
      const key = symptom.symptom_segment || symptom.symptom_wording || 'Unknown';
      symptomCounts.set(key, (symptomCounts.get(key) || 0) + 1);
    });

    return Array.from(symptomCounts.entries()).map(([label, count], index) => ({
      x: Math.random() * 80 + 10, // Random positioning for now
      y: Math.random() * 80 + 10,
      r: Math.max(5, Math.min(25, count * 3)),
      label,
      count
    }));
  }

  processDiagnosisData(symptoms: any[]): BubbleChartDataPoint[] {
    const diagnosisCounts = new Map<string, number>();
    
    symptoms.forEach(symptom => {
      const diagnosis = symptom.diagnosis || 'No Diagnosis';
      diagnosisCounts.set(diagnosis, (diagnosisCounts.get(diagnosis) || 0) + 1);
    });

    return Array.from(diagnosisCounts.entries()).map(([label, count], index) => ({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      r: Math.max(5, Math.min(25, count * 3)),
      label,
      count
    }));
  }

  processHRSNData(symptoms: any[]): BubbleChartDataPoint[] {
    const hrsnCounts = new Map<string, number>();
    
    symptoms.forEach(symptom => {
      // Look for HRSN indicators
      if (symptom.symp_prob === 'Problem' || symptom.financial_strain === 'Yes') {
        const key = symptom.symptom_segment || 'HRSN Issue';
        hrsnCounts.set(key, (hrsnCounts.get(key) || 0) + 1);
      }
    });

    return Array.from(hrsnCounts.entries()).map(([label, count], index) => ({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      r: Math.max(5, Math.min(25, count * 3)),
      label,
      count
    }));
  }

  processCategoryData(symptoms: any[]): BubbleChartDataPoint[] {
    const categoryCounts = new Map<string, number>();
    
    symptoms.forEach(symptom => {
      const category = symptom.diagnostic_category || 'Uncategorized';
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    return Array.from(categoryCounts.entries()).map(([label, count], index) => ({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      r: Math.max(5, Math.min(25, count * 3)),
      label,
      count
    }));
  }
}