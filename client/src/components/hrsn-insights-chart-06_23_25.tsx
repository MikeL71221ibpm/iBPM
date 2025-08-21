// HRSN Insights Chart Component - June 23, 2025
// Dual-source HRSN component that displays both Customer Data and Extracted Insights
// Uses /api/hrsn-data endpoint for comprehensive HRSN analysis

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import { useChartTheme } from "@/context/ChartThemeContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize, Eye, Loader2 } from "lucide-react";

interface HrsnCategoryData {
  customerCount: number;
  extractedCount: number;
  totalAffected: number;
  dataSource: "customer" | "extracted" | "both";
}

interface HrsnApiResponse {
  categories: {
    [key: string]: HrsnCategoryData;
  };
  totalPatients: number;
  summary: {
    totalCustomerData: number;
    totalExtractedInsights: number;
    totalDualSource: number;
  };
}

interface HrsnInsightsChartProps {
  patientData?: any[];
  extractedSymptoms?: any[];
  isLoading?: boolean;
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
  title?: string;
  chartType?: "pie" | "bar";
  height?: number;
  showTitle?: boolean;
}

interface ChartDataItem {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color?: string;
  icon?: string;
  dataSource?: string;
  [key: string]: any; // Allow additional properties for Nivo compatibility
}

