import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Interface for patient visualization parameters
interface PatientVisualizationParams {
  patientId?: string;
}

// Define data types for visualization
const DATA_TYPES = [
  { id: 'symptom', name: 'Symptoms', description: 'Patient symptoms extracted from clinical notes.' },
  { id: 'diagnosis', name: 'Diagnoses', description: 'Diagnosed conditions identified in clinical documentation.' },
  { id: 'category', name: 'Diagnostic Categories', description: 'Broader diagnostic classifications of conditions.' },
  { id: 'hrsn', name: 'HRSN Indicators', description: 'Health-related social needs affecting patient health.' }
];

// Define API endpoint mappings (for types that have different endpoint names)
const API_ENDPOINTS = {
  symptom: 'symptom',
  diagnosis: 'diagnosis',
  category: 'diagnostic-category', // This is the key fix - the endpoint is different from the ID
  hrsn: 'hrsn'
};

// Interface for API response data
interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Define multiple color themes for different needs and preferences
const COLOR_THEMES = {
  // Original Iridis (purple-blue) theme
  iridis: {
    name: "Iridis (Purple-Blue)",
    colors: [
      '#EDF8FB', // Lowest - Light blue/purple
      '#B3CDE3', // Low - Blue/purple
      '#8C96C6', // Medium - Purple
      '#8856A7', // High - Dark purple
      '#994C99'  // Highest - Deep purple
    ]
  },
  
  // Viridis color scheme - colorblind friendly
  viridis: {
    name: "Viridis (Colorblind-friendly)",
    colors: [
      '#FDE725', // Lowest - Yellow
      '#5DC963', // Low - Green
      '#21908C', // Medium - Teal
      '#3B528B', // High - Blue
      '#440154'  // Highest - Dark purple
    ]
  },
  
  // High contrast theme
  highContrast: {
    name: "High Contrast",
    colors: [
      '#FFFFFF', // Lowest - White
      '#C0C0C0', // Low - Light gray
      '#808080', // Medium - Medium gray
      '#404040', // High - Dark gray
      '#000000'  // Highest - Black
    ]
  },
  
  // Red-Blue (diverging) - also colorblind friendly
  redBlue: {
    name: "Red-Blue",
    colors: [
      '#053061', // Lowest - Dark blue
      '#2166AC', // Low - Blue
      '#F7F7F7', // Medium - White
      '#B2182B', // High - Red
      '#67001F'  // Highest - Dark red
    ]
  },
};

// Theme context to share theme state across components
interface ThemeContextType {
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  themeColors: typeof COLOR_THEMES.iridis.colors;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('iridis');
  const themeColors = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES].colors;
  
  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme selector component
