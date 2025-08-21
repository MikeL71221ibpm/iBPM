import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import SimplePopulationHealthMay10 from "@/components/simple-population-health-may10";
import OriginalMay7PopulationHealth from "@/components/original-may7-population-health";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function May10TestPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState<string>("may10");

  // Get visualization data from the server
  const { data, error, isLoading: queryLoading } = useQuery({
    queryKey: ["/api/visualization-data"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setIsLoading(queryLoading);
  }, [queryLoading]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching visualization data:", error);
      toast({
        title: "Error fetching data",
        description: "Unable to load visualization data. Please refresh and try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (data && data.patients) {
      console.log(`Using real patient data: ${data.patients.length} patients`);
    }
  }, [data]);

  console.log("May 10 Test Page - Received data:", data);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 bg-white rounded-lg p-4 shadow-md">
        <h1 className="text-2xl font-bold mb-2">Chart Version Comparison</h1>
        <p className="text-gray-600 mb-4">
          This page allows you to compare the May 10th population health charts with the restored 
          May 7th version to evaluate differences in layout, styling, and functionality.
        </p>
        
        {/* Version selector */}
        <div className="mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-md">Select Version to Display</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={version}
                onValueChange={setVersion}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="may10" id="may10" />
                  <Label htmlFor="may10">May 10th Version</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="may7" id="may7" />
                  <Label htmlFor="may7">May 7th Restored Version</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {version === "may10" ? (
            <SimplePopulationHealthMay10 data={data} isLoading={false} />
          ) : (
            <OriginalMay7PopulationHealth data={data} isLoading={false} />
          )}
        </>
      )}
    </div>
  );
}