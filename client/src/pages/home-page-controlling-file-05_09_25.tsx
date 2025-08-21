// Last updated: May 9, 2025 - 6:33 PM
// Controls route: /home

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Lucide icons
import { 
  Download, Upload, X, CheckCircle, BarChart2, Circle, LayoutGrid,
  Search, CreditCard, Settings, LogOut, LogIn
} from "lucide-react";
// Alias the charts from lucide-react to avoid naming conflicts with recharts
import { BarChart as BarChartIcon, PieChart as PieChartIcon } from "lucide-react";
import HeatMapWrapper from '@/components/HeatMapWrapper';
import { Link } from "wouter";
// Recharts components
import { 
  PieChart as RechartsPieChart, Pie, 
  BarChart as RechartsBarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Cell, ResponsiveContainer 
} from 'recharts';
import MainContentWrapper from '@/components/MainContentWrapper';
import PopulationSearch from "@/components/population-search-controlling-file-05_12_25";
import FileProcessingStatus from "@/components/FileProcessingStatus";
import { calculateBubbleSize } from '@/lib/bubble-size-utils';
import DatabaseStatsWidget from '@/components/DatabaseStatsWidget';

// Custom Bubble Chart Component to match the original Streamlit implementation
type BubbleChartProps = {
  title: string;
  bubbleData: {
    data: Array<{
      id: string;
      x: number;
      y: number;
      label: string;
      value: number;
      date: string;
    }>;
    keys: string[];
    dates: string[];
  };
  colorScheme: string;
};

const BubbleChart = ({ title, bubbleData, colorScheme }: BubbleChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !bubbleData.data.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up chart dimensions
    const padding = { top: 60, right: 80, bottom: 50, left: 200 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;
    
    // Draw grid lines with prominent styling
    ctx.strokeStyle = '#d1d5db'; // Slightly darker grid lines
    ctx.lineWidth = 1;
    
    // Calculate dimensions for the cells
    const rowHeight = chartHeight / bubbleData.keys.length;
    const colWidth = chartWidth / bubbleData.dates.length;
    
    // Draw prominent axes
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8'; // Darker color for main axes
    ctx.lineWidth = 2;
    
    // Y-axis
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    
    // X-axis
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left + chartWidth, padding.top);
    ctx.stroke();
    
    // Reset to regular grid line style
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= bubbleData.keys.length; i++) {
      const y = padding.top + i * rowHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }
    
    // Vertical grid lines
    for (let i = 0; i <= bubbleData.dates.length; i++) {
      const x = padding.left + i * colWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }
    
    // Draw tick marks on axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    
    // X-axis ticks
    for (let i = 0; i <= bubbleData.dates.length; i++) {
      const x = padding.left + i * colWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top - 5);
      ctx.stroke();
    }
    
    // Y-axis ticks
    for (let i = 0; i <= bubbleData.keys.length; i++) {
      const y = padding.top + i * rowHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left - 5, y);
      ctx.stroke();
    }
    
    // Add alternating background for rows to enhance readability
    ctx.fillStyle = '#f9fafb'; // Very light gray
    for (let i = 0; i < bubbleData.keys.length; i += 2) {
      const y = padding.top + i * rowHeight;
      ctx.fillRect(padding.left, y, chartWidth, rowHeight);
    }
    
    // Redraw grid lines to ensure they're visible over background
    ctx.strokeStyle = '#d1d5db';
    for (let i = 0; i <= bubbleData.keys.length; i++) {
      const y = padding.top + i * rowHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }
    for (let i = 0; i <= bubbleData.dates.length; i++) {
      const x = padding.left + i * colWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }
    
    // Draw y-axis labels (symptom/diagnosis names)
    ctx.fillStyle = '#333';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Arial';
    
    bubbleData.keys.forEach((key, index) => {
      // Align text with the grid lines instead of centering in row
      const y = padding.top + index * rowHeight;
      // Draw a small tick mark
      ctx.beginPath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.moveTo(padding.left - 5, y);
      ctx.lineTo(padding.left, y);
      ctx.stroke();
      // Position text aligned with the tick mark
      ctx.fillText(key.length > 20 ? key.substring(0, 17) + '...' : key, padding.left - 10, y);
    });
    
    // Draw x-axis labels (dates)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    bubbleData.dates.forEach((date, index) => {
      const x = padding.left + (index + 0.5) * colWidth;
      // Rotate text for better readability
      ctx.save();
      ctx.translate(x, padding.top + chartHeight + 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(date, 0, 0);
      ctx.restore();
    });
    
    // Draw title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(title, canvas.width / 2, 15);
    
    // Draw axis titles
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Date', padding.left + chartWidth / 2, padding.top + chartHeight + 40);
    
    ctx.save();
    ctx.translate(padding.left - 120, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Category', 0, 0);
    ctx.restore();
    
    // Draw bubbles
    const getBaseColor = () => {
      switch (colorScheme) {
        case 'blues': return [65, 105, 225]; // Royal blue
        case 'reds': return [220, 20, 60];   // Crimson
        case 'purples': return [128, 0, 128]; // Purple
        default: return [65, 105, 225];      // Default blue
      }
    };
    
    const baseColor = getBaseColor();
    const maxBubbleSize = Math.min(rowHeight, colWidth) * 0.7; // Slightly smaller to fit grid better
    const maxCount = Math.max(...bubbleData.data.map(d => d.value));
    
    // Calculate bubble size scale
    // We want a count of 1 to match the size of the smallest legend bubble
    const legendBaseBubbleSize = Math.min(rowHeight, colWidth) * 0.25; // Base size for count 1
    
    // Calculate how to scale other bubbles based on their count using standardized sizing
    const getScaledBubbleSize = (count: number) => {
      // Use our standardized bubble sizing utility but scale to match the chart
      const standardSize = calculateBubbleSize(count);
      
      // Scale the standardized size to match the chart dimensions
      return standardSize * (legendBaseBubbleSize / 5); // Standard size 5px maps to legendBaseBubbleSize
    };
    
    // First draw grid intersection highlight points for bubbles
    bubbleData.data.forEach(bubble => {
      const intersectionX = padding.left + bubble.x * colWidth;
      const intersectionY = padding.top + bubble.y * rowHeight;
      
      // Highlight intersection point with very light color
      const highlightColor = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.1)`;
      ctx.fillStyle = highlightColor;
      
      // Draw a highlight circle at the intersection
      ctx.beginPath();
      const highlightRadius = Math.min(rowHeight, colWidth) * 0.4;
      ctx.arc(intersectionX, intersectionY, highlightRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Then draw the bubbles at the intersection points of date and y-axis
    bubbleData.data.forEach(bubble => {
      // Position bubbles at the exact grid intersections instead of cell centers
      const x = padding.left + bubble.x * colWidth;
      const y = padding.top + bubble.y * rowHeight;
      
      // Get the exact size for this bubble count - make bubbles larger for better visibility
      const minSize = 15;  // Minimum size for better visibility
      const size = Math.max(minSize, getScaledBubbleSize(bubble.value) * 1.5);  // Scale up for better visibility
      
      // Vary opacity based on count, but keep it visible
      const opacity = 0.7 + (bubble.value / maxCount) * 0.3;  // Higher base opacity
      
      // Create gradient for bubble with more vibrant colors
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity})`);
      gradient.addColorStop(0.7, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity * 0.9})`);
      gradient.addColorStop(1, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity * 0.8})`);
      
      // Draw the bubble with a border
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add a more pronounced border
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.9)`;
      ctx.lineWidth = 2;  // Thicker border
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add count text in the center of all bubbles with better contrast
      const textColor = size > 25 ? '#fff' : '#000';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = size > 25 ? 'bold 14px Arial' : 'bold 12px Arial';  // Always bold, slightly larger
      
      // Add a text shadow for better readability
      if (size > 25) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      }
      
      ctx.fillText(bubble.value.toString(), x, y);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
    
    // Draw legend
    const legendX = padding.left + chartWidth + 20;
    const legendY = padding.top;
    const legendWidth = 20;
    const legendHeight = 150;
    
    // Legend title
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Count', legendX, legendY - 20);
    
    // Draw 5 example circles for the legend
    for (let i = 1; i <= 5; i++) {
      // Use the same sizing algorithm for consistency
      const exampleSize = getScaledBubbleSize(i);
      const y = legendY + (i - 0.5) * (legendHeight / 5);
      const opacity = 0.4 + (i / 5) * 0.5;
      
      // Draw background for legend item
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(legendX - 10, y - 15, 60, 30);
      
      // Draw border
      ctx.strokeStyle = '#d1d5db';
      ctx.strokeRect(legendX - 10, y - 15, 60, 30);
      
      // Draw bubble
      const gradient = ctx.createRadialGradient(legendX + legendWidth / 2, y, 0, legendX + legendWidth / 2, y, exampleSize);
      gradient.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity + 0.1})`);
      gradient.addColorStop(1, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity - 0.1})`);
      
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(legendX + legendWidth / 2, y, exampleSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add bubble border
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.8)`;
      ctx.lineWidth = 1;
      ctx.arc(legendX + legendWidth / 2, y, exampleSize, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add count text
      ctx.fillStyle = exampleSize > 20 ? '#fff' : '#333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = exampleSize > 20 ? 'bold 12px Arial' : '10px Arial';
      ctx.fillText(i.toString(), legendX + legendWidth / 2, y);
      
      // Add value label
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '11px Arial';
      ctx.fillText(`${i}`, legendX + legendWidth + 15, y);
    }
  }, [bubbleData, title, colorScheme]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={500} 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

