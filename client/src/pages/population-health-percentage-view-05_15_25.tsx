import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PercentageBarChart from "@/components/population-health-percentage-charts-fixed";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  RadioGroup, 
  RadioGroupItem 
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function PopulationHealthPercentageView() {
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  
  // Fetch data from the API
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/visualization-data"],
  });
  
  // Set total patients for accurate percentage calculations
  const totalPatients = data?.patients?.length || 24;
  
  // Diagnostic Category Chart Data
  const diagnosticCategoryData = data?.diagnosticCategoryData || [];
  
  // Symptom ID (Diagnosis) Chart Data  
  const symptomIDData = data?.symptomIDData || [];
  
  // Housing Status Chart Data
  const housingData = data?.hrsnIndicatorData?.filter((item: any) => 
    item.category === "Housing"
  ) || [];
  
  // Food Status Chart Data
  const foodData = data?.hrsnIndicatorData?.filter((item: any) => 
    item.category === "Food"
  ) || [];
  
  // Financial Status Chart Data  
  const financialData = data?.hrsnIndicatorData?.filter((item: any) => 
    item.category === "Financial"
  ) || [];
  
  // Transportation Status Chart Data
  const transportationData = data?.hrsnIndicatorData?.filter((item: any) => 
    item.category === "Transportation"
  ) || [];
  
  // Risk Stratification Chart Data
  const riskData = data?.riskStratificationData || [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Population Health Dashboard</h1>
      
      <div className="mb-6">
        <RadioGroup 
          className="flex space-x-4" 
          defaultValue="count"
          onValueChange={(value) => setDisplayMode(value as "count" | "percentage")}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="count" id="count" />
            <Label htmlFor="count">Count View</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percentage" id="percentage" />
            <Label htmlFor="percentage">Percentage View</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Stratification */}
        <Card>
          <CardContent className="pt-6">
            <PercentageBarChart
              data={riskData}
              title="Risk Stratification"
              displayMode={displayMode}
              totalPatients={totalPatients}
            />
          </CardContent>
        </Card>
        
        {/* Diagnostic Categories */}
        <Card>
          <CardContent className="pt-6">
            <PercentageBarChart
              data={diagnosticCategoryData}
              title="Diagnostic Categories"
              displayMode={displayMode}
              totalPatients={totalPatients}
            />
          </CardContent>
        </Card>
        
        {/* Diagnoses/ICD-10 Codes */}
        <Card>
          <CardContent className="pt-6">
            <PercentageBarChart
              data={symptomIDData}
              title="Diagnoses/ICD-10 Codes"
              displayMode={displayMode}
              totalPatients={totalPatients}
            />
          </CardContent>
        </Card>
        
        {/* HRSN Indicators Tab Group */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="housing">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="housing">Housing</TabsTrigger>
                <TabsTrigger value="food">Food</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="transport">Transport</TabsTrigger>
              </TabsList>
              
              <TabsContent value="housing">
                <PercentageBarChart
                  data={housingData}
                  title="Housing Status"
                  displayMode={displayMode}
                  totalPatients={totalPatients}
                />
              </TabsContent>
              
              <TabsContent value="food">
                <PercentageBarChart
                  data={foodData}
                  title="Food Security Status"
                  displayMode={displayMode}
                  totalPatients={totalPatients}
                />
              </TabsContent>
              
              <TabsContent value="financial">
                <PercentageBarChart
                  data={financialData}
                  title="Financial Status"
                  displayMode={displayMode}
                  totalPatients={totalPatients}
                />
              </TabsContent>
              
              <TabsContent value="transport">
                <PercentageBarChart
                  data={transportationData}
                  title="Transportation Status"
                  displayMode={displayMode}
                  totalPatients={totalPatients}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}