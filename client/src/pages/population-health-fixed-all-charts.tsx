import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PopulationHealthCharts from '@/components/population-health-charts-controlling-file-05_12_25_fixed';
import { useToast } from '@/hooks/use-toast';

export default function PopulationHealthFixedAllCharts() {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const { toast } = useToast();

  // Fetch visualization data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 60 * 1000, // 1 minute
  });

  // Handle errors in data loading
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error loading data',
        description: 'There was a problem loading the visualization data.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Handle display mode toggle
  const handleDisplayModeChange = (mode: 'count' | 'percentage') => {
    console.log(`Parent: Changing display mode to ${mode}`);
    setDisplayMode(mode);
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center mb-6">
        <h1 className="text-3xl font-bold">Population Health Analytics</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              {/* Main charts with common display mode control */}
              <PopulationHealthCharts 
                data={data} 
                isLoading={isLoading} 
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Detailed Analytics</h2>
                <p className="text-muted-foreground">
                  This tab will contain more detailed analytics views in the future.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}