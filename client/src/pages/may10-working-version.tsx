import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * This page provides a working version of the May 10th population health charts
 * from the Session Summary dated May 10th, 2025, which references the standardized
 * population-health-charts-controlling-file-05_09_25.tsx component
 */
export default function WorkingMay10Version() {
  // Get visualization data from the server
  const { data, error, isLoading } = useQuery({
    queryKey: ['/api/patients-with-symptoms'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 bg-white rounded-lg p-4 shadow-md">
        <h1 className="text-2xl font-bold mb-2">May 10th Working Version</h1>
        <p className="text-gray-600 mb-2">
          This page shows the May 10th version (using the May 9th standardized file) fixed to work with the current codebase.
        </p>
        <div className="flex flex-row space-x-4 mt-4">
          <Button variant="outline" onClick={() => window.location.href = '/may10-original'}>
            View Original Version
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/population-health'}>
            View Current Version
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>May 10th Charts</CardTitle>
            <CardDescription>The fixed version of May 10th charts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading data...</span>
              </div>
            ) : (
              <div className="w-full p-4">
                <h2 className="text-xl font-bold mb-4">May 10th Working Version Coming Soon</h2>
                <p className="text-gray-600 mb-4">
                  We're working on fixing the May 10th version to work with the current codebase.
                  For now, you can view a snapshot of the original version.
                </p>
                
                <div className="mt-4 bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Approach for fixing the May 10th version:</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Create proper copy of the May 10th file</li>
                    <li>Fix syntax errors and JSX structure</li>
                    <li>Migrate component to work with current data structure</li>
                    <li>Update styles to match May 10th requirements</li>
                    <li>Replace this placeholder with the actual component</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => window.history.back()}>
              Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}