import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart4 } from 'lucide-react';
import PivotTableParser from '@/components/PivotTableParser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VisualizerPage: React.FC = () => {
  const [, setLocation] = useLocation();
  
  // Define sample data for each type of visualization
  const sampleSymptomData = `Symptom Tracking Over Time Heatmap
1/1/24 1/22/24 1/29/24 2/5/24 2/12/24 2/19/24 2/26/24 3/11/24 3/18/24 4/22/24 5/6/24 5/13/24 5/20/24 6/3/24 7/8/24 7/22/24 7/29/24 8/5/24 8/12/24 8/26/24 9/2/24 9/9/24 9/16/24 9/30/24 10/7/24 10/21/24 11/4/24 12/16/24 1/20/25 1/27/25 2/10/25 3/3/25 3/24/25 3/31/25 4/7/25
Unknown 6 4 13 19 8 11 6 16 2 7 16 5 3 5 4 6 5 3 6 11 6 19 24 14 7 6 2 13 7 5 19 11 11 26 4`;

  const sampleDiagnosisData = `Diagnosis Tracking Over Time Heatmap
1/1/24 1/22/24 1/29/24 2/5/24 2/12/24 2/19/24 2/26/24 3/11/24 3/18/24 4/22/24 5/6/24 5/13/24 5/20/24 6/3/24 7/8/24 7/22/24 7/29/24 8/5/24 8/12/24 8/26/24 9/2/24 9/9/24 9/16/24 9/30/24 10/7/24 10/21/24 11/4/24 12/16/24 1/20/25 1/27/25 2/10/25 3/3/25 3/24/25 3/31/25 4/7/25
Persistent Depressive Disorder 2    1   3    1     1   7 2 1   1 2  3 3  7 
Major Depressive Disorder 2      1  3    1    3   6 3  1  1   7 2 2 6 
Panic Disorder   1 1             1   1            
Post-Traumatic Stress Disorder   2 3   1 2      1  1    3 3       1  1  1  
Antisocial Personality Disorder   1                               
Bipolar II Disorder   1    1    1               1    
Hallucinogen Use Disorder    1  3    2     1    1 1 1 2  1 1      2 `;

  const sampleDiagnosticCategoryData = `Diagnostic Category Tracking Over Time Heatmap
1/1/24 1/22/24 1/29/24 2/5/24 2/12/24 2/19/24 2/26/24 3/11/24 3/18/24 4/22/24 5/6/24 5/13/24 5/20/24 6/3/24 7/8/24 7/22/24 7/29/24 8/5/24 8/12/24 8/26/24 9/2/24 9/9/24 9/16/24 9/30/24 10/7/24 10/21/24 11/4/24 12/16/24 1/20/25 1/27/25 2/10/25 3/3/25 3/24/25 3/31/25 4/7/25
Depressive Disorders 5 0 6 9 7 1 2 9 1 13 7 2 6 4 2 0 2 0 3 12 4 27 13 6 2 3 2 4 17 9 7 24 
Anxiety Disorders 0 1 5 7 2 4 1 3 0 0 4 1 0 2 2 1 0 1 2 8 5 10 2 0 2 0 1 1 1 2 0 4 
Bipolar Disorders 0 0 3 3 0 0 0 2 0 0 0 0 1 0 0 0 0 0 0 4 0 0 0 1 0 0 0 1 0 1 0 0 
Substance-Related Disorders 0 0 5 6 12 10 2 2 0 14 6 1 2 3 4 0 0 0 0 8 6 12 7 3 4 2 0 4 0 0 2 5
Trauma-Related Disorders 0 0 2 3 0 0 0 2 0 0 0 0 0 1 0 1 0 0 0 3 3 0 0 0 0 1 0 1 0 1 0 0
Obsessive-Compulsive Disorders 1 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0`;

  const sampleHrsnData = `HRSN/Social Needs Tracking Over Time Heatmap
1/1/24 1/22/24 1/29/24 2/5/24 2/12/24 2/19/24 2/26/24 3/11/24 3/18/24 4/22/24 5/6/24 5/13/24 5/20/24 6/3/24 7/8/24 7/22/24 7/29/24 8/5/24 8/12/24 8/26/24 9/2/24 9/9/24 9/16/24 9/30/24 10/7/24 10/21/24 11/4/24 12/16/24 1/20/25 1/27/25 2/10/25 3/3/25 3/24/25 3/31/25 4/7/25
Safety/General Safety        1         1   2        
Safety/Child abuse                     2         
Safety/Intimate partner violence                       4        
Safety/Neighborhood safety                       2        
Social connections / isolation                      1         `;

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="p-0 mr-4"
          onClick={() => setLocation('/')}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Back</span>
        </Button>
        <h1 className="text-3xl font-bold">Visualization Tools</h1>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart4 className="mr-2 h-5 w-5" />
              <span>Pivot Table Visualizer</span>
            </CardTitle>
            <CardDescription>
              Transform pivot tables into interactive visualizations. Copy and paste your pivot table data to generate heatmaps and bubble charts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="symptoms">
              <TabsList className="mb-4">
                <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
                <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="hrsn">HRSN</TabsTrigger>
              </TabsList>
              
              <TabsContent value="symptoms">
                <PivotTableParser 
                  defaultData={sampleSymptomData}
                  initialTitle="Symptom Tracking Over Time"
                  colorScheme="blue"
                />
              </TabsContent>
              
              <TabsContent value="diagnoses">
                <PivotTableParser 
                  defaultData={sampleDiagnosisData}
                  initialTitle="Diagnosis Tracking Over Time"
                  colorScheme="red"
                />
              </TabsContent>
              
              <TabsContent value="categories">
                <PivotTableParser 
                  defaultData={sampleDiagnosticCategoryData}
                  initialTitle="Diagnostic Category Tracking"
                  colorScheme="green"
                />
              </TabsContent>
              
              <TabsContent value="hrsn">
                <PivotTableParser 
                  defaultData={sampleHrsnData}
                  initialTitle="HRSN/Social Needs Tracking"
                  colorScheme="amber"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisualizerPage;