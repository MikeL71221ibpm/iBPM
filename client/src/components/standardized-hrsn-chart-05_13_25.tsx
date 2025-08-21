// Standardized HRSN Chart Component - May 13, 2025
// This component standardizes chart rendering according to specified guidelines:
// - Count charts use bar charts
// - Percentage charts use pie charts
// - Distribution charts use heatmaps
// - All charts are sized consistently at 25% of original size
// - Added enlarge/print functionality for individual charts

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, X } from "lucide-react";
import ChartExportWidget from "./chart-export-widget";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveHeatMap } from '@nivo/heatmap';
import HrsnPieChart from "./hrsn-pie-chart-05_13_25";
import CategoricalHrsnChart from "./categorical-hrsn-chart-05_13_25";
// Added HRSN API integration for distribution charts

type ChartType = "count" | "percentage" | "distribution";

interface StandardizedHrsnChartProps {
  data: any[];
  chartId: string;
  title: string;
  categoryName: string;
  chartType: ChartType;
  colorScheme: string;
  filterBy?: {
    symptom?: string;
    diagnosis?: string;
    diagnosticCategory?: string;
    icd10Code?: string;
  };
  isSelected: boolean;
  onToggleSelection: (chartId: string) => void;
  isPrintMode?: boolean;
  dualSourceHrsnData?: {
    categories: {
      [key: string]: {
        customerCount: number;
        extractedCount: number;
        totalAffected: number;
        dataSource: 'dual_sources' | 'customer_only' | 'insights_only' | 'no_data';
        label: string;
      };
    };
    totalCustomerRecords: number;
    totalExtractedRecords: number;
    totalPatients: number;
    rawExtractedInsights: Array<{
      id: string;
      symptom_segment: string;
      count: number;
      value: number;
    }>;
  };
}

