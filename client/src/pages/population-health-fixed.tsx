import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PopulationHealthCharts from "@/components/population-health-charts-fixed";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

/**
 * Fixed version of Population Health Dashboard with working percentage toggle
 * This component applies proper data transformation for percentage display
 */
export default function PopulationHealthFixed() {
  // State for dropdowns
  const [selectedSymptom, setSelectedSymptom] = useState<string>("");
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("");
  const [selectedDiagnosticCategory, setSelectedDiagnosticCategory] = useState<string>("");
  const [selectedIcd10Code, setSelectedIcd10Code] = useState<string>("");
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const [colorTheme, setColorTheme] = useState<string>(localStorage.getItem('globalChartTheme') || 'vivid');
  
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
  const { data: visualizationChartData, isLoading: isLoadingVisualization, refetch: runVisualization } = useQuery({
    queryKey: ['/api/visualization-data', selectedSymptom, selectedDiagnosis, selectedDiagnosticCategory, selectedIcd10Code],
    staleTime: 5 * 60 * 1000,
  });

  // Apply percentage transformation to visualization data
  const transformedData = React.useMemo(() => {
    if (!visualizationChartData) return null;
    
    if (displayMode === 'count') {
      return visualizationChartData;
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
    const transformedData = JSON.parse(JSON.stringify(visualizationChartData));
    
    // Transform each dataset
    if (transformedData.riskStratificationData) {
      transformedData.riskStratificationData = transformArrayToPercentage(transformedData.riskStratificationData);
    }
    
    if (transformedData.symptomIDData) {
      transformedData.symptomIDData = transformArrayToPercentage(transformedData.symptomIDData);
    }
    
    if (transformedData.diagnosticCategoryData) {
      transformedData.diagnosticCategoryData = transformArrayToPercentage(transformedData.diagnosticCategoryData);
    }
    
    // Handle HRSN indicator data (nested structure)
    if (transformedData.hrsnIndicatorData) {
      transformedData.hrsnIndicatorData.forEach((category: any) => {
        if (category.indicators && Array.isArray(category.indicators)) {
          const total = category.indicators.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
          if (total > 0) {
            category.indicators = category.indicators.map((item: any) => ({
              ...item,
              rawValue: item.value || 0,
              percentage: Math.round(((item.value || 0) / total) * 100),
              value: Math.round(((item.value || 0) / total) * 100)
            }));
          }
        }
      });
    }
    
    return transformedData;
  }, [visualizationChartData, displayMode]);

  return (
    <div className="container mx-auto my-4 pb-8">
      <h1 className="text-2xl font-bold mb-4">Population Health Analytics</h1>
      <p className="text-muted-foreground mb-6">
        Analyze population health trends across all patients with powerful data visualization
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
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Detailed Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <PopulationHealthCharts 
              data={transformedData} 
              isLoading={isLoadingVisualization} 
              displayMode={displayMode}
              colorTheme={colorTheme}
            />
          </TabsContent>
          
          <TabsContent value="details">
            <div className="bg-muted rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Detailed Analysis</h2>
              <p className="text-muted-foreground mb-4">
                Comprehensive data analysis and patient-level insights will be displayed here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}