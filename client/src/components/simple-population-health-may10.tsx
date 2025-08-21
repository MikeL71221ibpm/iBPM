import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { ResponsiveTreeMap } from '@nivo/treemap';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Define types for chart data
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface SimplePopulationHealthProps {
  data?: any;
  isLoading?: boolean;
}

export default function SimplePopulationHealthMay10({ 
  data, 
  isLoading = false 
}: SimplePopulationHealthProps) {
  // May 10th version uses radio buttons for primary navigation rather than dropdowns
  const [activeView, setActiveView] = useState<string>("population");
  
  // State for health-related social needs filters
  const [housingFilter, setHousingFilter] = useState<string>("all");
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [financialFilter, setFinancialFilter] = useState<string>("all");
  
  // State for diagnosis filter
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>("all");
  
  // Filter data based on HRSN filters
  const filterDataByHrsn = useCallback((dataItems: any[]) => {
    if (!dataItems) return [];
    
    return dataItems.filter(item => {
      // Apply housing filter
      if (housingFilter !== 'all' && item.housingStatus !== housingFilter) {
        return false;
      }
      
      // Apply food filter
      if (foodFilter !== 'all' && item.foodStatus !== foodFilter) {
        return false;
      }
      
      // Apply financial filter
      if (financialFilter !== 'all' && item.financialStatus !== financialFilter) {
        return false;
      }
      
      return true;
    });
  }, [housingFilter, foodFilter, financialFilter]);

  // Generate some mock health data
  const generateMockData = useCallback(() => {
    // Create mock data for visualization if real data is missing
    const mockData: ChartDataItem[] = [
      { id: "Age 0-17", value: 120, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
      { id: "Age 18-24", value: 240, housingStatus: "Unstable", foodStatus: "Insecure", financialStatus: "Unstable" },
      { id: "Age 25-34", value: 180, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
      { id: "Age 35-44", value: 220, housingStatus: "Unstable", foodStatus: "Insecure", financialStatus: "Unstable" },
      { id: "Age 45-54", value: 130, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
      { id: "Age 55-64", value: 90, housingStatus: "Unstable", foodStatus: "Insecure", financialStatus: "Unstable" },
      { id: "Age 65+", value: 60, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
    ];
    
    return mockData;
  }, []);

  // Process and filter the data
  const getFilteredData = useCallback(() => {
    // First try to use real data if available
    if (data?.patients && data.patients.length > 0) {
      console.log("Using real patient data:", data.patients.length, "patients");
      return filterDataByHrsn(data.patients);
    }
    
    // Otherwise use mock data
    return filterDataByHrsn(generateMockData());
  }, [data, filterDataByHrsn, generateMockData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Population Health - May 10th Version</CardTitle>
          <CardDescription>
            This is a test component to evaluate the May 10th filtering functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* May 10th version uses radio buttons for view selection */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-2">Search Mode:</h3>
            <RadioGroup 
              value={activeView}
              onValueChange={setActiveView}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual">Individual Search</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="population" id="population" />
                <Label htmlFor="population">Population Health</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Only show filters if Population Health is selected */}
          {activeView === "population" && (
            <div className="grid grid-cols-1 gap-4 mb-4">
              {/* All filters in one row per May 10th requirements */}
              <div className="flex flex-wrap gap-4">
                {/* Housing Filter */}
                <div className="min-w-[180px]">
                  <label className="text-sm font-medium mb-1 block">Housing Status</label>
                  <Select
                    value={housingFilter}
                    onValueChange={setHousingFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Housing Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Housing Status</SelectItem>
                      <SelectItem value="Stable">Stable</SelectItem>
                      <SelectItem value="Unstable">Unstable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Food Filter */}
                <div className="min-w-[180px]">
                  <label className="text-sm font-medium mb-1 block">Food Status</label>
                  <Select
                    value={foodFilter}
                    onValueChange={setFoodFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Food Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Food Status</SelectItem>
                      <SelectItem value="Secure">Secure</SelectItem>
                      <SelectItem value="Insecure">Insecure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Financial Filter */}
                <div className="min-w-[180px]">
                  <label className="text-sm font-medium mb-1 block">Financial Status</label>
                  <Select
                    value={financialFilter}
                    onValueChange={setFinancialFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Financial Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Financial Status</SelectItem>
                      <SelectItem value="Stable">Stable</SelectItem>
                      <SelectItem value="Unstable">Unstable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Diagnosis Filter */}
                <div className="min-w-[180px]">
                  <label className="text-sm font-medium mb-1 block">Diagnosis</label>
                  <Select
                    value={diagnosisFilter}
                    onValueChange={setDiagnosisFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Diagnoses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Diagnoses</SelectItem>
                      <SelectItem value="MDD">Major Depressive Disorder</SelectItem>
                      <SelectItem value="HUD">Hallucinogen Use Disorder</SelectItem>
                      <SelectItem value="PTSD">Post-Traumatic Stress Disorder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Display Different Content based on active view */}
          {activeView === "individual" && (
            <div className="mt-8 border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Individual Search</h3>
              <p className="text-gray-600">
                This section would include patient search functionality in the complete application.
              </p>
            </div>
          )}
          
          {activeView === "population" && (
            <div className="mt-8 border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Population Health View</h3>
              <p className="text-gray-600 mb-4">Using May 10th filtering approach with filters in a single line and standardized dropdown values.</p>
              
              {/* May 10th charts - reduced size (75px height), compact, bold text */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Bar Chart */}
                <Card className="shadow-sm">
                  <CardHeader className="p-2">
                    <CardTitle className="text-sm font-bold">Age Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div style={{ height: "75px" }}>
                      <ResponsiveBar
                        data={getFilteredData()}
                        keys={["value"]}
                        indexBy="id"
                        margin={{ top: 0, right: 0, bottom: 15, left: 40 }}
                        padding={0.3}
                        colors={{ scheme: 'dark2' }}
                        axisBottom={{
                          tickSize: 0,
                          tickPadding: 5,
                          tickRotation: -45,
                          renderTick: (tick) => {
                            return (
                              <text
                                textAnchor="end"
                                dominantBaseline="middle"
                                style={{
                                  fontSize: "6px",
                                  fontWeight: "bold",
                                  fill: "#333"
                                }}
                                transform={`translate(${tick.x},${tick.y}) rotate(-45)`}
                              >
                                {tick.value}
                              </text>
                            );
                          }
                        }}
                        axisLeft={{
                          tickSize: 0,
                          tickPadding: 5,
                          format: (value) => (value > 100 ? `${Math.floor(value / 100)}00` : value),
                          renderTick: (tick) => {
                            return (
                              <text
                                textAnchor="end"
                                dominantBaseline="middle"
                                style={{
                                  fontSize: "6px",
                                  fontWeight: "bold",
                                  fill: "#333"
                                }}
                              >
                                {tick.value}
                              </text>
                            );
                          }
                        }}
                        enableLabel={false}
                        animate={false}
                        isInteractive={false}
                        theme={{
                          axis: {
                            ticks: {
                              text: {
                                fontSize: 6,
                                fontWeight: 'bold',
                                fill: '#333'
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card className="shadow-sm">
                  <CardHeader className="p-2">
                    <CardTitle className="text-sm font-bold">Housing Status</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div style={{ height: "75px" }}>
                      <ResponsivePie
                        data={[
                          { id: "Stable", value: getFilteredData().filter(d => d.housingStatus === "Stable").length },
                          { id: "Unstable", value: getFilteredData().filter(d => d.housingStatus === "Unstable").length }
                        ]}
                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        innerRadius={0.4}
                        padAngle={0.7}
                        cornerRadius={3}
                        colors={{ scheme: 'dark2' }}
                        enableArcLabels={false}
                        enableArcLinkLabels={false}
                        animate={false}
                        isInteractive={false}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* HeatMap Chart */}
                <Card className="shadow-sm">
                  <CardHeader className="p-2">
                    <CardTitle className="text-sm font-bold">Food Security</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div style={{ height: "75px" }}>
                      <ResponsiveBar
                        data={[
                          { id: "Secure", value: getFilteredData().filter(d => d.foodStatus === "Secure").length },
                          { id: "Insecure", value: getFilteredData().filter(d => d.foodStatus === "Insecure").length }
                        ]}
                        keys={["value"]}
                        indexBy="id"
                        margin={{ top: 0, right: 0, bottom: 20, left: 30 }}
                        padding={0.3}
                        colors={{ scheme: 'dark2' }}
                        borderRadius={2}
                        axisBottom={{
                          tickSize: 0,
                          tickPadding: 5,
                          renderTick: (tick) => {
                            return (
                              <text
                                textAnchor="middle"
                                dominantBaseline="hanging"
                                style={{
                                  fontSize: "6px",
                                  fontWeight: "bold",
                                  fill: "#333"
                                }}
                              >
                                {tick.value}
                              </text>
                            );
                          }
                        }}
                        axisLeft={{
                          tickSize: 0,
                          tickPadding: 5,
                          renderTick: (tick) => {
                            return (
                              <text
                                textAnchor="end"
                                dominantBaseline="middle"
                                style={{
                                  fontSize: "6px",
                                  fontWeight: "bold",
                                  fill: "#333"
                                }}
                              >
                                {tick.value}
                              </text>
                            );
                          }
                        }}
                        enableLabel={false}
                        animate={false}
                        isInteractive={false}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Status Chart */}
                <Card className="shadow-sm">
                  <CardHeader className="p-2">
                    <CardTitle className="text-sm font-bold">Financial Status</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div style={{ height: "75px" }}>
                      <ResponsiveBar
                        data={[
                          { id: "Stable", value: getFilteredData().filter(d => d.financialStatus === "Stable").length },
                          { id: "Unstable", value: getFilteredData().filter(d => d.financialStatus === "Unstable").length }
                        ]}
                        keys={["value"]}
                        indexBy="id"
                        margin={{ top: 0, right: 0, bottom: 20, left: 30 }}
                        padding={0.3}
                        colors={{ scheme: 'dark2' }}
                        borderRadius={2}
                        axisBottom={{
                          tickSize: 0,
                          tickPadding: 5,
                          renderTick: (tick) => {
                            return (
                              <text
                                textAnchor="middle"
                                dominantBaseline="hanging"
                                style={{
                                  fontSize: "6px",
                                  fontWeight: "bold",
                                  fill: "#333"
                                }}
                              >
                                {tick.value}
                              </text>
                            );
                          }
                        }}
                        axisLeft={{
                          tickSize: 0,
                          tickPadding: 5,
                          renderTick: (tick) => {
                            return (
                              <text
                                textAnchor="end"
                                dominantBaseline="middle"
                                style={{
                                  fontSize: "6px",
                                  fontWeight: "bold",
                                  fill: "#333"
                                }}
                              >
                                {tick.value}
                              </text>
                            );
                          }
                        }}
                        enableLabel={false}
                        animate={false}
                        isInteractive={false}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Filtered Results */}
              <div className="mt-4 bg-gray-100 p-4 rounded-md overflow-x-auto">
                <h4 className="font-medium mb-2">Filtered Results:</h4>
                <pre className="text-xs">
                  {JSON.stringify(getFilteredData(), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}