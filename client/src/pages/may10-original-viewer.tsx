import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * This page allows viewing the original May 10th population health charts
 * without trying to run the problematic code directly.
 */
export default function May10OriginalViewer() {
  // Get visualization data from the server
  const { data, error, isLoading } = useQuery({
    queryKey: ['/api/patients-with-symptoms'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 bg-white rounded-lg p-4 shadow-md">
        <h1 className="text-2xl font-bold mb-2">May 10th Original Version</h1>
        <p className="text-gray-600 mb-2">
          This is a page that shows snapshots of the original May 10th version (according to SESSION_SUMMARY_05_10_2025.md).
        </p>
        <ul className="text-sm text-gray-500 list-disc pl-4">
          <li>Shows components from the May 10th standardized controlling file</li>
          <li>Uses screenshots to avoid syntax errors</li>
          <li>You can view the source code</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>May 10th Population Health Grid</CardTitle>
            <CardDescription>Original grid layout from the May 10th session summary (using May 9th standardized file)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading data...</span>
              </div>
            ) : (
              <div>
                <img 
                  src="/attached_assets/image_1747186044857.png" 
                  alt="May 10th Population Health Grid"
                  className="w-full rounded-md shadow-sm border border-gray-200"
                />
                <p className="text-sm text-gray-500 mt-2">
                  This is the grid layout with all charts from May 10th.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => window.history.back()}>
              Back
            </Button>
            <Button 
              className="ml-2" 
              onClick={() => window.open('/client/src/components/population-health-charts-controlling-file-05_09_25.tsx.original', '_blank')}
            >
              View Source Code
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>May 10th Features</CardTitle>
            <CardDescription>Key features in the May 10th version</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading data...</span>
              </div>
            ) : (
              <div className="w-full">
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h3 className="font-semibold text-lg mb-2">May 10th Version Features</h3>
                  <ul className="list-disc space-y-2 pl-6">
                    <li>Radio button navigation between Individual Search and Population Health</li>
                    <li>Dropdown filters all appearing on a single line</li>
                    <li>Alphabetically sorted filter values</li>
                    <li>Charts at 25% of original size (75px height)</li>
                    <li>Minimal padding, dark/bold text</li>
                    <li>Compact mode with standardized chart types</li>
                  </ul>
                </div>
                <div className="bg-amber-50 p-4 rounded-md border-l-4 border-amber-500">
                  <h3 className="font-semibold text-amber-800 mb-1">Important Note</h3>
                  <p className="text-amber-700 text-sm">
                    The May 10th file has several syntax errors that prevent it from rendering directly. We're providing a snapshot view here, and working on a fixed version that preserves all the key features.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline" onClick={() => window.location.href = '/population-health'}>
              Go to Current Version
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}