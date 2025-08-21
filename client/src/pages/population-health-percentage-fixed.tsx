import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart4, PieChart, Activity } from "lucide-react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

/**
 * Population Health Dashboard with fixed percentage toggle view
 * This provides a simplified implementation that doesn't require external components
 */
export default function PopulationHealthPercentageFixed() {
  // State for dropdowns
  const [selectedSymptom, setSelectedSymptom] = useState<string>("");
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("");
  const [selectedDiagnosticCategory, setSelectedDiagnosticCategory] = useState<string>("");
  const [selectedIcd10Code, setSelectedIcd10Code] = useState<string>("");
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const [colorTheme, setColorTheme] = useState<string>("blues");
  
  // Fetch data
  const { data: allData, isLoading: isLoadingData } = useQuery({
    queryKey: ['/api/patients-with-symptoms'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch symptoms list for dropdown
  const { data: symptomsData, isLoading: isLoadingSymptoms } = useQuery({
    queryKey: ['/api/symptoms/list'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch diagnoses list for dropdown
  const { data: diagnosesData, isLoading: isLoadingDiagnoses } = useQuery({
    queryKey: ['/api/diagnoses/list'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch diagnostic categories list for dropdown
  const { data: diagnosticCategoriesData, isLoading: isLoadingDiagnosticCategories } = useQuery({
    queryKey: ['/api/diagnostic-categories/list'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch ICD-10 codes list for dropdown
  const { data: icd10CodesData, isLoading: isLoadingIcd10Codes } = useQuery({
    queryKey: ['/api/icd10-codes/list'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Get visualization data with filters applied
  const { data: visualizationData, isLoading: isLoadingVisualization } = useQuery({
    queryKey: ['/api/visualization-data', selectedSymptom, selectedDiagnosis, selectedDiagnosticCategory, selectedIcd10Code],
    staleTime: 5 * 60 * 1000,
  });

  // Apply percentage transformation to visualization data
  const transformedData = React.useMemo(() => {
    if (!visualizationData) return null;
    
    if (displayMode === 'count') {
      return visualizationData;
    }
    
    // Helper function to transform array data to percentage
    const transformArrayToPercentage = (array: any[]) => {
      if (!array || array.length === 0) return array;
      
      const total = array.reduce((sum, item) => sum + (item.value || 0), 0);
      if (total === 0) return array;
      
      return array.map(item => ({
        ...item,
        rawValue: item.value || 0,
        percentage: Math.round(((item.value || 0) / total) * 100),
        // Replace value with percentage for display
        value: Math.round(((item.value || 0) / total) * 100)
      }));
    };
    
    // Create a deep copy to avoid modifying original data
    const transformed = JSON.parse(JSON.stringify(visualizationData));
    
    // Transform risk stratification data
    if (transformed.riskStratificationData) {
      transformed.riskStratificationData = transformArrayToPercentage(transformed.riskStratificationData);
    }
    
    // Transform symptom ID data
    if (transformed.symptomIDData) {
      transformed.symptomIDData = transformArrayToPercentage(transformed.symptomIDData);
    }
    
    // Transform diagnostic category data
    if (transformed.diagnosticCategoryData) {
      transformed.diagnosticCategoryData = transformArrayToPercentage(transformed.diagnosticCategoryData);
    }
    
    return transformed;
  }, [visualizationData, displayMode]);

  // Format label based on display mode
  const formatLabel = (d: any) => {
    if (displayMode === 'percentage') {
      if (typeof d.percentage === 'number') {
        return `${d.percentage}%`;
      }
      return `${d.value}%`;
    }
    return `${d.value || 0}`;
  };

  // Format tooltip based on display mode
  const formatTooltip = ({ id, value, color, data }: any) => (
    <div
      style={{
        background: 'white',
        padding: '9px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        color: '#333',
      }}
    >
      <div style={{ color }}>
        <strong>{id}</strong>
      </div>
      {displayMode === 'percentage' ? (
        <div>
          <span>{value}%</span>
          <span> ({data.rawValue || 0} records)</span>
        </div>
      ) : (
        <div>
          <span>{value} records</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto my-4 pb-8">
      <h1 className="text-2xl font-bold mb-4">Population Health Analytics (Fixed Percentage)</h1>
      <p className="text-muted-foreground mb-6">
        Analyze population health trends with correct percentage toggle handling
      </p>
      
      {/* Filter and display controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium mb-1">Symptom</label>
            <Select value={selectedSymptom} onValueChange={setSelectedSymptom}>
              <SelectTrigger>
                <SelectValue placeholder="All Symptoms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Symptoms</SelectItem>
                {symptomsData?.symptoms?.map((symptom: string) => (
                  <SelectItem key={symptom} value={symptom}>
                    {symptom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium mb-1">Diagnosis</label>
            <Select value={selectedDiagnosis} onValueChange={setSelectedDiagnosis}>
              <SelectTrigger>
                <SelectValue placeholder="All Diagnoses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Diagnoses</SelectItem>
                {diagnosesData?.diagnoses?.map((diagnosis: string) => (
                  <SelectItem key={diagnosis} value={diagnosis}>
                    {diagnosis}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium mb-1">Diagnostic Category</label>
            <Select 
              value={selectedDiagnosticCategory} 
              onValueChange={setSelectedDiagnosticCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {diagnosticCategoriesData?.categories?.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium mb-1">ICD-10 Code</label>
            <Select value={selectedIcd10Code} onValueChange={setSelectedIcd10Code}>
              <SelectTrigger>
                <SelectValue placeholder="All Codes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Codes</SelectItem>
                {icd10CodesData?.codes?.map((code: string) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium mb-1">Display Mode</label>
            <div className="flex gap-2">
              <Button 
                variant={displayMode === 'count' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setDisplayMode('count')}
              >
                Count
              </Button>
              <Button 
                variant={displayMode === 'percentage' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setDisplayMode('percentage')}
              >
                %
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Loading state */}
      {(isLoadingData || isLoadingVisualization) && (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading visualization data...</span>
        </div>
      )}
      
      {/* Main visualization */}
      {!isLoadingData && !isLoadingVisualization && transformedData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Stratification Chart */}
          {transformedData.riskStratificationData && (
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-primary" />
                    Risk Stratification
                  </div>
                </CardTitle>
                <CardDescription>
                  Distribution of patients by risk level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveBar
                    data={transformedData.riskStratificationData}
                    keys={['value']}
                    indexBy="id"
                    margin={{ top: 10, right: 10, bottom: 50, left: 60 }}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    colors={{ scheme: colorTheme }}
                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: 'Risk Level',
                      legendPosition: 'middle',
                      legendOffset: 36
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: displayMode === 'percentage' ? 'Percentage' : 'Patients',
                      legendPosition: 'middle',
                      legendOffset: -50
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    enableLabel={true}
                    label={formatLabel}
                    tooltip={formatTooltip}
                    role="application"
                    ariaLabel="Risk stratification chart"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Diagnostic Categories Chart */}
          {transformedData.diagnosticCategoryData && (
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart4 className="w-5 h-5 mr-2 text-primary" />
                    Diagnostic Categories
                  </div>
                </CardTitle>
                <CardDescription>
                  Distribution of patients by diagnostic category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveBar
                    data={transformedData.diagnosticCategoryData}
                    keys={['value']}
                    indexBy="id"
                    margin={{ top: 10, right: 10, bottom: 50, left: 60 }}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    colors={{ scheme: colorTheme }}
                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: -45,
                      legend: 'Diagnostic Category',
                      legendPosition: 'middle',
                      legendOffset: 36
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: displayMode === 'percentage' ? 'Percentage' : 'Patients',
                      legendPosition: 'middle',
                      legendOffset: -50
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    enableLabel={true}
                    label={formatLabel}
                    tooltip={formatTooltip}
                    role="application"
                    ariaLabel="Diagnostic categories chart"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}