import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import SimplePopulationHealthMay12 from "@/components/simple-population-health-may12";

export default function May12TestPage() {
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

  console.log("May 12 Test Page - Received data:", data);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 bg-white rounded-lg p-4 shadow-md">
        <h1 className="text-2xl font-bold mb-2">May 12th Version Test Page</h1>
        <p className="text-gray-600 mb-4">
          This is a test page showing a simplified version of the May 12th filtering functionality.
          Use this page to evaluate how filters work in the May 12th version.
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <SimplePopulationHealthMay12 data={data} isLoading={false} />
      )}
    </div>
  );
}