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
// Alias the BarChart from lucide-react to avoid naming conflicts with recharts
import { BarChart as BarChartIcon } from "lucide-react";
import HeatMapWrapper from '@/components/HeatMapWrapper';
import { Link } from "wouter";
// Recharts components
import { 
  PieChart, Pie, 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Cell, ResponsiveContainer 
} from 'recharts';
import PopulationSearch from "@/components/PopulationSearch";
import FileProcessingStatus from "@/components/FileProcessingStatus";
import { calculateBubbleSize } from '@/lib/bubble-size-utils';

// Last updated: May 9, 2025 - 5:45 AM
// Controls route: /home

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
    else {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear() % 100; // Just the last two digits
      return `${month}/${day}/${year}`;
    }
  } catch (error) {
    console.error(`Error formatting date: ${dateStr}`, error);
    return dateStr; // Return original if parsing fails
  }
};

// Generate dummy data for demo chart examples
const generateDummySymptomData = () => {
  const symptoms = [
    "Depression", "Anxiety", "Insomnia", "Fatigue", 
    "Pain", "Concentration Problems", "Panic Attacks"
  ];
  
  const dates = ["1/15/23", "2/1/23", "2/15/23", "3/1/23", "3/15/23", "4/1/23"];
  
  const result = {
    data: [] as any[],
    keys: symptoms,
    dates: dates
  };
  
  // Generate random data
  symptoms.forEach((symptom, i) => {
    dates.forEach((date, j) => {
      // Generate some random values, with some empty cells
      if (Math.random() > 0.6) {
        const value = Math.floor(Math.random() * 5) + 1;
        result.data.push({
          id: `${symptom}-${date}`,
          label: symptom,
          date: date,
          x: j,
          y: i,
          value: value
        });
      }
    });
  });
  
  return result;
};

// Generate dummy data for HRSN chart
const generateDummyHrsnData = () => {
  return [
    { name: "Housing", value: 35 },
    { name: "Food", value: 27 },
    { name: "Transportation", value: 18 },
    { name: "Utilities", value: 12 },
    { name: "Safety", value: 5 },
    { name: "Financial", value: 3 }
  ];
};

// Monthly metrics data for line chart
const generateMonthlyMetricsData = () => {
  return [
    { name: "Jan", patients: 65, notes: 182, hrsn: 23 },
    { name: "Feb", patients: 78, notes: 205, hrsn: 28 },
    { name: "Mar", patients: 92, notes: 248, hrsn: 35 },
    { name: "Apr", patients: 105, notes: 275, hrsn: 42 },
    { name: "May", patients: 120, notes: 310, hrsn: 48 }
  ];
};

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  // Example visualization data for demo charts
  const [dummySymptomData] = useState(generateDummySymptomData());
  const [hrsnData] = useState(generateDummyHrsnData());
  const [monthlyData] = useState(generateMonthlyMetricsData());
  
  // Search states
  const [patientSearchType, setPatientSearchType] = useState("individual");
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-4">
        {/* Welcome Message Below Navigation */}
        {user && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">Welcome {user.username}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient search card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-blue-100 p-4 text-blue-800 font-semibold">
                  Search Options
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Select Search Type</h3>
                  
                  <RadioGroup 
                    value={patientSearchType} 
                    onValueChange={setPatientSearchType}
                    className="flex flex-col space-y-2 mb-6"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label className="ml-2" htmlFor="individual">Individual Patient Search</Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="population" id="population" />
                      <Label className="ml-2" htmlFor="population">Population Health Analysis</Label>
                    </div>
                  </RadioGroup>
                  
                  {patientSearchType === "individual" ? (
                    <div className="space-y-4">
                      <h4 className="font-medium">Search for an individual patient by name or ID</h4>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="Enter patient name or ID"
                          className="flex-1"
                        />
                        <Button>
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </Button>
                      </div>
                      <Link href="/nivo-scatter-view-themed/1">
                        <Button variant="outline" className="w-full mt-2">
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          View Sample Patient Analysis
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <PopulationSearch />
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Sample visualization card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-blue-100 p-4 text-blue-800 font-semibold">
                  Visualization Example
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Symptom Tracking Over Time
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Example of patient symptom tracking visualization
                  </p>
                  
                  <div className="h-64 mb-4">
                    <BubbleChart 
                      title="Symptom Frequency Over Time" 
                      bubbleData={dummySymptomData} 
                      colorScheme="blues"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Link href="/nivo-scatter-view-themed/1">
                      <Button variant="outline" size="sm">
                        <BarChartIcon className="h-4 w-4 mr-2" />
                        View Live Visualizations
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick access card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
                
                <div className="space-y-3">
                  <Link href="/upload">
                    <Button variant="outline" className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Data
                    </Button>
                  </Link>
                  
                  <Link href="/simplified-auto-pivot/1">
                    <Button variant="outline" className="w-full justify-start">
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Pivot Tables
                    </Button>
                  </Link>
                  
                  <Link href="/enhanced-heatmap-v2/1">
                    <Button variant="outline" className="w-full justify-start">
                      <HeatMapWrapper />
                      Heatmap View
                    </Button>
                  </Link>
                  
                  <Link href="/nivo-scatter-view-themed/1">
                    <Button variant="outline" className="w-full justify-start">
                      <Circle className="h-4 w-4 mr-2" />
                      Bubble Chart View
                    </Button>
                  </Link>
                  
                  <Link href="/receipts">
                    <Button variant="outline" className="w-full justify-start">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing & Receipts
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Monthly metrics card with line chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Activity</h3>
                
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{
                        top: 5,
                        right: 5,
                        left: 0,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="patients" stroke="#3B82F6" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="notes" stroke="#10B981" />
                      <Line type="monotone" dataKey="hrsn" stroke="#F59E0B" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* HRSN breakdown card with pie chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">HRSN Breakdown</h3>
                
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={hrsnData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {hrsnData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Footer with processing status */}
        <div className="mt-6 bg-white shadow-sm p-4 rounded-lg">
          <FileProcessingStatus />
        </div>
      </div>
    </div>
  );
}