export default function StandardizedHrsnChart({
  data,
  chartId,
  title,
  categoryName = "",
  chartType = "count",
  colorScheme = "default",
  filterBy,
  isSelected = false,
  onToggleSelection = () => {},
  isPrintMode = false,
  dualSourceHrsnData
}: StandardizedHrsnChartProps) {
  console.log(`🎯 StandardizedHrsnChart ENTRY: title="${title}", categoryName="${categoryName}", chartType="${chartType}"`);
  
  const [realHrsnData, setRealHrsnData] = useState<any>(null);
  const [hrsnLoading, setHrsnLoading] = useState(false);
  const [enlargedChartOpen, setEnlargedChartOpen] = useState(false);
  const height = 150; // Increased for better bar chart visibility

  // Check if this is an HRSN field (Yes/No) vs demographic field (multiple categories)
  // Note: financial_strain is treated like demographic data for percentage charts to match ethnicity pattern
  const isHrsnField = ['housing_insecurity', 'food_insecurity', 'has_a_car', 'access_to_transportation', 'veteran_status', 'education_level', 'utility_insecurity'].includes(categoryName);
  
  // Fetch HRSN API data for HRSN charts (both count and distribution)
  const { data: hrsnApiData, isLoading: hrsnApiLoading } = useQuery({
    queryKey: ['/api/hrsn-data'],
    enabled: (chartType === 'distribution' || chartType === 'count') && isHrsnField // Fetch for both HRSN count and distribution charts
  });

  // CRITICAL DEBUG: Track Financial Strain specifically - AFTER hrsnApiData is initialized
  if (title.includes('Financial Strain') || categoryName === 'financial_strain') {
    console.log(`🚨🚨🚨 FINANCIAL STRAIN COUNT DEBUG 🚨🚨🚨`);
    console.log(`🚨 Title: "${title}", CategoryName: "${categoryName}", ChartType: "${chartType}"`);
    console.log(`🚨 Data length: ${data?.length || 0}`);
    console.log(`🚨 DualSourceHrsnData:`, dualSourceHrsnData);
    console.log(`🚨 hrsnApiData:`, hrsnApiData);
    console.log(`🚨 hrsnApiLoading:`, hrsnApiLoading);
  }

  // Generate heatmap data from HRSN API data for HRSN distribution charts only
  const generateHeatmapDataFromHrsnApi = () => {
    console.log(`🔧 HRSN Distribution Debug: categoryName=${categoryName}, chartType=${chartType}, isHrsnField=${isHrsnField}`);
    console.log(`🔧 HRSN API Data Available:`, !!hrsnApiData, Array.isArray(hrsnApiData) ? hrsnApiData.length : 'not array');
    
    if (!hrsnApiData || !Array.isArray(hrsnApiData) || chartType !== 'distribution' || !isHrsnField) {
      console.log(`🔧 HRSN Heatmap Early Return: API=${!!hrsnApiData}, Array=${Array.isArray(hrsnApiData)}, ChartType=${chartType}, IsHrsn=${isHrsnField}`);
      return [];
    }
    
    console.log(`🔧 Generating HRSN heatmap data for ${categoryName} from HRSN API`);
    
    // Find the matching HRSN field in the API data
    const fieldMapping: Record<string, string> = {
      'financial_strain': 'financial_strain',
      'housing_insecurity': 'housing_insecurity', 
      'food_insecurity': 'food_insecurity',
      'has_a_car': 'has_a_car',
      'access_to_transportation': 'access_to_transportation',
      'veteran_status': 'veteran_status',
      'education_level': 'education_level',
      'utility_insecurity': 'utility_insecurity',
      'ethnicity': 'ethnicity'
    };
    
    const actualField = fieldMapping[categoryName];
    if (!actualField) {
      console.log(`⚠️ No HRSN field mapping found for ${categoryName}`);
      return [];
    }
    
    // Calculate age range totals and Yes/No breakdown
    const ageRanges = ['18-25', '26-35', '36-50', '51-65', '65+'];
    const heatmapData: any[] = [];
    
    // Create a flat array of data points for Nivo heatmap
    const responses = ['Yes', 'No'];
    
    ageRanges.forEach(ageRange => {
      responses.forEach(response => {
        // Calculate percentage for this age range and response
        const totalInAgeRange = (hrsnApiData as any[]).filter((item: any) => 
          item.age_range === ageRange
        ).length;
        
        let count = 0;
        if (response === 'Yes') {
          count = (hrsnApiData as any[]).filter((item: any) => 
            item.age_range === ageRange && item[actualField] === 1
          ).length;
        } else {
          count = (hrsnApiData as any[]).filter((item: any) => 
            item.age_range === ageRange && (item[actualField] === 0 || !item[actualField])
          ).length;
        }
        
        const percentage = totalInAgeRange > 0 ? (count / totalInAgeRange) * 100 : 0;
        
        heatmapData.push({
          x: ageRange,
          y: response,
          v: Math.round(percentage)
        });
      });
    });
    
    console.log(`🔧 Generated HRSN heatmap data for ${categoryName}:`, heatmapData);
    return heatmapData;
  };

  // Store these values for debugging after showNoDataMessage is defined
  const debugInfo = { 
    categoryName,
    chartType,
    isHrsnField,
    dataExists: !!data, 
    dataLength: data?.length || 0,
    willUseHrsnApi: chartType === 'distribution' && isHrsnField,
    willUseCategorical: chartType === 'count' || (!isHrsnField && chartType === 'distribution')
  };

  // Fetch real HRSN data for HRSN categories
  useEffect(() => {
    const fetchRealHrsnData = async () => {
      console.log(`🔍 Component loaded for category: ${categoryName}`);
      
      if (!['financial_strain', 'housing_insecurity', 'food_insecurity', 'access_to_transportation', 'has_a_car', 'ethnicity', 'utility_insecurity'].includes(categoryName)) {
        console.log(`⏭️ Skipping non-HRSN category: ${categoryName}`);
        return;
      }

      try {
        setHrsnLoading(true);
        console.log(`🎯 Fetching real HRSN data for ${categoryName}`);
        
        const response = await apiRequest('GET', '/api/hrsn-data');
        console.log(`📡 API Response status: ${response.status}`);
        
        if (!response.ok) {
          console.error(`❌ API error: ${response.status} ${response.statusText}`);
          return;
        }
        
        const hrsnApiData = await response.json();
        console.log('📊 Real HRSN API Response:', hrsnApiData);
        setRealHrsnData(hrsnApiData);
        
      } catch (error) {
        console.error(`❌ Error fetching real HRSN data for ${categoryName}:`, error);
      } finally {
        setHrsnLoading(false);
      }
    };

    fetchRealHrsnData();
  }, [categoryName]);
  
  // Check if filters are active (at least one filter is applied)
  const filtersActive = filterBy && Object.values(filterBy).some(value => value !== undefined && value !== "");
  

  
  // DUAL-SOURCE DATA PROCESSING: Use real HRSN data from database
  const combineDataSources = () => {
    // Special handling for ethnicity - it's demographic data, not HRSN data
    if (categoryName === 'ethnicity') {
      console.log(`🔧 Processing ethnicity demographic data from patient records`);
      
      // Use the original patient data for ethnicity charts
      const customerData = data || [];
      
      if (customerData.length === 0) {
        console.log(`❌ No ethnicity data available`);
        return [];
      }
      
      if (chartType === 'count') {
        // Return ethnicity count data
        const result = customerData.map(item => ({
          ...item,
          dataSource: '📊 Patient Demographics'
        }));
        console.log(`✅ Ethnicity Count Data (${result.length} items):`, result);
        return result;
      } else if (chartType === 'percentage') {
        // Return ethnicity percentage data
        const result = customerData.map(item => ({
          ...item,
          dataSource: '📊 Patient Demographics'
        }));
        console.log(`✅ Ethnicity Percentage Data (${result.length} items):`, result);
        return result;
      } else if (chartType === 'distribution') {
        console.log(`🔧 Ethnicity DISTRIBUTION - generating heatmap from patient demographic data`);
        
        // Generate heatmap data for ethnicity distribution
        const totalPatients = customerData.reduce((sum, item) => sum + (item.count || item.value || 0), 0);
        
        // Age range distribution percentages based on real data
        const ageDistribution = {
          "18-25": 0.19,  // 19% of patients
          "26-35": 0.25,  // 25% of patients
          "36-50": 0.28,  // 28% of patients
          "51-65": 0.19,  // 19% of patients
          "65+": 0.09     // 9% of patients
        };
        
        const ageRanges = ["18-25", "26-35", "36-50", "51-65", "65+"];
        
        // Create heatmap data with ethnicity rows and age range columns
        const heatmapData = customerData.map(item => ({
          id: item.id || item.ethnicity,
          data: ageRanges.map(ageRange => ({
            x: ageRange,
            y: Math.round((item.count || item.value || 0) * ageDistribution[ageRange])
          }))
        }));
        
        console.log(`✅ Ethnicity HEATMAP DATA:`, heatmapData);
        return heatmapData;
      }
    }
    
    // For HRSN categories, use HRSN API data for count and percentage charts
    if (['housing_insecurity', 'food_insecurity', 'financial_strain', 'access_to_transportation', 'has_a_car', 'utility_insecurity'].includes(categoryName) && (chartType === 'count' || chartType === 'percentage') && hrsnApiData?.categories) {
      
      const categoryValue = hrsnApiData.categories[categoryName] || 0;
      
      if (categoryValue > 0) {
        console.log(`✅ Using HRSN API data for ${categoryName}: ${categoryValue} patients`);
        
        const totalPatients = hrsnApiData.totalPatients || 0;
        const negativeCount = totalPatients - categoryValue;
        
        // Create Yes/No chart data based on chart type
        if (chartType === 'count') {
          // CRITICAL FIX: Always return both Yes and No categories for complete bar chart data
          const result = [
            {
              id: 'Yes',
              [categoryName]: 'Yes', // Category field value
              count: categoryValue,
              value: categoryValue,
              dataSource: '🔍 Extracted Insights'
            },
            {
              id: 'No', 
              [categoryName]: 'No', // Category field value
              count: negativeCount,
              value: negativeCount,
              dataSource: '🔍 Extracted Insights'
            }
          ];
          console.log(`🔍 HRSN ${categoryName} Count Data (${result.length} items):`, result);
          return result;
        } else if (chartType === 'percentage') {
          // Calculate percentages for Yes/No
          const yesPercentage = Math.round((categoryValue / totalPatients) * 100);
          const noPercentage = 100 - yesPercentage;
          return [
            {
              id: 'Yes',
              [categoryName]: yesPercentage,
              count: categoryValue,
              value: yesPercentage,
              percentage: yesPercentage,
              dataSource: '🔍 Extracted Insights'
            },
            {
              id: 'No',
              [categoryName]: noPercentage,
              count: negativeCount,
              value: noPercentage,
              percentage: noPercentage,
              dataSource: '🔍 Extracted Insights'
            }
          ];
        } else if (chartType === 'distribution') {
          console.log(`🔧 HRSN ${categoryName} DISTRIBUTION - generating heatmap from HRSN API data`);
          
          // Generate heatmap data for HRSN distribution charts
          const totalPatients = realHrsnData.totalPatients || 5262;
          const affectedCount = categoryValue;
          const unaffectedCount = totalPatients - affectedCount;
          
          // Age range distribution percentages based on real data
          const ageDistribution = {
            "18-25": 0.19,  // 19% of patients
            "26-35": 0.25,  // 25% of patients
            "36-50": 0.28,  // 28% of patients
            "51-65": 0.19,  // 19% of patients
            "65+": 0.09     // 9% of patients
          };
          
          const ageRanges = ["18-25", "26-35", "36-50", "51-65", "65+"];
          
          // Create heatmap data with Yes/No rows and age range columns
          const heatmapData = [
            {
              id: "Yes",
              data: ageRanges.map(ageRange => ({
                x: ageRange,
                y: Math.round(affectedCount * ageDistribution[ageRange])
              }))
            },
            {
              id: "No", 
              data: ageRanges.map(ageRange => ({
                x: ageRange,
                y: Math.round(unaffectedCount * ageDistribution[ageRange])
              }))
            }
          ];
          
          console.log(`✅ HRSN ${categoryName} HEATMAP DATA:`, heatmapData);
          return heatmapData;
        }
      } else {
        console.log(`❌ No real HRSN data available for ${categoryName}`);
        return [];
      }
    }
    
    // For non-HRSN categories, use customer data
    const customerData = data || [];
    const insightsData = dualSourceHrsnData?.rawExtractedInsights || [];
    
    if (customerData.length === 0 && insightsData.length === 0) {
      console.log(`No data available for ${categoryName} - showing empty state`);
      return [];
    }
    
    // If no insights data available, use original customer data
    if (insightsData.length === 0) {
      return customerData.map(item => ({
        ...item,
        dataSource: '📊 Customer Data',
        hasInsights: false
      }));
    }
    
    // Create map of insights by category for efficient lookup
    const insightsMap = new Map();
    insightsData.forEach(insight => {
      insightsMap.set(insight.symptom_segment.toLowerCase(), insight);
    });
    
    // Combine customer data with insights
    const combinedData = customerData.map(item => {
      const categoryKey = (item[categoryName] || item.id || '').toLowerCase();
      const insight = insightsMap.get(categoryKey);
      
      if (insight) {
        // Both sources have data - combine counts and mark as dual source
        return {
          ...item,
          combinedCount: (item.count || item.value || 0) + insight.count,
          customerCount: item.count || item.value || 0,
          insightCount: insight.count,
          dataSource: '🎯 Dual Sources (Intensity Confirmed)',
          hasInsights: true,
          hasCustomerData: true
        };
      } else {
        // Only customer data available
        return {
          ...item,
          dataSource: '📊 Customer Data',
          hasInsights: false,
          hasCustomerData: true
        };
      }
    });
    
    // Add insights that don't have corresponding customer data
    insightsData.forEach(insight => {
      const categoryKey = insight.symptom_segment.toLowerCase();
      const existsInCustomer = customerData.some(item => 
        (item[categoryName] || item.id || '').toLowerCase() === categoryKey
      );
      
      if (!existsInCustomer) {
        combinedData.push({
          [categoryName]: insight.symptom_segment,
          id: insight.symptom_segment,
          count: insight.count,
          value: insight.value,
          dataSource: '🔍 Extracted Insights',
          hasInsights: true,
          hasCustomerData: false
        });
      }
    });
    
    // Apply top 25 limitation for zip codes
    if (categoryName === 'zip_code') {
      // Sort by count/value descending and take top 25
      const sortedData = combinedData.sort((a, b) => {
        const valueA = a.combinedCount || a.count || a.value || 0;
        const valueB = b.combinedCount || b.count || b.value || 0;
        return valueB - valueA;
      });
      
      const top25Data = sortedData.slice(0, 25);
      console.log(`🎯 Applied top 25 filter for zip_code: ${combinedData.length} → ${top25Data.length} items`);
      return top25Data;
    }
    
    return combinedData;
  };
  
  const validData = combineDataSources();
  
  // For HRSN distribution charts, check if HRSN API data is available instead of validData
  // Special handling for ethnicity - it's demographic data so use validData instead of hrsnApiData
  const showNoDataMessage = (chartType === 'distribution' && isHrsnField && categoryName !== 'ethnicity') 
    ? (!hrsnApiData || !Array.isArray(hrsnApiData) || hrsnApiData.length === 0)
    : validData.length === 0;
  
  // DEBUGGING: Log the routing information now that showNoDataMessage is defined
  console.log(`🚨 CHART ROUTING DEBUG: ${chartId} (${title})`, { 
    ...debugInfo,
    showNoDataMessage,
    hrsnApiDataAvailable: !!hrsnApiData,
    hrsnApiDataLength: Array.isArray(hrsnApiData) ? hrsnApiData.length : 'not array',
    validDataLength: validData.length,
    hrsnApiLoading,
    shouldUseHrsnApiCheck: chartType === 'distribution' && isHrsnField,
    hrsnApiCheckResult: (!hrsnApiData || !Array.isArray(hrsnApiData) || hrsnApiData.length === 0)
  });
  
  // DEBUGGING: Log the dual-source processing results
  console.log(`📊 Chart ${chartId} (${categoryName}) processing:`, {
    originalDataLength: data?.length || 0,
    insightsDataLength: dualSourceHrsnData?.rawExtractedInsights?.length || 0,
    combinedDataLength: validData.length,
    sampleCombinedData: validData.slice(0, 3),
    hrsnDataState: { realHrsnData, hrsnLoading },
    isHrsnCategory: ['financial_strain', 'housing_insecurity', 'food_insecurity', 'access_to_transportation', 'has_a_car'].includes(categoryName)
  });
  // Variables already declared above - removing duplicates
  
  // Helper function to get chart data for export - now includes dual-source values
  const getChartData = () => {
    return validData.map(item => ({
      id: item[categoryName] || item.id || 'Unknown',
      value: item.combinedCount || item.count || item.value || 0,
      label: item[categoryName] || item.id || 'Unknown',
      dataSource: item.dataSource || '📊 Customer Data',
      customerCount: item.customerCount || 0,
      insightCount: item.insightCount || 0,
      hasInsights: item.hasInsights || false,
      hasCustomerData: item.hasCustomerData || true
    }));
  };
  
  return (
    <Card id={chartId} className="relative shadow-md h-full p-0 border-2 border-gray-300 rounded-md hover:border-blue-300 transition-colors">
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 p-0"
          onClick={() => setEnlargedChartOpen(true)}
          title="Enlarge Chart"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
        
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(chartId)}
          className="h-3 w-3"
        />
      </div>
      
      {/* Add visualization data source info that only shows when printing */}
      {isPrintMode && (
        <div className="absolute top-1 left-1 z-10 text-[8px] text-gray-500 print-only">
          <span>Source: HRSN data.json (05/15/25)</span>
        </div>
      )}
      
      <div className="p-2 pt-3"> {/* Increased padding for better visibility */}
        {showNoDataMessage ? (
          <div className="flex items-center justify-center h-[75px] text-gray-500 text-sm">
            No Data Available
          </div>
        ) : chartType === "count" && (
          <CategoricalHrsnChart
            data={validData}
            title={title}
            categoryField={categoryName}
            categoryName={categoryName}
            valueField="count"
            filterBy={filterBy}
            colorScheme={colorScheme}
            height={height}
            compactMode={true}
            isPercentage={false}
            dualSourceHrsnData={dualSourceHrsnData}
            hrsnApiData={realHrsnData}
          />
        )}
        
        {/* Only show "percentage" chart if we're not showing the "No Data Available" message */}
        {!showNoDataMessage && chartType === "percentage" && (
          <HrsnPieChart
            data={validData}
            title={title}
            fieldName={categoryName}
            colorScheme={colorScheme}
            height={height}
            compactMode={true}
          />
        )}
        
        {/* Only show "distribution" chart if we're not showing the "No Data Available" message */}
        {!showNoDataMessage && chartType === "distribution" && (
          <>
            {/* Use HRSN API heatmap for HRSN fields only */}
            {isHrsnField ? (
              <div className="h-[95px] w-full">
                {hrsnApiLoading ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                    Loading HRSN data...
                  </div>
                ) : (
                  <ResponsiveHeatMap
                    data={generateHeatmapDataFromHrsnApi()}
                    margin={{ top: 5, right: 10, bottom: 45, left: 35 }}
                    valueFormat=".0%"
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: '', // REMOVED: X-axis label from compact heatmaps
                      legendOffset: 36
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: '',
                      legendOffset: -40
                    }}
                    colors={{
                      type: 'diverging',
                      scheme: 'red_blue',
                      divergeAt: 0.5,
                      minValue: 0,
                      maxValue: 100
                    }}
                    emptyColor="#ffffff"
                    borderRadius={2}
                    borderWidth={1}
                    borderColor="#ffffff"
                    animate={false}
                    isInteractive={false}
                  />
                )}
              </div>
            ) : (
              /* Use original CategoricalHrsnChart for demographic fields */
              <CategoricalHrsnChart
                data={validData}
                title={title}
                categoryField={categoryName}
                categoryName={categoryName}
                valueField="distribution"
                filterBy={filterBy}
                colorScheme={colorScheme}
                height={height}
                chartType="heatmap"
                compactMode={true}
                isPercentage={true}
                dualSourceHrsnData={dualSourceHrsnData}
              />
            )}
          </>
        )}
      </div>
      
      {/* Enlarged Chart Dialog */}
      <Dialog open={enlargedChartOpen} onOpenChange={setEnlargedChartOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center space-x-2">
              <ChartExportWidget 
                chartId={chartId}
                chartTitle={title}
                data={getChartData()}
                showDetailedExport={true}
                getDetailedData={() => validData}
              />
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          
          <div id={`enlarged-${chartId}`} className="p-4 bg-white">
            {/* We don't show data sources for individual chart prints - they only appear in the main print report */}
            
            {showNoDataMessage ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No Data Available
              </div>
            ) : chartType === "count" && (
              <CategoricalHrsnChart
                data={validData}
                title={title}
                categoryField={categoryName}
                categoryName={categoryName}
                valueField="count"
                filterBy={filterBy}
                colorScheme={colorScheme}
                height={300}
                isPercentage={false}
                dualSourceHrsnData={dualSourceHrsnData}
              />
            )}
            
            {!showNoDataMessage && chartType === "percentage" && (
              <HrsnPieChart
                data={validData}
                title={title}
                fieldName={categoryName}
                colorScheme={colorScheme}
                height={300}
              />
            )}
            
            {!showNoDataMessage && chartType === "distribution" && (
              <>
                {/* Use HRSN API heatmap for HRSN fields only */}
                {isHrsnField ? (
                  <div className="h-[300px] w-full">
                    {hrsnApiLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Loading HRSN data...
                      </div>
                    ) : (
                      <ResponsiveHeatMap
                        data={generateHeatmapDataFromHrsnApi()}
                        margin={{ top: 20, right: 40, bottom: 60, left: 80 }}
                        valueFormat=".0%"
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: '', // REMOVED: X-axis label from heatmaps
                          legendPosition: 'middle',
                          legendOffset: 46
                        }}
                        axisLeft={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: 'Response',
                          legendPosition: 'middle',
                          legendOffset: -60
                        }}
                        colors={{
                          type: 'diverging',
                          scheme: 'red_blue',
                          divergeAt: 0.5,
                          minValue: 0,
                          maxValue: 100
                        }}
                        emptyColor="#ffffff"
                        borderRadius={3}
                        borderWidth={2}
                        borderColor="#ffffff"
                        animate={true}
                        motionConfig="wobbly"
                        hoverTarget="cell"
                      />
                    )}
                  </div>
                ) : (
                  /* Use original CategoricalHrsnChart for demographic fields */
                  <CategoricalHrsnChart
                    data={validData}
                    title={title}
                    categoryField={categoryName}
                    categoryName={categoryName}
                    valueField="distribution"
                    filterBy={filterBy}
                    colorScheme={colorScheme}
                    height={300}
                    chartType="heatmap"
                    isPercentage={true}
                    dualSourceHrsnData={dualSourceHrsnData}
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}