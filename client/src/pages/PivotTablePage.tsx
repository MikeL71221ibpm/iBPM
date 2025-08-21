import React, { useState, useEffect } from 'react';
import { apiRequest } from "@/lib/queryClient";
import DirectPivotDisplay from '../components/DirectPivotDisplay';
import { ExtractedSymptom } from '../components/DataProcessing';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

const PivotTablePage: React.FC = () => {
  const [patientId, setPatientId] = useState<string>("1"); // Default to Patient 1
  const [symptoms, setSymptoms] = useState<ExtractedSymptom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSymptoms = async () => {
    if (!patientId) {
      toast({
        title: "Patient ID Required",
        description: "Please enter a patient ID to fetch data",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/extract-symptoms", {
        patientIds: [patientId],
        useAllDates: true
      });

      if (!response.ok) {
        throw new Error("Failed to fetch symptoms");
      }

      const data = await response.json();
      
      // Extract symptoms from the response
      let symptomData: ExtractedSymptom[] = [];
      if (data.symptoms && Array.isArray(data.symptoms)) {
        symptomData = data.symptoms;
      } else if (data.extractedSymptoms && Array.isArray(data.extractedSymptoms)) {
        symptomData = data.extractedSymptoms;
      } else if (data.results && Array.isArray(data.results)) {
        symptomData = data.results;
      } else if (Array.isArray(data)) {
        symptomData = data;
      }

      setSymptoms(symptomData);
      
      toast({
        title: "Data Loaded",
        description: `Loaded ${symptomData.length} symptoms for Patient ID: ${patientId}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch symptoms",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on load
  useEffect(() => {
    fetchSymptoms();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pivot Table Inspection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Enter Patient ID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="max-w-[200px]"
            />
            <Button 
              onClick={fetchSymptoms}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Fetch Symptoms"}
            </Button>
          </div>

          {symptoms.length > 0 ? (
            <div>
              <p className="mb-4 text-sm bg-blue-50 p-2 rounded">
                Found {symptoms.length} symptoms for Patient ID: {patientId}
              </p>
              
              <DirectPivotDisplay symptoms={symptoms} />
            </div>
          ) : (
            <div className="p-12 text-center">
              {isLoading ? (
                <p>Loading data...</p>
              ) : (
                <p>No symptoms found. Enter a patient ID and click "Fetch Symptoms".</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PivotTablePage;