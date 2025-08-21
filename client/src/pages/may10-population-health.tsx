import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
// Import the May 9th component directly - this is the file referenced in the May 10th session
import PopulationHealthChartsMay10 from "@/components/population-health-charts-controlling-file-05_09_25";

export default function May10PopulationHealthPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

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

  console.log("May 10 Population Health Page - Received data:", data);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 bg-white rounded-lg p-4 shadow-md">
        <h1 className="text-2xl font-bold mb-2">May 10th Population Health Version</h1>
        <p className="text-gray-600 mb-4">
          This is the May 10th version of the Population Health Charts component, based on the May 9th standardized file.
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <PopulationHealthChartsMay10 data={data} isLoading={false} />
      )}
    </div>
  );
}