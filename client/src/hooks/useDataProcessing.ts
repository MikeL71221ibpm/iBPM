import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ExtractedSymptom } from "@shared/schema";

export const useDataProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<{
    extractedCount: number;
    results: ExtractedSymptom[];
  } | null>(null);
  
  const { toast } = useToast();
  
  const extractSymptoms = async (
    patientIds: string[], 
    dateRange?: { startDate: string; endDate: string }
  ) => {
    setIsProcessing(true);
    
    try {
      const response = await apiRequest('POST', '/api/extract-symptoms', {
        patientIds,
        ...dateRange
      });
      
      const result = await response.json();
      
      setProcessingResults({
        extractedCount: result.extractedCount,
        results: result.results
      });
      
      toast({
        title: "Processing complete",
        description: `Found ${result.extractedCount} symptom mentions.`
      });
      
      return result.results;
    } catch (error: any) {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to extract symptoms",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getVisualizationData = async (
    patientIds: string[],
    visualizationType: string,
    dateRange?: { startDate: string; endDate: string }
  ) => {
    try {
      const response = await apiRequest('POST', '/api/visualization-data', {
        patientIds,
        visualizationType,
        ...dateRange
      });
      
      const result = await response.json();
      return result.data;
    } catch (error: any) {
      toast({
        title: "Failed to get visualization data",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
      return [];
    }
  };
  
  return {
    extractSymptoms,
    getVisualizationData,
    isProcessing,
    processingResults
  };
};