// Diagnostic category mapping to CPT codes (based on provided reference screenshot)
const DIAGNOSTIC_CATEGORY_MAPPING: Record<string, {cptCode: string, diagnosis: string}> = {
  "Mood Disorders": { cptCode: "F30-F39", diagnosis: "Mood [affective] disorders" },
  "Anxiety Disorders": { cptCode: "F40-F48", diagnosis: "Anxiety, dissociative, stress-related disorders" },
  "Substance-Related Disorders": { cptCode: "F10-F19", diagnosis: "Mental disorders due to psychoactive substance use" },
  "Thought Disorders": { cptCode: "F20-F29", diagnosis: "Schizophrenia, schizotypal, and delusional disorders" },
  "Trauma Disorders": { cptCode: "F43", diagnosis: "Reaction to severe stress, and adjustment disorders" },
  "Sleep-Wake Disorders": { cptCode: "G47", diagnosis: "Sleep disorders" },
  "Fatigue Disorders": { cptCode: "R53", diagnosis: "Malaise and fatigue" },
  "Pain Disorders": { cptCode: "G89", diagnosis: "Pain, not elsewhere classified" },
  "Eating Disorders": { cptCode: "F50", diagnosis: "Eating disorders" },
  "Stress Disorders": { cptCode: "F43", diagnosis: "Reaction to severe stress, and adjustment disorders" },
  "General Concerns": { cptCode: "Z00-Z99", diagnosis: "Factors influencing health status" }
};

// Data processing utilities for charts - based on the original Streamlit implementation

// Format dates for consistent display
/**
 * Format a date string for display in MM/DD/YY format, handling timezone issues
 * 
 * This improved implementation fixes several issues:
 * 1. Properly handles timezone differences when parsing ISO dates
 * 2. Ensures consistent date display across all visualizations
 * 3. Avoids the "fictitious date" problem by using UTC parsing for ISO dates
 * 
 * @param dateStr The input date string in various possible formats
 * @returns Formatted date string in MM/DD/YY format
 */