const ThemeSelector = () => {
  const { currentTheme, setCurrentTheme } = useTheme();
  
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm">Color Theme:</span>
      <Select
        value={currentTheme}
        onValueChange={setCurrentTheme}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a theme" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(COLOR_THEMES).map(([key, theme]) => (
            <SelectItem key={key} value={key}>{theme.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Function to determine color based on normalized value
function getThemeColor(normalizedValue: number, colors: string[]): string {
  if (normalizedValue >= 0.85) return colors[4]; // Highest
  if (normalizedValue >= 0.65) return colors[3]; // High
  if (normalizedValue >= 0.45) return colors[2]; // Medium
  if (normalizedValue >= 0.25) return colors[1]; // Low
  return colors[0]; // Lowest
}

// Get intensity label based on normalized value
function getIntensityLabel(normalizedValue: number): string {
  if (normalizedValue >= 0.85) return 'Highest';
  if (normalizedValue >= 0.65) return 'High';
  if (normalizedValue >= 0.45) return 'Medium';
  if (normalizedValue >= 0.25) return 'Low';
  return 'Lowest';
}

// Simple bubble chart for visualization
const SimpleBubbles = ({ 
  data, 
  dataType,
  maxValue
}: { 
  data: {row: string, column: string, value: number}[];
  dataType: string;
  maxValue: number;
}) => {
  const { themeColors } = useTheme();
  const [hoveredBubble, setHoveredBubble] = useState<{row: string, column: string, value: number} | null>(null);
  
  if (!data || !data.length) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }
  
  // Group data by row for easier rendering
  const rowGroups: Record<string, {column: string, value: number}[]> = {};
  
  data.forEach(point => {
    if (!rowGroups[point.row]) {
      rowGroups[point.row] = [];
    }
    rowGroups[point.row].push({column: point.column, value: point.value});
  });
  
  // Calculate intensity for color
  const getIntensity = (value: number) => value / maxValue;
  
  // Sort rows by sum of values (descending)
  const sortedRows = Object.keys(rowGroups).sort((a, b) => {
    const sumA = rowGroups[a].reduce((sum, item) => sum + item.value, 0);
    const sumB = rowGroups[b].reduce((sum, item) => sum + item.value, 0);
    return sumB - sumA;
  });
  
  // Limit to top 10 rows for compact view
  const displayRows = sortedRows.slice(0, 15);
  
  // Color legend
  const renderColorLegend = () => {
    return (
      <div className="flex items-center gap-2 mt-1 mb-2 text-xs">
        {themeColors.map((color, index) => (
          <div key={index} className="flex items-center">
            <div style={{ 
              width: 8 + (index * 1.5), 
              height: 8 + (index * 1.5), 
              backgroundColor: color, 
              borderRadius: '50%',
              border: color === '#FFFFFF' ? '1px solid #ccc' : 'none'
            }} />
            <span className="ml-1">{['Lowest', 'Low', 'Medium', 'High', 'Highest'][index]}</span>
          </div>
        ))}
      </div>
    );
  };
  
  // Tooltip
  const renderTooltip = () => {
    if (!hoveredBubble) return null;
    
    const { row, column, value } = hoveredBubble;
    const intensity = getIntensity(value);
    const color = getThemeColor(intensity, themeColors);
    
    return (
      <div className="absolute z-50 p-2 bg-white border border-gray-300 rounded shadow-md text-xs">
        <div className="font-bold mb-1">{row}</div>
        <div>Date: <span className="font-semibold">{column}</span></div>
        <div>Frequency: <span className="font-semibold">{value}</span></div>
        <div>
          Intensity: <span className="font-semibold" style={{ color }}>{getIntensityLabel(intensity)}</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="relative">
      {renderColorLegend()}
      <div className="overflow-auto max-h-[350px] border border-gray-200 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-2 border-b border-r sticky left-0 bg-gray-50 z-10">
                {dataType === 'symptom' ? 'Symptom' : 
                 dataType === 'diagnosis' ? 'Diagnosis' : 
                 dataType === 'category' ? 'Category' : 
                 'HRSN Indicator'}
              </th>
              <th className="text-left p-2 border-b">Bubbles</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={row} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-2 border-r font-medium sticky left-0 z-10" style={{ backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb' }}>
                  {row}
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1 min-h-[30px]">
                    {rowGroups[row].map((item, i) => {
                      const intensity = getIntensity(item.value);
                      const size = 10 + (intensity * 25); // Size between 10px and 35px
                      const color = getThemeColor(intensity, themeColors);
                      
                      return (
                        <div 
                          key={`${row}-${item.column}`}
                          className="relative cursor-pointer"
                          style={{ 
                            width: `${size}px`, 
                            height: `${size}px`, 
                            backgroundColor: color,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: color === '#FFFFFF' ? '1px solid #ccc' : 'none'
                          }}
                          onMouseEnter={() => setHoveredBubble({row, column: item.column, value: item.value})}
                          onMouseLeave={() => setHoveredBubble(null)}
                          title={`${row}: ${item.value} on ${item.column}`}
                        >
                          {item.value > maxValue * 0.5 && (
                            <span style={{ 
                              fontSize: `${Math.min(10, size/2)}px`,
                              color: '#fff',
                              textShadow: '0px 0px 2px rgba(0,0,0,0.7)'
                            }}>
                              {item.value}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hoveredBubble && renderTooltip()}
    </div>
  );
};

// BubbleSection component for displaying a specific data type
const BubbleSection = ({ 
  dataType, 
  patientId,
}: { 
  dataType: string; 
  patientId: string;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Fetch data from API
  const apiEndpoint = API_ENDPOINTS[dataType as keyof typeof API_ENDPOINTS] || dataType;
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${apiEndpoint}/${patientId}`],
    retry: 2,
    retryDelay: 1000,
    staleTime: 60000
  });
  
  // Process data for visualization
  const bubbleData = React.useMemo(() => {
    if (!data) return [];
    
    const points: {row: string, column: string, value: number}[] = [];
    
    // Process each row and column combination
    data.rows.forEach((row) => {
      data.columns.forEach((column) => {
        const value = data.data[row]?.[column] || 0;
        if (value > 0) {
          points.push({
            row,
            column,
            value
          });
        }
      });
    });
    
    console.log(`Generated ${points.length} points for ${dataType}`);
    return points;
  }, [data, dataType]);
  
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium">{displayName}</h3>
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            disabled={isLoading || !data}
          >
            Expand
          </Button>
        </div>
      </div>
      
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500 text-xs">
            Error loading data
          </div>
        ) : !data || bubbleData.length === 0 ? (
          <div className="text-center py-4 text-amber-500 text-xs">
            No data available for this view
          </div>
        ) : (
          <SimpleBubbles 
            data={bubbleData} 
            dataType={dataType}
            maxValue={data.maxValue}
          />
        )}
      </div>
      
      {/* Expanded view dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{displayName} - Full View</DialogTitle>
          </DialogHeader>
          
          {data && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-2 bg-slate-50 border-b mb-4">
                <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                <p className="text-sm text-gray-500">
                  Showing {data.rows.length} items with bubble size representing frequency.
                </p>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-end mb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
                
                <div className="flex-1 overflow-auto">
                  <SimpleBubbles 
                    data={bubbleData} 
                    dataType={dataType}
                    maxValue={data.maxValue}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function to get a patient name based on ID
const getPatientName = (patientId: number): string => {
  return `Bob Test${patientId}`;
};

// Main component - displays all four bubble charts in a grid layout
export default function SimpleBubbleView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/simple-bubble-view/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <ThemeProvider>
      <div className="container mx-auto py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="text-lg font-medium">
                Patient Name: {getPatientName(parseInt(patientToDisplay))}
                <span className="ml-4 text-sm text-gray-600">ID#: P{patientToDisplay.padStart(4, '0')}</span>
              </div>
            </CardTitle>
            <CardDescription>
              Quick overview of all patient data through bubble visualizations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Theme selector */}
            <ThemeSelector />
            
            <div className="flex justify-end mb-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation(`/direct-grid-view/${patientToDisplay}`)}
                >
                  View Pivot Tables
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/nivo-heatmap-view/${patientToDisplay}`)}
                >
                  View Heatmaps
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/nivo-scatter-view/${patientToDisplay}`)}
                >
                  View Bubble Charts
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Refresh Data
                </Button>
              </div>
            </div>
            
            {/* Display all four bubble charts in a 2x2 grid - always visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DATA_TYPES.map((type) => (
                <BubbleSection 
                  key={type.id} 
                  dataType={type.id} 
                  patientId={patientToDisplay}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
}