export default function HrsnInsightsChart({
  patientData,
  extractedSymptoms,
  isLoading = false,
  filterBy,
  title = "🎯 HRSN Dual-Source Analysis",
  chartType = "pie",
  height = 400,
  showTitle = true
}: HrsnInsightsChartProps) {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const { currentTheme, colorSettings } = useChartTheme();

  // Fetch dual-source HRSN data from API
  const { data: hrsnData, isLoading: hrsnLoading, error: hrsnError } = useQuery<HrsnApiResponse>({
    queryKey: ['/api/hrsn-data'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      console.log('🔍 Making API call to /api/hrsn-data');
      const response = await fetch('/api/hrsn-data', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('❌ HRSN API failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch HRSN data: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HRSN API response:', data);
      return data;
    },
  });

  // Color schemes for different themes
  const colorSchemes: Record<string, string[]> = {
    vivid: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
    pastel: ["#fca5a5", "#fdba74", "#fde047", "#86efac", "#7dd3fc", "#c4b5fd", "#f9a8d4", "#fed7aa", "#a7f3d0"],
    dark: ["#7f1d1d", "#9a3412", "#a16207", "#166534", "#164e63", "#581c87", "#9d174d", "#92400e", "#047857"],
    muted: ["#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937", "#111827", "#030712", "#0c0a09", "#0a0a0a"],
    viridis: ["#440154", "#404387", "#29788E", "#22A784", "#79D151", "#FDE724", "#95D840", "#55C667", "#1E9B8A"]
  };

  const getColors = () => {
    return colorSchemes[currentTheme] || colorSchemes.vivid;
  };

  // HRSN category mapping with icons
  const hrsnCategoryMapping = {
    housing_insecurity: { icon: "🏠", label: "Housing Insecurity" },
    food_insecurity: { icon: "🍎", label: "Food Insecurity" },
    financial_status: { icon: "💰", label: "Financial Stress" },
    access_to_transportation: { icon: "🚗", label: "Transportation Access" },
    has_a_car: { icon: "🚙", label: "Vehicle Access" }
  };

  // Process dual-source HRSN data for visualization
  useEffect(() => {
    if (!hrsnData?.categories || Object.keys(hrsnData.categories).length === 0) {
      setChartData([]);
      return;
    }

    const colors = getColors();
    const categories = hrsnData.categories;
    
    // Create chart data from dual-source categories
    const processedData: ChartDataItem[] = Object.entries(categories)
      .filter(([key, data]) => data.totalAffected > 0) // Only show categories with data
      .map(([key, data], index) => {
        const mapping = hrsnCategoryMapping[key as keyof typeof hrsnCategoryMapping];
        const icon = mapping?.icon || "📊";
        const label = mapping?.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Create data source indicator
        let dataSourceLabel = "";
        if (data.dataSource === "customer") {
          dataSourceLabel = " (📊 Customer Data)";
        } else if (data.dataSource === "extracted") {
          dataSourceLabel = " (🔍 Extracted Insights)";
        } else if (data.dataSource === "both") {
          dataSourceLabel = " (🎯 Dual Sources)";
        }

        return {
          id: key,
          label: `${icon} ${label}${dataSourceLabel}`,
          value: data.totalAffected,
          percentage: Math.round((data.totalAffected / hrsnData.totalPatients) * 100),
          color: colors[index % colors.length],
          icon: icon,
          dataSource: data.dataSource,
          customerCount: data.customerCount,
          extractedCount: data.extractedCount
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by count descending

    console.log(`🎯 Processed dual-source HRSN data:`, processedData);
    setChartData(processedData);
  }, [hrsnData, currentTheme]);

  // Show loading state
  if (hrsnLoading || isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <CardDescription>
            Loading dual-source HRSN analysis...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
            <p className="text-lg font-medium text-muted-foreground">Analyzing HRSN data sources...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no data
  if (!hrsnData?.categories || chartData.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <CardDescription>
            Dual-source HRSN analysis: Customer Data + Extracted Insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Eye className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No HRSN Data Available</p>
            <p className="text-sm text-muted-foreground mt-2">
              No customer data or extracted insights found for HRSN categories
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pie Chart Component
  const PieChart = ({ isDialog = false }: { isDialog?: boolean }) => (
    <div style={{ height: height }}>
      <ResponsivePie
        data={chartData}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        valueFormat={value => `${value} (${chartData.find(d => d.value === value)?.percentage || 0}%)`}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: '#999',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 18,
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
        theme={{
          tooltip: {
            container: {
              background: 'white',
              color: 'black',
              fontSize: '14px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }
          }
        }}
      />
    </div>
  );

  // Bar Chart Component
  const BarChart = ({ isDialog = false }: { isDialog?: boolean }) => (
    <div style={{ height: height }}>
      <ResponsiveBar
        data={chartData as any}
        keys={['value']}
        indexBy="id"
        margin={{ top: 50, right: 130, bottom: 100, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={({ index }) => chartData[index]?.color || '#8884d8'}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'HRSN Categories',
          legendPosition: 'middle',
          legendOffset: 80
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Count',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        valueFormat={value => `${value} (${chartData.find(d => d.value === value)?.percentage || 0}%)`}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        theme={{
          tooltip: {
            container: {
              background: 'white',
              color: 'black',
              fontSize: '14px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }
          }
        }}
      />
    </div>
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        {showTitle && (
          <>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                <CardDescription>
                  Dual-source HRSN analysis from {hrsnData?.totalPatients?.toLocaleString() || '0'} patients
                  showing Customer Data + Extracted Insights
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Maximize className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                  </DialogHeader>
                  {chartType === "pie" ? <PieChart isDialog={true} /> : <BarChart isDialog={true} />}
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </CardHeader>
      <CardContent>
        {chartType === "pie" ? <PieChart /> : <BarChart />}
        
        {/* Summary Statistics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg">{chartData.length}</div>
            <div className="text-muted-foreground">Categories Detected</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">{hrsnData?.summary?.totalExtractedInsights?.toLocaleString() || '0'}</div>
            <div className="text-muted-foreground">Extracted Insights</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">{hrsnData?.totalPatients?.toLocaleString() || '0'}</div>
            <div className="text-muted-foreground">Total Patients</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">
              {chartData.length > 0 && hrsnData?.totalPatients ? Math.round((chartData.reduce((sum, item) => sum + item.value, 0) / hrsnData.totalPatients) * 100) : 0}%
            </div>
            <div className="text-muted-foreground">Patients with HRSN Issues</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}