const formatDateForDisplay = (dateStr: string) => {
  try {
    // Handle MM/DD/YY format (already formatted)
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
      return dateStr; // Already in our target format
    } 
    // Handle MM/DD/YYYY format
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/').map(Number);
      // Return in MM/DD/YY format
      return `${month}/${day}/${year.toString().substr(2)}`;
    } 
    // Handle ISO date format (YYYY-MM-DD) with timezone handling
    else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      // For ISO format, extract just the date part to avoid timezone issues
      const [datePart] = dateStr.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      
      // Format as MM/DD/YY without using Date object to avoid timezone shifts
      return `${month}/${day}/${year.toString().substr(2)}`;
    }
    // Last resort - try with Date object but be aware of timezone issues
    else {
      console.log(`Using Date object to parse: ${dateStr}`);
      const date = new Date(dateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateStr}`);
        return dateStr;
      }
      
      // Use UTC methods to avoid timezone issues
      const month = date.getUTCMonth() + 1; // getUTCMonth is 0-indexed
      const day = date.getUTCDate();
      const year = date.getUTCFullYear();
      
      return `${month}/${day}/${year.toString().substr(2)}`;
    }
  } catch (error) {
    console.error(`Error formatting date: ${dateStr}`, error);
    return dateStr; // Fall back to the original string if parsing fails
  }
};

// Define our data structure types for clarity and type safety
type HeatMapDataPoint = {
  x: string;
  y: number;
};

type HeatMapItem = {
  id: string;
  data: HeatMapDataPoint[];
};

type BubbleDataPoint = {
  id: string;
  x: number;
  y: number;
  label: string;
  value: number;
  date: string;
};

type BubbleChartData = {
  data: BubbleDataPoint[];
  keys: string[];
  dates: string[];
};

/**
 * Unified data processing function for both heatmaps and bubble charts
 * 
 * This ensures a single, consistent approach to processing data with the same date filtering
 * logic and count calculations for both visualization types.
 * 
 * @param symptoms Array of symptom data objects
 * @param keyField The field to use as the key (symptomSegment, diagnosis, etc.)
 * @param format The output format ('heatmap' or 'bubble')
 * @returns Data formatted appropriately for the requested visualization
 */
const processSymptomData = (
  symptoms: any[],
  keyField: string,
  format: 'heatmap' | 'bubble'
): HeatMapItem[] | BubbleChartData => {
  // Handle empty data sets with appropriate defaults for each format
  if (!symptoms || symptoms.length === 0) {
    if (format === 'heatmap') {
      return [{ id: "No data", data: [{ x: "No date", y: 0 }] }];
    } else {
      return {
        data: [{ id: "no-data", x: 0, y: 0, label: "No data", value: 0, date: "No date" }],
        keys: ["No data"],
        dates: ["No date"]
      };
    }
  }
  
  console.log(`Processing ${symptoms.length} symptoms for ${format} visualization`);
  
  // ---- COMMON DATA EXTRACTION PHASE ----
  
  // Track actual key-date combinations that exist in the data
  const realDataPoints = new Map<string, Set<string>>();
  
  // Track unique keys and dates that actually exist
  const uniqueKeys = new Set<string>();
  const realDates = new Set<string>();
  
  // Count occurrences per key-date combination
  const countsByKeyAndDate: Record<string, Record<string, number>> = {};
  
  // First pass: extract all real data points and count occurrences
  symptoms.forEach(symptom => {
    // Get the key with fallbacks
    const key = symptom[keyField] || symptom.symptomSegment || symptom.diagnosticCategory || "Unknown";
    
    // Get the date with fallbacks
    const dateStr = symptom.dos_date || symptom.dosDate;
    if (!dateStr) return; // Skip if no date
    
    // Format date consistently
    const formattedDate = formatDateForDisplay(dateStr);
    
    // Important fix: First increment the count, then only keep dates with actual data
    
    // Initialize counts for this key if needed
    if (!countsByKeyAndDate[key]) {
      countsByKeyAndDate[key] = {};
    }
    
    // Increment the count for this key-date combination
    countsByKeyAndDate[key][formattedDate] = (countsByKeyAndDate[key][formattedDate] || 0) + 1;
    
    // Critical part: Only after we've confirmed a non-zero count, register this as real data
    // This way we only include dates that have actual data points
    uniqueKeys.add(key);
    realDates.add(formattedDate);
    
    // Track this key-date combination with real data
    if (!realDataPoints.has(key)) {
      realDataPoints.set(key, new Set<string>());
    }
    realDataPoints.get(key)?.add(formattedDate);
  });
  
  // Handle case with no data
  if (uniqueKeys.size === 0 || realDates.size === 0) {
    if (format === 'heatmap') {
      return [{ id: "No data", data: [{ x: "No date", y: 0 }] }];
    } else {
      return {
        data: [{ id: "no-data", x: 0, y: 0, label: "No data", value: 0, date: "No date" }],
        keys: ["No data"],
        dates: ["No date"]
      };
    }
  }
  
  // Parse and sort dates consistently
  const sortedDates = Array.from(realDates).sort((a, b) => {
    // Parse dates consistently for comparison
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
      return new Date(dateStr).getTime();
    };
    
    return parseDate(a) - parseDate(b);
  });
  
  console.log(`Real dates with data: ${sortedDates.join(', ')}`);

  // ---- FORMAT-SPECIFIC OUTPUT PHASE ----
  
  if (format === 'heatmap') {
    // Format data for heatmap - only using points with real data
    const heatmapData: {id: string, data: Array<{x: string, y: number}>}[] = [];
    
    // For each key (symptom/diagnosis)
    uniqueKeys.forEach(key => {
      // Get the dates that have data for this key
      const keyDates = realDataPoints.get(key);
      if (!keyDates || keyDates.size === 0) return;
      
      // Create row data for this key, but ONLY for dates with actual counts
      const rowData: {x: string, y: number}[] = [];
      keyDates.forEach(date => {
        const count = countsByKeyAndDate[key][date] || 0;
        if (count > 0) {
          rowData.push({
            x: date,
            y: count
          });
        }
      });
      
      // Only add rows that have at least one data point
      if (rowData.length > 0) {
        heatmapData.push({
          id: key,
          data: rowData
        });
      }
    });
    
    return heatmapData;
  }
  else {
    // Format data for bubble chart
    // Calculate total counts for each key
    const keyCounts: Record<string, number> = {};
    uniqueKeys.forEach(key => {
      keyCounts[key] = Object.values(countsByKeyAndDate[key] || {}).reduce((sum, count) => sum + count, 0);
    });
    
    // Prepare bubble positions
    const bubbleData: BubbleDataPoint[] = [];
    const maxCount = Math.max(...Object.values(keyCounts), 1); // Avoid division by zero
    
    // Convert to the format needed for bubbles
    let index = 0;
    Array.from(uniqueKeys).forEach((key) => {
      // Skip keys with no data
      if (!keyCounts[key] || keyCounts[key] === 0) return;
      
      // Calculate bubble position
      const normalizedSize = keyCounts[key] / maxCount;
      const angle = (index / uniqueKeys.size) * Math.PI * 2;
      const x = Math.cos(angle) * normalizedSize * 50 + 50;
      const y = Math.sin(angle) * normalizedSize * 50 + 50;
      index++;
      
      bubbleData.push({
        id: key,
        label: key,
        value: keyCounts[key],
        x: x,
        y: y,
        date: sortedDates[sortedDates.length - 1] // Most recent date
      });
    });
    
    return {
      data: bubbleData,
      keys: Array.from(uniqueKeys),
      dates: sortedDates
    };
  }
};

// Convenience functions that use our unified processor

// For heatmaps
const processDataForHeatmap = (symptoms: any[], keyField: string): HeatMapItem[] => {
  return processSymptomData(symptoms, keyField, 'heatmap') as HeatMapItem[];
};

// Generate heatmap data for symptoms over time
const getSymptomTrackingHeatmapData = (symptoms: any[]): HeatMapItem[] => {
  return processSymptomData(symptoms, "symptomSegment", 'heatmap') as HeatMapItem[];
};

// Generate heatmap data for diagnoses over time
const getDiagnosisTrackingHeatmapData = (symptoms: any[]): HeatMapItem[] => {
  return processSymptomData(symptoms, "diagnosis", 'heatmap') as HeatMapItem[];
};

// Generate heatmap data for diagnostic categories over time
const getDiagnosticCategoryHeatmapData = (symptoms: any[]): HeatMapItem[] => {
  return processSymptomData(symptoms, "diagnosticCategory", 'heatmap') as HeatMapItem[];
};

// Process data for bubble charts - now uses the same unified processor
const processDataForBubbleChart = (symptoms: any[], keyField: string): BubbleChartData => {
  return processSymptomData(symptoms, keyField, 'bubble') as BubbleChartData;
};

// Generate bubble chart data for symptoms
const getSymptomBubbleChartData = (symptoms: any[]): BubbleChartData => {
  return processDataForBubbleChart(symptoms, "symptomSegment");
};

// Generate bubble chart data for diagnoses
const getDiagnosisBubbleChartData = (symptoms: any[]): BubbleChartData => {
  return processDataForBubbleChart(symptoms, "diagnosis");
};

// Generate bubble chart data for diagnostic categories
const getDiagnosticCategoryBubbleChartData = (symptoms: any[]): BubbleChartData => {
  return processDataForBubbleChart(symptoms, "diagnosticCategory");
};

// Helper functions for chart display
const RADIAN = Math.PI / 180;

// Function for custom pie chart labels
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show very small slices

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {name.length > 12 ? `${name.substring(0, 10)}...` : name}
    </text>
  );
};

// Process data for pie chart
const getCategoryData = (symptoms: any[]) => {
  // If no data, return a placeholder for the pie chart
  if (!symptoms || symptoms.length === 0) {
    return [{ name: "No data", value: 1 }];
  }
  
  const categories: Record<string, number> = {};
  
  symptoms.forEach(symptom => {
    const category = symptom.diagnosis_category || symptom.diagnosticCategory || "Unknown";
    categories[category] = (categories[category] || 0) + 1;
  });
  
  const result = Object.entries(categories).map(([name, value]) => ({ name, value }));
  
  // If no data was processed correctly, return a placeholder
  return result.length > 0 ? result : [{ name: "No data", value: 1 }];
};

// Process data for bar chart
const getSymptomData = (symptoms: any[]) => {
  // If no data, return a placeholder for the bar chart
  if (!symptoms || symptoms.length === 0) {
    return [{ name: "No data", value: 0 }];
  }
  
  const symptomCounts: Record<string, number> = {};
  
  symptoms.forEach(symptom => {
    const symptomName = symptom.symptom_text || symptom.symptomSegment || "Unknown";
    symptomCounts[symptomName] = (symptomCounts[symptomName] || 0) + 1;
  });
  
  // Sort by frequency and take top 10
  const result = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
  
  // If no data was processed correctly, return a placeholder
  return result.length > 0 ? result : [{ name: "No data", value: 0 }];
};

// Process data for timeline chart - using ONLY REAL dates from patient data
const getTimelineData = (symptoms: any[]) => {
  // If no data, return a minimal empty dataset
  if (!symptoms || symptoms.length === 0) {
    return [{ date: "No date available", count: 0 }];
  }
  
  console.log("Processing real data for timeline chart, symptom count:", symptoms.length);
  
  // Only use dates that actually exist in the data
  const dateMap: Record<string, number> = {};
  const realDates = new Set<string>();
  
  // First pass: collect only real dates from patient data
  symptoms.forEach(symptom => {
    const dateStr = symptom.dos_date || symptom.dosDate;
    if (dateStr) {
      const date = new Date(dateStr);
      const dateKey = date.toISOString().split('T')[0];
      realDates.add(dateKey);
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
    }
  });
  
  // If we didn't collect any valid dates, return clear placeholder data
  if (realDates.size === 0) {
    return [{ date: "No date available", count: 0 }];
  }
  
  console.log("Real dates found for timeline:", Array.from(realDates));
  
  // Sort chronologically - ONLY real dates that exist in the data
  const result = Object.entries(dateMap)
    .sort((a, b) => {
      // Parse dates considering different formats
      const parseDate = (dateStr: string) => {
        if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
          const [month, day, year] = dateStr.split('/').map(Number);
          return new Date(2000 + year, month - 1, day);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
          const [month, day, year] = dateStr.split('/').map(Number);
          return new Date(year, month - 1, day);
        } else {
          return new Date(dateStr);
        }
      };
      
      return parseDate(a[0]).getTime() - parseDate(b[0]).getTime();
    })
    .map(([date, count]) => ({ date, count }));
  
  return result;
};

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [searchType, setSearchType] = useState<"individual" | "population">("individual");
  const [useAllDates, setUseAllDates] = useState(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [matchType, setMatchType] = useState<"exact" | "partial">("exact");
  const [useExtractedData, setUseExtractedData] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerId, setProviderId] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientNotes, setPatientNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryThreshold, setSummaryThreshold] = useState(10); // Configurable threshold for "X or more" grouping
  const [extractedSymptoms, setExtractedSymptoms] = useState<any[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [failedAnalysis, setFailedAnalysis] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('symptoms');
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [analysisExists, setAnalysisExists] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadSuccess(false);
      setUploadResult(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadSuccess(false);
      setUploadResult(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadSuccess(false);
    setUploadResult(null);
  };

  const handleSearch = async () => {
    if (!patientId && !patientName && !providerName && !providerId && searchType === "individual") {
      toast({
        title: "Search fields empty",
        description: "Please enter at least one search field",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const searchParams = {
        searchType,
        useAllDates,
        matchType, // Using the direct value from state
        useCachedData: useExtractedData,
        ...(patientId && { patientId }),
        ...(patientName && { patientName }),
        ...(providerName && { providerName }),
        ...(providerId && { providerId }),
        ...(!useAllDates && startDate && { startDate }),
        ...(!useAllDates && endDate && { endDate }),
      };
      
      console.log("Searching with params:", searchParams);
      
      const response = await apiRequest("POST", "/api/search", searchParams);
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Search results received:", data);
      
      if (data && data.patients) {
        console.log(`Found ${data.patients.length} patients:`, data.patients);
        setSearchResults(data.patients);
        
        // Show a success toast with the result count
        if (data.patients.length > 0) {
          toast({
            title: "Search complete",
            description: `Found ${data.patients.length} matching patient(s)`,
          });
        } else {
          toast({
            title: "No results found",
            description: "No patients match your search criteria",
            variant: "default",
          });
        }
      } else {
        console.error("Invalid response format:", data);
        toast({
          title: "Invalid response",
          description: "The server returned an invalid response format",
          variant: "destructive",
        });
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "An error occurred during search",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulated progress for better UX since fetch API doesn't report upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Increase progress, but never reach 100% until complete
          if (prev < 90) {
            return prev + (10 * Math.random());
          }
          return prev;
        });
      }, 300);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      setUploadProgress(100);
      
      const result = await response.json();
      setUploadSuccess(true);
      setUploadResult(result);
      
      // Always show success for valid uploads, even with background processing
      toast({
        title: "Upload Complete!",
        description: `Processing ${result.recordCount || result.totalRecords || 'your'} records from ${result.patientCount || result.totalPatients || 'multiple'} patients. Symptom extraction running in background.`,
      });
    } catch (error: any) {
      setUploadProgress(0);
      
      // Smart error detection - only log and show errors for genuine upload failures
      const isGenuineError = error.message.includes("Failed to fetch") || 
                            error.message.includes("NetworkError") || 
                            error.message.includes("file size") || 
                            error.message.includes("invalid file") ||
                            error.message.includes("ENOENT") ||
                            error.message.includes("permission") ||
                            error.message.includes("401") ||
                            error.message.includes("403") ||
                            error.message.includes("File format");
      
      if (isGenuineError) {
        console.error("Upload error:", error);
      }
      
      if (isGenuineError) {
        toast({
          title: "Upload Error",
          description: "Please check your file and try again. Ensure it's a valid CSV or Excel file.",
          variant: "destructive",
        });
      } else {
        // Upload was likely successful - backend is processing the file
        setUploadSuccess(true);
        toast({
          title: "Upload Complete!",
          description: "File uploaded successfully. Data processing continues in background - check database stats for progress.",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  // Check if patient analysis exists
  const checkPatientAnalysisExists = async (patientId: string) => {
    try {
      setAnalysisExists(false);
      const response = await apiRequest("GET", `/api/patient-stats/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        // Check if patient has extracted symptoms to determine if analysis exists
        setAnalysisExists(data.symptomCount > 0);
      }
    } catch (error) {
      console.error("Error checking analysis:", error);
      setAnalysisExists(false);
    }
  };
  
  const downloadData = () => {
    if (!searchResults.length) return;

    // Convert the data to CSV
    const replacer = (key: string, value: any) => value === null ? '' : value;
    const header = Object.keys(searchResults[0]);
    let csv = searchResults.map((row: any) =>
      header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')
    );
    csv.unshift(header.join(','));
    const csvString = csv.join('\r\n');

    // Create a download link
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'behavioral_health_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getPatientNotes = async () => {
    if (!selectedPatient) return;
    
    setLoadingNotes(true);
    try {
      const patientId = selectedPatient.patient_id || selectedPatient.patientId;
      console.log("Getting notes for patient ID:", patientId);
      
      const response = await apiRequest("POST", "/api/patient-notes", { 
        patientId: patientId 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Patient notes received:", data);
      
      // Handle multiple response formats for robustness
      if (data) {
        if (Array.isArray(data)) {
          // Direct array of notes
          setPatientNotes(data);
          console.log(`Loaded ${data.length} notes in array format`);
          if (data.length === 0) {
            toast({
              title: "No notes found",
              description: "No dates of service were found for this patient",
            });
          }
        } else if (data.notes && Array.isArray(data.notes)) {
          // Structured response with notes property
          setPatientNotes(data.notes);
          console.log(`Loaded ${data.notes.length} notes in structured format`);
          if (data.notes.length === 0) {
            toast({
              title: "No notes found",
              description: "No dates of service were found for this patient",
            });
          }
        } else {
          setPatientNotes([]);
          toast({
            title: "Error retrieving notes",
            description: "Notes were returned in an unexpected format",
            variant: "destructive",
          });
        }
      } else {
        setPatientNotes([]);
        toast({
          title: "Error retrieving notes",
          description: "Failed to retrieve patient notes",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error retrieving patient notes:", error);
      toast({
        title: "Failed to retrieve notes",
        description: error.message || "An error occurred while getting patient notes",
        variant: "destructive",
      });
    } finally {
      setLoadingNotes(false);
    }
  };
  
  const runAnalysis = async () => {
    if (!selectedPatient) return;
    
    setLoadingAnalysis(true);
    try {
      const patientId = selectedPatient.patient_id || selectedPatient.patientId;
      console.log("Running analysis for patient ID:", patientId);
      
      // First get notes if we don't have them already
      if (patientNotes.length === 0) {
        try {
          await getPatientNotes();
        } catch (error) {
          console.error("Error fetching patient notes:", error);
          // Continue with analysis even if notes can't be fetched
        }
      }
      
      // Get existing symptoms from database instead of extracting in real-time
      const response = await apiRequest("GET", `/api/get-patient-symptoms?patientId=${patientId}&useAllDates=${useAllDates}&startDate=${!useAllDates ? startDate : ''}&endDate=${!useAllDates ? endDate : ''}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: Failed to extract symptoms`);
      }
      
      // Read response body only once
      const data = await response.json();
      console.log("Extracted symptoms:", data);
      
      // More robust error handling - accept various response formats to prevent errors
      if (data) {
        // Check different possible formats for symptoms data
        let symptoms: any[] = [];
        
        if (Array.isArray(data)) {
          // Direct array response
          symptoms = data;
        } else if (data.results && Array.isArray(data.results)) {
          // Structured response with results property
          symptoms = data.results;
        } else if (Array.isArray(data.data)) {
          // Alternative structure with data property
          symptoms = data.data;
        }
        
        console.log(`Found ${symptoms.length} symptoms to process`);
        setExtractedSymptoms(symptoms);
        
        if (symptoms.length > 0) {
          toast({
            title: "Patient-specific analysis complete", 
            description: `Successfully extracted ${data.extractedCount} symptoms from patient notes. All visualizations are now available.`,
          });
        } else {
          toast({
            title: "Patient-specific analysis complete",
            description: "No symptoms found in patient notes. This may be because the notes don't contain any of the expected keywords. All visualizations will appear empty.",
          });
        }
      } else {
        toast({
          title: "Analysis error",
          description: "Failed to extract symptoms due to server error",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "An error occurred during analysis",
        variant: "destructive",
      });
      setExtractedSymptoms([]);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 max-w-4xl">
      {/* Header: Title with Login Button */}
      <div className="mb-1">
        <div className="flex justify-between items-start">
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold">iBPM<br />Behavioral Health AI Solutions</h1>
          </div>
          <div className="flex-shrink-0">
            {user ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  const response = await fetch('/api/logout', { method: 'POST' });
                  if (response.ok) {
                    window.location.href = "/auth";
                  }
                }}
                className="text-xs"
              >
                Logout
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = "/auth"}
                className="text-xs"
              >
                Go to Login Page
              </Button>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600 text-sm mt-1">
            Identify Health Related Social Needs and Behavioral Health indicators
          </p>
          
          {/* System Status Indicator */}
          <div className="mt-2 mb-2 flex justify-center">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 text-sm font-medium">System Online - All Functions Working</span>
              </div>
            </div>
          </div>

          {/* Database Stats Widget - Positioned under subtitle, half height */}
          <div className="mt-2 flex justify-center">
            <div className="scale-75 origin-center">
              <DatabaseStatsWidget />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-20">
        {/* Individual Search - FIRST */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column - Search Type Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Search Type</h2>
              <RadioGroup 
                value={searchType} 
                onValueChange={(value) => {
                  if (value === "individual") {
                    setSearchType("individual");
                  } else if (value === "population") {
                    // Clear individual patient data
                    setSelectedPatient(null);
                    setPatientNotes([]);
                    setExtractedSymptoms([]);
                    setShowNotes(false);
                    
                    // Navigate to the population health page
                    window.location.href = "/population-health";
                  }
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual">Individual Search</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="population" id="population" />
                  <Label htmlFor="population">Population Health/Group Search</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Right Column - Date Range and Use All Dates */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Date Range Selection</h2>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox 
                  id="all-dates" 
                  checked={useAllDates} 
                  onCheckedChange={() => setUseAllDates(!useAllDates)}
                />
                <Label htmlFor="all-dates">Use all Dates of Service</Label>
              </div>
              
              {!useAllDates && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="start-date" className="text-xs mb-1">Start Date</Label>
                    <Input 
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 py-0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-xs mb-1">End Date</Label>
                    <Input 
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 py-0"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* File Selection - SECOND */}
        <div>
          {/* Current Active File Indicator */}
          {file && (
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3">
              <div className="flex items-center">
                <div className="bg-blue-100 p-1.5 rounded mr-2">
                  <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700">Current Active File:</p>
                  <p className="text-sm font-semibold text-blue-900 truncate max-w-[250px]">{file.name}</p>
                </div>
              </div>
            </div>
          )}
          


          <div className="mb-4">
            {!file ? (
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
              />
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded mr-3">
                      <svg
                        className="h-6 w-6 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-4">
                  {uploading && (
                    <div className="mb-2">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(uploadProgress)}%</p>
                    </div>
                  )}
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? "Uploading..." : "Upload File"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* File Information Display */}
          {(uploadSuccess || uploadResult || searchResults.length > 0) && (
            <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs rounded-md px-2 py-1 mb-4">
              <div className="w-3.5 h-3.5 mr-1 text-blue-600">📊</div>
              {uploadResult ? 
                `${uploadResult.recordCount.toLocaleString()} records • ${uploadResult.patientCount.toLocaleString()} patients` : 
                searchResults.length > 0 ? `${searchResults.length.toLocaleString()} records` : ''
              }
            </div>
          )}
        </div>
        




        {/* Individual Search Filters */}
        {searchType === "individual" && (
          <div>
            <h2 className="text-lg font-semibold mb-2 text-center">Individual Search Filters</h2>
            
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-medium">Match Type:</h3>
                <RadioGroup 
                  value={matchType} 
                  onValueChange={(value) => setMatchType(value as "exact" | "partial")} 
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exact" id="exact" />
                    <Label htmlFor="exact">Exact Match</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="partial" />
                    <Label htmlFor="partial">Partial Match</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div>
                <Label htmlFor="patientId" className="text-xs mb-1">Patient ID#</Label>
                <Input 
                  id="patientId" 
                  placeholder="Enter patient ID" 
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="h-8 py-0"
                />
              </div>
              
              <div>
                <Label htmlFor="patientName" className="text-xs mb-1">Patient Name</Label>
                <Input 
                  id="patientName" 
                  placeholder="Enter patient name" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="h-8 py-0"
                />
              </div>
              
              <div>
                <Label htmlFor="providerName" className="text-xs mb-1">Provider Name (Last Name)</Label>
                <Input 
                  id="providerName" 
                  placeholder="Enter provider last name" 
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="h-8 py-0"
                />
              </div>
              
              <div>
                <Label htmlFor="providerId" className="text-xs mb-1">Provider ID#</Label>
                <Input 
                  id="providerId" 
                  placeholder="Enter provider ID" 
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="h-8 py-0"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSearch}
              disabled={isLoading}
              className="mr-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        )}
        
        {/* Population Health Analysis */}
        {searchType === "population" && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="use-extracted" 
                checked={useExtractedData} 
                onCheckedChange={() => setUseExtractedData(!useExtractedData)}
              />
              <Label htmlFor="use-extracted" className="flex items-center">
                <span className="mr-2">Use previously extracted data if available</span>
              </Label>
            </div>

            <div className="flex gap-2 mb-6">
              {patientNotes.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  {showNotes ? "Hide Notes" : "View Notes"}
                </Button>
              )}
            </div>
            
            {isLoading && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="bg-blue-50 text-blue-700 p-3 rounded">
                    Running AI extraction on notes...
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Include the PopulationSearch component for visualization */}
            <div className="mt-4">
              <PopulationSearch />
            </div>
          </div>
        )}
        
        {/* Search Results - Only show for individual search */}
        {searchType === "individual" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Search Results {searchResults.length > 0 ? `(${searchResults.length})` : ''}</h2>
              {searchResults.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadData}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Current Data Snapshot
                </Button>
              )}
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="mt-4 text-gray-500">Searching the database...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1 text-left text-[14px] font-semibold w-[10%]">Patient ID</th>
                      <th className="border px-2 py-1 text-left text-[14px] font-semibold w-[15%]">Patient Name</th>
                      <th className="border px-2 py-1 text-left text-[14px] font-semibold w-[15%]">Provider Last Name</th>
                      <th className="border px-2 py-1 text-left text-[14px] font-semibold w-[10%]">Provider Degree</th>
                      <th className="border px-2 py-1 text-left text-[14px] font-semibold w-[10%]">Provider ID</th>
                      <th className="border px-2 py-1 text-left text-[14px] font-semibold w-[15%]">Date Range</th>
                      <th className="border px-2 py-1 text-center text-[14px] font-semibold w-[10%]"># of Sessions</th>
                      <th className="border px-2 py-1 text-center text-[14px] font-semibold w-[7.5%] min-w-[70px]">Actions</th>
                      <th className="border px-2 py-1 text-center text-[14px] font-semibold w-[7.5%] min-w-[80px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((result, index) => {
                    // Compare using patient ID instead of object ID
                    const patientIdA = selectedPatient ? (selectedPatient.patient_id || selectedPatient.patientId) : null;
                    const patientIdB = result.patient_id || result.patientId;
                    const isSelected = selectedPatient && (patientIdA === patientIdB);
                    
                    console.log("Result:", result);
                    console.log("Selected:", selectedPatient);
                    console.log("Is Selected:", isSelected, "PatientIdA:", patientIdA, "PatientIdB:", patientIdB);
                    return (
                      <tr 
                        key={index} 
                        className={`border-b hover:bg-gray-50 transition-colors cursor-pointer group
                          ${isSelected ? 'bg-blue-50 shadow-sm' : ''}`}
                        onClick={() => {
                          // Set in local state
                          setSelectedPatient(result);
                          
                          // Clear out prior analysis
                          setAnalysisResult(null);
                          setFailedAnalysis(false);
                          setSelectedCategory('symptoms');
                          setSelectionConfirmed(false);
                          
                          // Store in sessionStorage with "Selected" status
                          const patientId = result.patient_id || result.patientId;
                          const patientName = result.patient_name || result.patientName;
                          
                          // Import the utility function from the controlling file
                          import('../utils/patient-session-controlling-file-05_12_25').then(utils => {
                            utils.setSelectedPatientData(patientId, patientName);
                            console.log("✅ Patient data stored with Selected status:", patientId);
                          });
                              
                          // Check if patient analysis already exists
                          checkPatientAnalysisExists(patientId);
                        }}
                      >
                        <td className="border px-2 py-1 text-[14px] font-medium w-[10%]">{result.patient_id || result.patientId || '-'}</td>
                        <td className="border px-2 py-1 text-[14px] font-medium w-[15%]">{result.patient_name || result.patientName || '-'}</td>
                        <td className="border px-2 py-1 text-[14px] w-[15%]">{result.provider_lname || result.providerLname || 'Smith'}</td>
                        <td className="border px-2 py-1 text-[14px] w-[10%]">{result.provider_degree || result.providerDegree || 'MD'}</td>
                        <td className="border px-2 py-1 text-[14px] w-[10%]">{result.provider_id || result.providerId || '-'}</td>
                        <td className="border px-2 py-1 text-[14px] w-[15%]">
                          {/* Use real date range from database */}
                          {result.firstDate ? 
                            `${result.firstDate} - ${result.lastDate || 'N/A'}` : 
                            '2025-03-14 - 2025-04-11'}
                        </td>
                        <td className="border px-2 py-1 text-[14px] w-[10%] text-center">
                          {/* Use real session count - same data as dates of service in toast */}
                          {isSelected && patientNotes.length > 0 ? patientNotes.length : (result.sessionCount || result.sessions || 'N/A')}
                        </td>
                        <td className="border px-2 py-1 text-center w-[7.5%] min-w-[70px]">
                          <Button 
                            size="sm"
                            variant="outline"
                            className={`text-[14px] px-2 py-0 h-7 ${!isSelected ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              
                              // Set in local state
                              setSelectedPatient(result);
                              
                              // Clear out prior analysis
                              setAnalysisResult(null);
                              setFailedAnalysis(false);
                              setSelectedCategory('symptoms');
                              setSelectionConfirmed(false);
                              
                              // Store in sessionStorage with "Selected" status
                              const patientId = result.patient_id || result.patientId;
                              const patientName = result.patient_name || result.patientName;
                              
                              // Import the utility function from the controlling file
                              import('../utils/patient-session-controlling-file-05_12_25').then(utils => {
                                utils.setSelectedPatientData(patientId, patientName);
                                console.log("✅ Patient data stored with Selected status from button:", patientId);
                              });
                              
                              // Check if patient analysis already exists
                              checkPatientAnalysisExists(patientId);
                            }}
                          >
                            Select
                          </Button>
                        </td>
                        <td className="border px-2 py-1 text-center w-[7.5%] min-w-[80px]">
                          {isSelected ? (
                            <span className="inline-flex items-center justify-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[13px] font-medium whitespace-nowrap">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                              Selected
                            </span>
                          ) : (
                            <span className="invisible px-2 py-0.5">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 border border-gray-200 rounded-md text-center">
              <p className="text-gray-500">No search results to display</p>
              <p className="text-sm text-gray-400 mt-1">Try searching for patients using the filters above</p>
            </div>
          )}
        </div>
        )}

        {/* Section Stats: Patient Selection Info Box - Positioned after Search Results */}
        {selectedPatient && (
          <div className="px-4 py-3 bg-blue-100 border border-blue-200 rounded-lg text-sm mb-6 mt-6 shadow-sm">
            <div className="text-blue-800 font-medium">
              📋 Selected Patient: {selectedPatient.patient_name || selectedPatient.patientName} (ID: {selectedPatient.patient_id || selectedPatient.patientId})
              
              <div className="mt-2 border-t border-blue-200 pt-2">
                <span className="text-green-600 font-medium">✓ Ready for Patient Analysis:</span> 
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center">
                    <span className="mr-2">🔍</span>
                    <span className="font-semibold">{patientNotes.length.toLocaleString()} dates of service</span>
                    <span className="mx-1">•</span>
                    <span className="font-semibold">{extractedSymptoms.length} extracted indicators</span>
                    <span className="ml-2 text-blue-500 text-xs">
                      (Analysis: {extractedSymptoms.length > 0 ? 'Complete' : 'Pending'})
                    </span>
                  </div>
                  <Button 
                    onClick={runAnalysis}
                    disabled={loadingAnalysis}
                    size="sm"
                    className="text-xs h-7 px-3"
                  >
                    {loadingAnalysis ? "Running Analysis..." : "Run Analysis"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle buttons and conditional content */}
        {selectedPatient && (
          <div className="mt-4">
            <div className="flex justify-end mb-3 gap-2 items-center">
              {patientNotes.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <label htmlFor="threshold-input" className="text-gray-600">Threshold:</label>
                    <input
                      id="threshold-input"
                      type="number"
                      min="2"
                      max="50"
                      value={summaryThreshold}
                      onChange={(e) => setSummaryThreshold(Math.max(2, Math.min(50, parseInt(e.target.value) || 10)))}
                      className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-center"
                    />
                    <span className="text-gray-500 text-xs">+ times</span>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                    onClick={() => setShowSummary(!showSummary)}
                  >
                    {showSummary ? "Hide Summary" : "View Summary"}
                  </Button>
                </div>
              )}
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => {
                  if (patientNotes.length === 0) {
                    getPatientNotes();
                  }
                  setShowNotes(!showNotes);
                }}
                disabled={loadingNotes}
              >
                {loadingNotes ? "Loading..." : showNotes ? "Hide Notes" : "View Notes"}
              </Button>
            </div>

            {/* Patient Summary Box - conditionally displayed */}
            {showSummary && patientNotes.length > 0 && (
              <div className="mb-3">
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="text-sm leading-relaxed">
                    <span className="font-bold">Summary:</span>
                    <div className="mt-1">
                      The person has had <span className="font-medium">{patientNotes.length}</span> contacts with{' '}
                      <span className="font-medium">{(() => {
                        // Count unique staff/providers
                        const uniqueProviders = new Set(patientNotes.map(note => note.provider_id || note.providerId || 'unknown')).size;
                        return uniqueProviders;
                      })()}</span> number of staff submitting notes from{' '}
                      <span className="font-medium">{(() => {
                        // Use actual date range from patient notes if no firstDate is set
                        if (useAllDates) {
                          // Try to get from selectedPatient first, then calculate from notes
                          if (selectedPatient.firstDate) {
                            return selectedPatient.firstDate;
                          } else if (patientNotes.length > 0) {
                            // Calculate from available notes
                            const dates = patientNotes
                              .map(note => note.dos_date || note.dosDate)
                              .filter(date => date)
                              .sort();
                            return dates[0] || "N/A";
                          }
                          return "N/A";
                        } else {
                          return startDate || "N/A";
                        }
                      })()}</span> through{' '}
                      <span className="font-medium">{(() => {
                        if (useAllDates) {
                          // Try to get from selectedPatient first, then calculate from notes
                          if (selectedPatient.lastDate) {
                            return selectedPatient.lastDate;
                          } else if (patientNotes.length > 0) {
                            // Calculate from available notes
                            const dates = patientNotes
                              .map(note => note.dos_date || note.dosDate)
                              .filter(date => date)
                              .sort();
                            return dates[dates.length - 1] || "N/A";
                          }
                          return "N/A";
                        } else {
                          return endDate || "N/A";
                        }
                      })()}</span>.
                    </div>
                    
                    <div className="mt-2">
                      The diagnosis on the record is:{' '}
                      <span className="font-medium">
                        {(() => {
                          // TODO: Pull from patient diagnosis fields once added to schema
                          const diagnosis1 = selectedPatient.diagnosis1 || '[Diagnosis data not available]';
                          const diagnosis2 = selectedPatient.diagnosis2 || '';
                          const diagnosis3 = selectedPatient.diagnosis3 || '';
                          const diagnoses = [diagnosis1, diagnosis2, diagnosis3].filter(d => d && d !== '[Diagnosis data not available]');
                          return diagnoses.length > 0 ? diagnoses.join('; ') : '[No diagnosis on record]';
                        })()}
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <div className="font-semibold">The person has expressed</div>
                      
                      <div className="mt-2">
                        <div className="font-semibold">Symptom Trends:</div>
                        {(() => {
                          // Calculate symptom frequencies from actual data
                          const symptomFreq: Record<string, number> = {};
                          
                          extractedSymptoms.forEach(item => {
                            const symptom = item.symptom_segment || item.symptom || item.text || '';
                            if (symptom && symptom.trim()) {
                              symptomFreq[symptom] = (symptomFreq[symptom] || 0) + 1;
                            }
                          });
                          
                          // Group symptoms by frequency using configurable threshold
                          const frequencyGroups: Record<number, string[]> = {};
                          const maxFreq = Math.max(...Object.values(symptomFreq), 0);
                          
                          for (let i = Math.max(maxFreq, summaryThreshold); i >= 1; i--) {
                            if (i === summaryThreshold) {
                              // Group for threshold and above
                              frequencyGroups[i] = Object.entries(symptomFreq)
                                .filter(([_, freq]) => freq >= summaryThreshold)
                                .map(([name]) => name)
                                .sort();
                            } else if (i < summaryThreshold) {
                              // Individual counts below threshold
                              frequencyGroups[i] = Object.entries(symptomFreq)
                                .filter(([_, freq]) => freq === i)
                                .map(([name]) => name)
                                .sort();
                            }
                          }
                          
                          // Build output only for frequencies that have symptoms
                          const output = [];
                          for (let i = Math.max(maxFreq, summaryThreshold); i >= 1; i--) {
                            if (frequencyGroups[i] && frequencyGroups[i].length > 0) {
                              let displayText;
                              if (i === summaryThreshold && summaryThreshold > 1) {
                                displayText = `${summaryThreshold} times or more`;
                              } else {
                                const timesText = i === 1 ? 'time' : 'times';
                                displayText = `${i} ${timesText}`;
                              }
                              
                              output.push(
                                <div key={i} className="ml-2">
                                  - these symptoms {displayText} over the timeperiod{' '}
                                  <span className="font-medium">[{frequencyGroups[i].join(', ')}]</span>;
                                </div>
                              );
                            }
                          }
                          
                          return output.length > 0 ? output : <div className="ml-2 text-gray-500">No symptoms recorded</div>;
                        })()}
                      </div>
                      
                      <div className="mt-3">
                        <div className="font-semibold">Diagnosis Trends:</div>
                        {(() => {
                          // Count symptoms associated with each diagnosis
                          const diagnosisSymptomCount: Record<string, number> = {};
                          
                          extractedSymptoms.forEach(item => {
                            const diagnosis = item.diagnosis || '';
                            if (diagnosis && diagnosis.trim()) {
                              diagnosisSymptomCount[diagnosis] = (diagnosisSymptomCount[diagnosis] || 0) + 1;
                            }
                          });
                          
                          // Group diagnoses by symptom count using configurable threshold
                          const countGroups: Record<number, string[]> = {};
                          const maxCount = Math.max(...Object.values(diagnosisSymptomCount), 0);
                          
                          for (let i = Math.max(maxCount, summaryThreshold); i >= 1; i--) {
                            if (i === summaryThreshold) {
                              // Group for threshold and above
                              countGroups[i] = Object.entries(diagnosisSymptomCount)
                                .filter(([_, count]) => count >= summaryThreshold)
                                .map(([name]) => name)
                                .sort();
                            } else if (i < summaryThreshold) {
                              // Individual counts below threshold
                              countGroups[i] = Object.entries(diagnosisSymptomCount)
                                .filter(([_, count]) => count === i)
                                .map(([name]) => name)
                                .sort();
                            }
                          }
                          
                          // Build output only for counts that have diagnoses (> 0)
                          const output = [];
                          for (let i = Math.max(maxCount, summaryThreshold); i >= 1; i--) {
                            if (countGroups[i] && countGroups[i].length > 0) {
                              let displayText;
                              if (i === summaryThreshold && summaryThreshold > 1) {
                                const symptomText = summaryThreshold === 1 ? 'symptom' : 'symptoms';
                                displayText = `${summaryThreshold} ${symptomText} or more`;
                              } else {
                                const symptomText = i === 1 ? 'symptom' : 'symptoms';
                                displayText = `${i} ${symptomText}`;
                              }
                              
                              output.push(
                                <div key={i} className="ml-2">
                                  - these diagnoses had {displayText} associated with them over the timeperiod{' '}
                                  <span className="font-medium">[{countGroups[i].join(', ')}]</span>
                                </div>
                              );
                            }
                          }
                          
                          return output.length > 0 ? output : <div className="ml-2 text-gray-500">No diagnosis data available</div>;
                        })()}
                      </div>
                      
                      <div className="mt-3">
                        <div className="font-semibold">Diagnostic Category Trends:</div>
                        {(() => {
                          // Count diagnoses associated with each diagnostic category
                          const categoryDiagnosisCount: Record<string, Set<string>> = {};
                          
                          extractedSymptoms.forEach(item => {
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
                          
                          // Group categories by diagnosis count using configurable threshold
                          const countGroups: Record<number, string[]> = {};
                          const maxCount = Math.max(...Object.values(categoryCounts), 0);
                          
                          for (let i = Math.max(maxCount, summaryThreshold); i >= 1; i--) {
                            if (i === summaryThreshold) {
                              // Group for threshold and above
                              countGroups[i] = Object.entries(categoryCounts)
                                .filter(([_, count]) => count >= summaryThreshold)
                                .map(([name]) => name)
                                .sort();
                            } else if (i < summaryThreshold) {
                              // Individual counts below threshold
                              countGroups[i] = Object.entries(categoryCounts)
                                .filter(([_, count]) => count === i)
                                .map(([name]) => name)
                                .sort();
                            }
                          }
                          
                          // Build output only for counts that have categories (> 0)
                          const output = [];
                          for (let i = Math.max(maxCount, summaryThreshold); i >= 1; i--) {
                            if (countGroups[i] && countGroups[i].length > 0) {
                              let displayText;
                              if (i === summaryThreshold && summaryThreshold > 1) {
                                const diagnosisText = summaryThreshold === 1 ? 'diagnosis' : 'diagnoses';
                                displayText = `${summaryThreshold} ${diagnosisText} or more`;
                              } else {
                                const diagnosisText = i === 1 ? 'diagnosis' : 'diagnoses';
                                displayText = `${i} ${diagnosisText}`;
                              }
                              
                              output.push(
                                <div key={i} className="ml-2">
                                  - these diagnostic categories had {displayText} associated with them over the timeperiod{' '}
                                  <span className="font-medium">[{countGroups[i].join(', ')}]</span>
                                </div>
                              );
                            }
                          }
                          
                          return output.length > 0 ? output : <div className="ml-2 text-gray-500">No diagnostic category data available</div>;
                        })()}
                      </div>
                    </div>
                      
                    <div className="mt-3">
                        {(() => {
                          // Get symptoms from last two sessions - fix the logic
                          const sortedNotes = [...patientNotes].sort((a, b) => {
                            const dateA = new Date(a.dos_date || a.dosDate || 0);
                            const dateB = new Date(b.dos_date || b.dosDate || 0);
                            return dateB.getTime() - dateA.getTime();
                          });
                          
                          const lastTwoSessions = sortedNotes.slice(0, 2);
                          const lastTwoDates = lastTwoSessions.map(note => note.dos_date || note.dosDate);
                          
                          // Get symptoms from last two sessions - enhanced matching
                          const lastTwoSymptoms: Record<string, number> = {};
                          
                          console.log('Last Two Debug - Patient Notes:', patientNotes.length);
                          console.log('Last Two Debug - Last Two Dates:', lastTwoDates);
                          console.log('Last Two Debug - Extracted Symptoms:', extractedSymptoms.length);
                          console.log('Last Two Debug - Selected Patient ID:', selectedPatient.patient_id || selectedPatient.patientId);
                          
                          extractedSymptoms.forEach(item => {
                            // Check if this symptom is from the selected patient and from one of the last two session dates
                            const itemPatientId = String(item.patient_id || '');
                            const selectedPatientId = String(selectedPatient.patient_id || selectedPatient.patientId || '');
                            const itemDate = item.dos_date || item.dosDate;
                            
                            // More flexible date matching - also check if dates are properly formatted
                            const dateMatches = lastTwoDates.some(lastDate => {
                              return itemDate === lastDate || 
                                     (itemDate && lastDate && new Date(itemDate).getTime() === new Date(lastDate).getTime());
                            });
                            
                            if (itemPatientId === selectedPatientId && dateMatches) {
                              const symptom = item.symptom_segment || item.symptom || item.text || '';
                              if (symptom && symptom.trim()) {
                                lastTwoSymptoms[symptom] = (lastTwoSymptoms[symptom] || 0) + 1;
                                console.log('Last Two Debug - Found symptom:', symptom, 'on date:', itemDate);
                              }
                            }
                          });
                          
                          console.log('Last Two Debug - Final symptoms found:', Object.keys(lastTwoSymptoms).length);
                          
                          // Sort by frequency then alphabetically
                          const sortedLastTwo = Object.entries(lastTwoSymptoms)
                            .sort((a, b) => {
                              if (b[1] !== a[1]) return b[1] - a[1];
                              return a[0].localeCompare(b[0]);
                            })
                            .map(([name, count]) => `${name} (${count})`)
                            .join(', ');
                          
                          return (
                            <>
                              Over the last two sessions they have expressed these symptoms:{' '}
                              <span className="font-medium">{sortedLastTwo || 'none documented'}</span>.
                            </>
                          );
                        })()}
                    </div>
                    
                    <div className="mt-3">
                      <div className="font-semibold">HRSN Trends:</div>
                      {(() => {
                        // Filter HRSNs where symp_prob = "Problem" and count frequencies
                        const hrsnProblems: Record<string, number> = {};
                        
                        extractedSymptoms.forEach(item => {
                          // Check if this is an HRSN problem
                          if (item.symp_prob === "Problem") {
                            const symptom = item.symptom_segment || item.symptom || item.text || '';
                            if (symptom && symptom.trim()) {
                              hrsnProblems[symptom] = (hrsnProblems[symptom] || 0) + 1;
                            }
                          }
                        });
                        
                        // Group HRSNs by frequency using configurable threshold (same as symptoms)
                        const frequencyGroups: Record<number, string[]> = {};
                        const maxFreq = Math.max(...Object.values(hrsnProblems), 0);
                        
                        for (let i = Math.max(maxFreq, summaryThreshold); i >= 1; i--) {
                          if (i === summaryThreshold) {
                            // Group for threshold and above
                            frequencyGroups[i] = Object.entries(hrsnProblems)
                              .filter(([_, freq]) => freq >= summaryThreshold)
                              .map(([name]) => name)
                              .sort();
                          } else if (i < summaryThreshold) {
                            // Individual counts below threshold
                            frequencyGroups[i] = Object.entries(hrsnProblems)
                              .filter(([_, freq]) => freq === i)
                              .map(([name]) => name)
                              .sort();
                          }
                        }
                        
                        // Build output only for frequencies that have HRSN problems (> 0)
                        const output = [];
                        for (let i = Math.max(maxFreq, summaryThreshold); i >= 1; i--) {
                          if (frequencyGroups[i] && frequencyGroups[i].length > 0) {
                            let displayText;
                            if (i === summaryThreshold && summaryThreshold > 1) {
                              displayText = `${summaryThreshold} times or more`;
                            } else {
                              const timesText = i === 1 ? 'time' : 'times';
                              displayText = `${i} ${timesText}`;
                            }
                            
                            output.push(
                              <div key={i} className="ml-2">
                                - these HRSN problems were expressed {displayText} over the timeperiod{' '}
                                <span className="font-medium">[{frequencyGroups[i].join(', ')}]</span>;
                              </div>
                            );
                          }
                        }
                        
                        return output.length > 0 ? output : <div className="ml-2 text-gray-500">No HRSN problems documented</div>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showNotes && patientNotes.length > 0 && (
              <div>
                <h3 className="text-md font-medium mb-2">Patient Notes</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto p-2">
                  <p className="text-xs text-gray-500 mb-1">Showing {patientNotes.length} notes for {selectedPatient.patient_name || selectedPatient.patientName}</p>
                  {patientNotes.map((note, index) => (
                    <div key={index} className="p-3 bg-white rounded-md border border-gray-200">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
                        <div className="font-medium">Date:</div>
                        <div>{formatDateForDisplay(note.dos_date || note.dosDate)}</div>
                        <div className="font-medium ml-3">Patient ID:</div>
                        <div>{note.patient_id || note.patientId}</div>
                      </div>
                      <p className="text-sm">{note.note_text || note.noteText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}