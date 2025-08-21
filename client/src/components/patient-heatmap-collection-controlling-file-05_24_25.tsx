// Last updated: May 24, 2025 - 8:35 PM
// Controls component: PatientHeatmapCollection - used for collection of patient heatmap visualizations
// Enhanced with full-screen landscape view for heatmaps

import React, { useState } from 'react';
import SimpleHeatmap from './SimpleHeatmap';
import CategoricalHrsnChart from './categorical-hrsn-chart-05_13_25';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Add a console log to confirm this file is being loaded
console.log("Updated PatientHeatmapCollection controlling file loaded with fullscreen landscape view at", new Date().toLocaleTimeString());

interface PatientHeatmapCollectionProps {
  initialPatientId?: string;
}

const PatientHeatmapCollection: React.FC<PatientHeatmapCollectionProps> = ({ 
  initialPatientId = '1' 
}) => {
  const [patientId, setPatientId] = useState<string>(initialPatientId);
  const [inputPatientId, setInputPatientId] = useState<string>(initialPatientId);

  const handlePatientIdChange = (value: string) => {
    setInputPatientId(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientId(inputPatientId);
  };

  const handleQuickSelect = (id: string) => {
    setInputPatientId(id);
    setPatientId(id);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Patient Heatmap Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex-1">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                value={inputPatientId}
                onChange={(e) => handlePatientIdChange(e.target.value)}
                placeholder="Enter patient ID"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Generate Heatmaps</Button>
            </div>
          </form>
          
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Quick select:</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={patientId === '1' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleQuickSelect('1')}
              >
                Patient 1
              </Button>
              <Button 
                variant={patientId === '10' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleQuickSelect('10')}
              >
                Patient 10
              </Button>
              <Button 
                variant={patientId === '100' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleQuickSelect('100')}
              >
                Patient 100
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="heatmaps" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="heatmaps">Heatmaps</TabsTrigger>
          <TabsTrigger value="pivot-tables">Pivot Tables</TabsTrigger>
        </TabsList>
        
        <TabsContent value="heatmaps" className="space-y-6">
          <h2 className="text-2xl font-bold mt-4">Patient ID: {patientId}</h2>
          
          <SimpleHeatmap
            patientId={patientId}
            dataType="symptoms"
            title="Patient Symptoms - Heatmap Visualization"
            description="Visualization of symptom occurrences over time"
          />
          
          <SimpleHeatmap
            patientId={patientId}
            dataType="diagnoses"
            title="Diagnosis Heatmap"
            description="Visualization of diagnosis occurrences over time"
          />
          
          <SimpleHeatmap
            patientId={patientId}
            dataType="diagnosticCategories"
            title="Diagnostic Category Heatmap"
            description="Visualization of diagnostic category occurrences over time"
          />
          
          {/* Using dedicated HRSN heatmap component for better debugging */}
          <div className="mb-2 p-2 border border-amber-200 bg-amber-50 rounded text-xs">
            Using specialized HRSN Z-Code heatmap component...
          </div>
          <CategoricalHrsnChart
            data={[]}
            title="HRSN Distribution"
            categoryName="housing_insecurity"
            colorScheme="blue"
            height={220}
            filterBy={{}}
          />
        </TabsContent>
        
        <TabsContent value="pivot-tables">
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Pivot Tables for Patient ID: {patientId}</h2>
            <p className="mb-6">View the raw pivot tables for this patient</p>
            <a 
              href={`/direct/${patientId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Open Pivot Tables
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientHeatmapCollection;