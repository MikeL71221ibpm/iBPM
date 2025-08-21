import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ColorRing } from 'react-loader-spinner';

// Define types for chart data
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
}

export default function PopulationHealthMay7Restored({ 
  data, 
  isLoading = false 
}: PopulationHealthChartsProps) {
  const { toast } = useToast();
  // Color theme state
  const [colorTheme, setColorTheme] = useState<string>("blues");
  const [colorSaturation, setColorSaturation] = useState<number>(65);
  const [colorLightness, setColorLightness] = useState<number>(55);
  const [transparency, setTransparency] = useState<number>(100);
  
  // Chart state
  const [diagnosesByCategoryData, setDiagnosesByCategoryData] = useState<ChartDataItem[]>([]);
  const [symptomsBySystemData, setSymptomsBySystemData] = useState<ChartDataItem[]>([]);
  const [patientsByAgeData, setPatientsByAgeData] = useState<ChartDataItem[]>([]);
  const [patientsByGenderData, setPatientsByGenderData] = useState<ChartDataItem[]>([]);
  const [patientsByRaceData, setPatientsByRaceData] = useState<ChartDataItem[]>([]);

  // Compact mode for the May 7 charts (smaller height, minimal padding)
  const [compactMode, setCompactMode] = useState<boolean>(true);

  // Color theme options
  const colorThemeOptions: ColorThemePreset[] = [
    { name: "blues", saturation: 65, lightness: 55 },
    { name: "greens", saturation: 65, lightness: 55 },
    { name: "purples", saturation: 65, lightness: 55 },
    { name: "oranges", saturation: 65, lightness: 55 },
    { name: "reds", saturation: 65, lightness: 55 },
    { name: "greys", saturation: 15, lightness: 55 },
    { name: "custom-blue-green", isCustomPalette: true, colors: ['#003f5c', '#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'] },
    { name: "custom-dark", isCustomPalette: true, colors: ['#1a237e', '#283593', '#303f9f', '#3949ab', '#3f51b5', '#5c6bc0', '#7986cb', '#9fa8da'] },
    { name: "custom-pastel", isCustomPalette: true, colors: ['#ffcdd2', '#f8bbd0', '#e1bee7', '#d1c4e9', '#c5cae9', '#bbdefb', '#b3e5fc', '#b2ebf2'] },
  ];

  // Convert color theme to actual colors for Nivo charts
  const getColorSchemeForNivo = useCallback((themeName: string) => {
    const theme = colorThemeOptions.find(t => t.name === themeName);
    
    if (theme?.isCustomPalette && theme.colors) {
      return theme.colors;
    }
    
    const baseColor = themeName.replace('custom-', '');
    return `${baseColor}${colorSaturation}${colorLightness}`;
  }, [colorSaturation, colorLightness, colorThemeOptions]);

  // Helper to format percentages
  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(1)}%`;
  }, []);

  // Helper to add percentage to bar chart labels
  const getBarLabel = useCallback((d: any) => {
    return d.data.percentage ? `${d.data.percentage.toFixed(1)}%` : '';
  }, []);

  // Process data for the visualizations
  useEffect(() => {
    if (!data || !data.patients || data.patients.length === 0) {
      // Use dummy data when real data isn't available
      const dummyDiagnosesData = [
        { id: "Depression", value: 145, percentage: 24.5 },
        { id: "Anxiety", value: 98, percentage: 16.6 },
        { id: "PTSD", value: 67, percentage: 11.3 },
        { id: "Bipolar", value: 53, percentage: 9.0 },
        { id: "Schizophrenia", value: 41, percentage: 6.9 }
      ];
      
      const dummyPatientsByAge = [
        { id: "18-24", value: 47, percentage: 10.2 },
        { id: "25-34", value: 122, percentage: 26.5 },
        { id: "35-44", value: 105, percentage: 22.8 },
        { id: "45-54", value: 89, percentage: 19.3 },
        { id: "55-64", value: 61, percentage: 13.3 },
        { id: "65+", value: 36, percentage: 7.8 }
      ];
      
      const dummyPatientsByGender = [
        { id: "Female", value: 264, percentage: 57.4 },
        { id: "Male", value: 192, percentage: 41.7 },
        { id: "Other", value: 4, percentage: 0.9 }
      ];
      
      const dummyPatientsByRace = [
        { id: "White", value: 198, percentage: 43.0 },
        { id: "Black", value: 93, percentage: 20.2 },
        { id: "Hispanic", value: 87, percentage: 18.9 },
        { id: "Asian", value: 46, percentage: 10.0 },
        { id: "Other", value: 36, percentage: 7.8 }
      ];

      setDiagnosesByCategoryData(dummyDiagnosesData);
      setPatientsByAgeData(dummyPatientsByAge);
      setPatientsByGenderData(dummyPatientsByGender);
      setPatientsByRaceData(dummyPatientsByRace);
      return;
    }

    try {
      // Process patients by age
      const ageGroups: {[key: string]: number} = {};
      data.patients.forEach((patient: any) => {
        const ageRange = patient.age_range || 'Unknown';
        ageGroups[ageRange] = (ageGroups[ageRange] || 0) + 1;
      });
      
      const ageData = Object.entries(ageGroups).map(([ageRange, count]) => {
        return {
          id: ageRange,
          value: count,
          percentage: (count / data.patients.length) * 100
        };
      }).sort((a, b) => {
        // Sort age ranges correctly
        const ageOrder: {[key: string]: number} = {
          "0-17": 1,
          "18-24": 2,
          "25-34": 3,
          "35-44": 4,
          "45-54": 5, 
          "55-64": 6,
          "65+": 7,
          "Unknown": 8
        };
        return (ageOrder[a.id] || 99) - (ageOrder[b.id] || 99);
      });
      
      // Process patients by gender
      const genderGroups: {[key: string]: number} = {};
      data.patients.forEach((patient: any) => {
        const gender = patient.gender || 'Unknown';
        genderGroups[gender] = (genderGroups[gender] || 0) + 1;
      });
      
      const genderData = Object.entries(genderGroups).map(([gender, count]) => {
        return {
          id: gender,
          value: count,
          percentage: (count / data.patients.length) * 100
        };
      });
      
      // Process patients by race
      const raceGroups: {[key: string]: number} = {};
      data.patients.forEach((patient: any) => {
        const race = patient.race || 'Unknown';
        raceGroups[race] = (raceGroups[race] || 0) + 1;
      });
      
      const raceData = Object.entries(raceGroups).map(([race, count]) => {
        return {
          id: race,
          value: count,
          percentage: (count / data.patients.length) * 100
        };
      });
      
      // Process diagnoses by category
      // For our mock data, we'll create some placeholder data since we don't have real diagnoses
      const mockDiagnosesData = [
        { id: "Depression", value: Math.round(data.patients.length * 0.24), percentage: 24.0 },
        { id: "Anxiety", value: Math.round(data.patients.length * 0.18), percentage: 18.0 },
        { id: "PTSD", value: Math.round(data.patients.length * 0.12), percentage: 12.0 },
        { id: "Bipolar", value: Math.round(data.patients.length * 0.09), percentage: 9.0 },
        { id: "Schizophrenia", value: Math.round(data.patients.length * 0.07), percentage: 7.0 }
      ];
      
      // Update state with processed data
      setPatientsByAgeData(ageData);
      setPatientsByGenderData(genderData);
      setPatientsByRaceData(raceData);
      setDiagnosesByCategoryData(mockDiagnosesData);
      
      console.log("Processed population health data:", {
        ageData,
        genderData,
        raceData,
        mockDiagnosesData
      });
      
    } catch (error) {
      console.error("Error processing data for visualizations:", error);
      toast({
        title: "Data Processing Error",
        description: "Failed to process data for visualizations.",
        variant: "destructive",
      });
    }
  }, [data, toast]);
  
  // Handle color theme change
  const handleColorThemeChange = (newTheme: string) => {
    const theme = colorThemeOptions.find(t => t.name === newTheme);
    if (theme) {
      setColorTheme(newTheme);
      if (theme.saturation !== undefined) setColorSaturation(theme.saturation);
      if (theme.lightness !== undefined) setColorLightness(theme.lightness);
    }
  };

  // Bar chart height calculation - compact mode = 75px height
  const getChartHeight = () => compactMode ? 75 : 300;
  
  // Get chart margin based on compact mode
  const getChartMargin = () => {
    return compactMode 
      ? { top: 5, right: 10, bottom: 15, left: 70 }  // Minimal margins in compact mode
      : { top: 20, right: 60, bottom: 40, left: 80 }; // Regular margins
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Population Health Charts (May 7th Version)</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCompactMode(!compactMode)}
            >
              {compactMode ? "Full Size" : "Compact Mode"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-60">
              <ColorRing
                visible={true}
                height="80"
                width="80"
                ariaLabel="population-loading-indicator"
                colors={['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patients by Age Group - Bar Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-1">Patients by Age Group</h3>
                <div style={{ height: getChartHeight() }}>
                  <ResponsiveBar
                    data={patientsByAgeData}
                    keys={['value']}
                    indexBy="id"
                    margin={getChartMargin()}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    colors={{ scheme: getColorSchemeForNivo(colorTheme) }}
                    colorBy="indexValue"
                    borderRadius={4}
                    borderWidth={1}
                    borderColor={{
                      from: 'color',
                      modifiers: [['darker', 0.7]]
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      format: (value) => compactMode ? String(value) : `${value} patients`
                    }}
                    labelTextColor={{
                      from: 'color',
                      modifiers: [['darker', 2]]
                    }}
                    label={d => compactMode ? '' : getBarLabel(d)}
                    animate={true}
                    motionStiffness={90}
                    motionDamping={15}
                    theme={{
                      axis: {
                        ticks: {
                          text: {
                            fontSize: compactMode ? 9 : 11,
                            fontWeight: compactMode ? 700 : 500,
                            fill: "#333"
                          }
                        }
                      },
                      grid: {
                        line: {
                          stroke: "#e5e7eb", 
                          strokeWidth: 1
                        }
                      },
                      labels: {
                        text: {
                          fontSize: compactMode ? 8 : 11,
                          fontWeight: compactMode ? 700 : 500,
                          fill: "#333" 
                        }
                      }
                    }}
                    tooltip={({ id, value, color, data }) => (
                      <div
                        style={{
                          padding: '9px 12px',
                          background: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{id}</div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              background: color,
                              marginRight: '8px',
                              borderRadius: '2px'
                            }}
                          />
                          <div>
                            <strong>{value}</strong> patients
                            {data.percentage && ` (${data.percentage.toFixed(1)}%)`}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
              
              {/* Patients by Gender - Pie Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-1">Patients by Gender</h3>
                <div style={{ height: getChartHeight() }}>
                  <ResponsivePie
                    data={patientsByGenderData}
                    margin={getChartMargin()}
                    innerRadius={0.5}
                    padAngle={0.7}
                    cornerRadius={3}
                    colors={{ scheme: getColorSchemeForNivo(colorTheme) }}
                    borderWidth={1}
                    borderColor={{
                      from: 'color',
                      modifiers: [['darker', 0.2]]
                    }}
                    radialLabelsSkipAngle={10}
                    radialLabelsTextXOffset={6}
                    radialLabelsTextColor="#333333"
                    radialLabelsLinkOffset={0}
                    radialLabelsLinkDiagonalLength={16}
                    radialLabelsLinkHorizontalLength={24}
                    radialLabelsLinkStrokeWidth={1}
                    radialLabelsLinkColor={{ from: 'color' }}
                    slicesLabelsSkipAngle={10}
                    slicesLabelsTextColor="#333333"
                    animate={true}
                    motionStiffness={90}
                    motionDamping={15}
                    defs={[
                      {
                        id: 'dots',
                        type: 'patternDots',
                        background: 'inherit',
                        color: 'rgba(255, 255, 255, 0.3)',
                        size: 4,
                        padding: 1,
                        stagger: true
                      },
                      {
                        id: 'lines',
                        type: 'patternLines',
                        background: 'inherit',
                        color: 'rgba(255, 255, 255, 0.3)',
                        rotation: -45,
                        lineWidth: 6,
                        spacing: 10
                      }
                    ]}
                    legends={compactMode ? [] : [
                      {
                        anchor: 'right',
                        direction: 'column',
                        translateX: 50,
                        translateY: 0,
                        itemWidth: 100,
                        itemHeight: 20,
                        itemTextColor: '#333',
                        symbolSize: 12,
                        symbolShape: 'circle',
                        effects: [
                          {
                            on: 'hover',
                            style: {
                              itemTextColor: '#000'
                            }
                          }
                        ]
                      }
                    ]}
                    tooltip={({ id, value, color, data }) => (
                      <div
                        style={{
                          padding: '9px 12px',
                          background: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{id}</div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              background: color,
                              marginRight: '8px',
                              borderRadius: '2px'
                            }}
                          />
                          <div>
                            <strong>{value}</strong> patients
                            {data.percentage && ` (${data.percentage.toFixed(1)}%)`}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
              
              {/* Patients by Race/Ethnicity - Bar Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-1">Patients by Race/Ethnicity</h3>
                <div style={{ height: getChartHeight() }}>
                  <ResponsiveBar
                    data={patientsByRaceData}
                    keys={['value']}
                    indexBy="id"
                    margin={getChartMargin()}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    colors={{ scheme: getColorSchemeForNivo(colorTheme) }}
                    colorBy="indexValue"
                    borderRadius={4}
                    borderWidth={1}
                    borderColor={{
                      from: 'color',
                      modifiers: [['darker', 0.7]]
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      format: (value) => compactMode ? String(value) : `${value} patients`
                    }}
                    labelTextColor={{
                      from: 'color',
                      modifiers: [['darker', 2]]
                    }}
                    label={d => compactMode ? '' : getBarLabel(d)}
                    animate={true}
                    motionStiffness={90}
                    motionDamping={15}
                    theme={{
                      axis: {
                        ticks: {
                          text: {
                            fontSize: compactMode ? 9 : 11,
                            fontWeight: compactMode ? 700 : 500,
                            fill: "#333"
                          }
                        }
                      },
                      grid: {
                        line: {
                          stroke: "#e5e7eb", 
                          strokeWidth: 1
                        }
                      },
                      labels: {
                        text: {
                          fontSize: compactMode ? 8 : 11,
                          fontWeight: compactMode ? 700 : 500,
                          fill: "#333" 
                        }
                      }
                    }}
                    tooltip={({ id, value, color, data }) => (
                      <div
                        style={{
                          padding: '9px 12px',
                          background: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{id}</div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              background: color,
                              marginRight: '8px',
                              borderRadius: '2px'
                            }}
                          />
                          <div>
                            <strong>{value}</strong> patients
                            {data.percentage && ` (${data.percentage.toFixed(1)}%)`}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
              
              {/* Top Diagnoses by Category - Bar Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-1">Top Diagnoses by Category</h3>
                <div style={{ height: getChartHeight() }}>
                  <ResponsiveBar
                    data={diagnosesByCategoryData}
                    keys={['value']}
                    indexBy="id"
                    margin={getChartMargin()}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    colors={{ scheme: getColorSchemeForNivo(colorTheme) }}
                    colorBy="indexValue"
                    borderRadius={4}
                    borderWidth={1}
                    borderColor={{
                      from: 'color',
                      modifiers: [['darker', 0.7]]
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      format: (value) => compactMode ? String(value) : `${value} patients`
                    }}
                    labelTextColor={{
                      from: 'color',
                      modifiers: [['darker', 2]]
                    }}
                    label={d => compactMode ? '' : getBarLabel(d)}
                    animate={true}
                    motionStiffness={90}
                    motionDamping={15}
                    theme={{
                      axis: {
                        ticks: {
                          text: {
                            fontSize: compactMode ? 9 : 11,
                            fontWeight: compactMode ? 700 : 500,
                            fill: "#333"
                          }
                        }
                      },
                      grid: {
                        line: {
                          stroke: "#e5e7eb", 
                          strokeWidth: 1
                        }
                      },
                      labels: {
                        text: {
                          fontSize: compactMode ? 8 : 11,
                          fontWeight: compactMode ? 700 : 500,
                          fill: "#333" 
                        }
                      }
                    }}
                    tooltip={({ id, value, color, data }) => (
                      <div
                        style={{
                          padding: '9px 12px',
                          background: 'white',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{id}</div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              background: color,
                              marginRight: '8px',
                              borderRadius: '2px'
                            }}
                          />
                          <div>
                            <strong>{value}</strong> patients
                            {data.percentage && ` (${data.percentage.toFixed(1)}%)`}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            May 7th Backup Version
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={colorTheme} 
              onValueChange={handleColorThemeChange}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Select color theme" />
              </SelectTrigger>
              <SelectContent>
                {colorThemeOptions.map((theme) => (
                  <SelectItem key={theme.name} value={theme.name} className="text-xs">
                    {theme.name.replace(/-/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}