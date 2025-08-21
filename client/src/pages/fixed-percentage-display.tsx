// Fixed Percentage Display - May 21, 2025
// A demonstration page for the fixed percentage display component

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import PercentageDisplayFix from '@/components/percentage-display-fix';

export default function FixedPercentageDisplay() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch visualization data with React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 60 * 1000, // 1 minute
  });

  // Handle fetch errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading data",
        description: "We couldn't fetch the visualization data. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Extract data for the charts
  const hrsnIndicatorData = data?.hrsnIndicatorData || [];
  const diagnosisData = data?.diagnosisData || [];
  const symptomIDData = data?.symptomIDData || [];
  const diagnosticCategoryData = data?.diagnosticCategoryData || [];
  const riskStratificationData = data?.riskStratificationData || [];
  const symptomSegmentData = data?.symptomSegmentData || [];

  // Loading state
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Fixed Percentage Display Demo</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Fixed Percentage Display Demo</h1>
          <p className="text-muted-foreground mt-1">
            Showing charts with correctly implemented percentage display
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* HRSN Indicators Chart */}
        <PercentageDisplayFix
          data={hrsnIndicatorData}
          title="HRSN Indicators"
          description={`${hrsnIndicatorData.length} indicators from ${data?.patients?.length || 0} patients`}
        />
        
        {/* Diagnosis Chart */}
        <PercentageDisplayFix
          data={diagnosisData}
          title="Diagnosis Distribution"
          description={`${diagnosisData.length} diagnoses from ${data?.patients?.length || 0} patients`}
        />
        
        {/* Symptom ID Chart */}
        <PercentageDisplayFix
          data={symptomIDData}
          title="Symptom ID Distribution"
          description={`${symptomIDData.length} symptom types from ${data?.patients?.length || 0} patients`}
        />
        
        {/* Diagnostic Category Chart */}
        <PercentageDisplayFix
          data={diagnosticCategoryData}
          title="Diagnostic Categories"
          description={`${diagnosticCategoryData.length} categories from ${data?.patients?.length || 0} patients`}
        />
      </div>
      
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Implementation Notes</h3>
            <p className="mb-2">This demo page shows the fixed version of percentage display that:</p>
            <ul className="list-disc list-inside space-y-1 mb-4">
              <li>Properly calculates percentages based on total values</li>
              <li>Correctly formats the display with % symbols</li>
              <li>Shows both raw counts and percentages in tooltips</li>
              <li>Allows toggling between count and percentage modes</li>
            </ul>
            <p>The fix handles both data processing and display formatting to ensure correct visualization of percentages.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}