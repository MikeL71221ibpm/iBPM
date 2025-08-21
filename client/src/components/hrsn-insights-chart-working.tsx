import React, { useState, useEffect } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';

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
  customerCount?: number;
  extractedCount?: number;
  [key: string]: any; // Index signature for Nivo compatibility
}

export default function HrsnInsightsChart({
  patientData = [],
  extractedSymptoms = [],
  isLoading = false,
  filterBy = {},
  title = "HRSN Insights Analysis",
  chartType = "pie",
  height = 400,
  showTitle = true
}: HrsnInsightsChartProps) {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const currentTheme = 'vivid'; // Default theme

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
    console.log('🔍 Processing HRSN data - Patients:', patientData?.length, 'Symptoms:', extractedSymptoms?.length);
    
    if (!patientData?.length && !extractedSymptoms?.length) {
      console.log('❌ No data available for HRSN processing');
      setChartData([]);
      return;
    }

    const colors = getColors();
    const hrsnData: Record<string, { customerCount: number; extractedCount: number; totalAffected: number; }> = {};

    // Process customer-provided HRSN data from patients table
    patientData?.forEach(patient => {
      Object.keys(hrsnCategoryMapping).forEach(category => {
        const fieldValue = patient[category];
        if (fieldValue && fieldValue !== '' && fieldValue !== 'null' && fieldValue !== null) {
          if (!hrsnData[category]) {
            hrsnData[category] = { customerCount: 0, extractedCount: 0, totalAffected: 0 };
          }
          hrsnData[category].customerCount += 1;
        }
      });
    });

    // Process extracted HRSN insights from symptoms (symp_prob = "Problem")
    extractedSymptoms?.forEach(symptom => {
      if (symptom.symp_prob === 'Problem' && symptom.zcode_hrsn) {
        const zcode = symptom.zcode_hrsn.toLowerCase();
        let category = '';
        
        if (zcode.includes('housing')) category = 'housing_insecurity';
        else if (zcode.includes('food')) category = 'food_insecurity';
        else if (zcode.includes('financial')) category = 'financial_status';
        else if (zcode.includes('transportation')) category = 'access_to_transportation';
        else if (zcode.includes('vehicle') || zcode.includes('car')) category = 'has_a_car';
        
        if (category) {
          if (!hrsnData[category]) {
            hrsnData[category] = { customerCount: 0, extractedCount: 0, totalAffected: 0 };
          }
          hrsnData[category].extractedCount += 1;
        }
      }
    });

    // Calculate total affected and create chart data
    const totalPatients = patientData?.length || 0;
    const processedData: ChartDataItem[] = Object.entries(hrsnData)
      .filter(([key, data]) => data.customerCount > 0 || data.extractedCount > 0)
      .map(([key, data], index) => {
        const mapping = hrsnCategoryMapping[key as keyof typeof hrsnCategoryMapping];
        const icon = mapping?.icon || "📊";
        const label = mapping?.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Calculate total affected (unique patients)
        const totalAffected = Math.max(data.customerCount, data.extractedCount);
        
        // Create data source indicator
        let dataSourceLabel = "";
        let dataSource = "";
        if (data.customerCount > 0 && data.extractedCount > 0) {
          dataSourceLabel = " (🎯 Dual Sources)";
          dataSource = "both";
        } else if (data.customerCount > 0) {
          dataSourceLabel = " (📊 Customer Data)";
          dataSource = "customer";
        } else if (data.extractedCount > 0) {
          dataSourceLabel = " (🔍 Extracted Insights)";
          dataSource = "extracted";
        }

        return {
          id: key,
          label: `${icon} ${label}${dataSourceLabel}`,
          value: totalAffected,
          percentage: totalPatients > 0 ? Math.round((totalAffected / totalPatients) * 100) : 0,
          color: colors[index % colors.length],
          icon: icon,
          dataSource: dataSource,
          customerCount: data.customerCount,
          extractedCount: data.extractedCount
        };
      })
      .sort((a, b) => b.value - a.value); // Sort by count descending

    console.log('✅ Processed dual-source HRSN data:', processedData);
    setChartData(processedData);
  }, [patientData, extractedSymptoms, currentTheme]);

  // Show loading state
  if (isLoading) {
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
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Analyzing HRSN data sources...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no data
  if (chartData.length === 0) {
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
        colors={{ datum: 'data.color' }}
        tooltip={({ datum }) => (
          <div className="bg-white p-3 border rounded shadow-lg">
            <div className="font-semibold">{datum.data.label}</div>
            <div className="text-sm text-gray-600">
              Patients: {datum.value} ({datum.data.percentage}%)
            </div>
            {datum.data.customerCount && datum.data.extractedCount && (
              <div className="text-xs text-gray-500 mt-1">
                Customer: {datum.data.customerCount} | Extracted: {datum.data.extractedCount}
              </div>
            )}
          </div>
        )}
        animate={!isDialog}
        motionConfig="gentle"
      />
    </div>
  );

  // Bar Chart Component
  const BarChart = ({ isDialog = false }: { isDialog?: boolean }) => (
    <div style={{ height: height }}>
      <ResponsiveBar
        data={chartData}
        keys={['value']}
        indexBy="id"
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={{ datum: 'data.color' }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'HRSN Categories',
          legendPosition: 'middle',
          legendOffset: 32
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Number of Patients',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        tooltip={({ id, value, data }) => (
          <div className="bg-white p-3 border rounded shadow-lg">
            <div className="font-semibold">{data.label}</div>
            <div className="text-sm text-gray-600">
              Patients: {value} ({data.percentage}%)
            </div>
            {data.customerCount && data.extractedCount && (
              <div className="text-xs text-gray-500 mt-1">
                Customer: {data.customerCount} | Extracted: {data.extractedCount}
              </div>
            )}
          </div>
        )}
        animate={!isDialog}
        motionConfig="gentle"
      />
    </div>
  );

  return (
    <Card className="shadow-md">
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <CardDescription>
            Dual-source HRSN analysis: Customer Data + Extracted Insights
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {chartType === "pie" ? <PieChart /> : <BarChart />}
      </CardContent>
    </Card>
  );
}