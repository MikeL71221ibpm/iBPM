import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveBar } from '@nivo/bar';
import { Loader2 } from "lucide-react";

interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
}

interface PopulationHealthChartsFixedProps {
  data?: any;
  isLoading?: boolean;
}

export default function PopulationHealthChartsFixed({ 
  data, 
  isLoading 
}: PopulationHealthChartsFixedProps) {
  // Initialize with URL parameter if available
  const getInitialMode = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      return mode === 'percentage' ? 'percentage' : 'count';
    }
    return 'count';
  };

  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>(getInitialMode());
  
  // Simple data transformations for demonstration
  const processHrsnData = (data: any) => {
    if (!data?.hrsnIndicatorData) return [];
    
    return data.hrsnIndicatorData.map((item: any) => {
      const totalPatients = data.patients?.length || 24;
      const percentage = Math.round((item.value / totalPatients) * 100);
      
      return {
        id: item.id,
        value: item.value,
        percentage: percentage
      };
    });
  };

  const hrsnData = processHrsnData(data);
  
  // Toggle handler functions
  const handleCountClick = () => {
    setDisplayMode('count');
  };
  
  const handlePercentageClick = () => {
    setDisplayMode('percentage');
    
    // Store the mode in sessionStorage
    try {
      sessionStorage.setItem('hrsnDisplayMode', 'percentage');
    } catch (e) {
      console.error("Error storing display mode:", e);
    }
    
    // Add URL parameter and reload the page
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'percentage');
    window.location.href = url.toString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex justify-between items-center">
              <div>HRSN Indicators</div>
              <div className="animate-spin"><Loader2 size={18} /></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading data...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            <div>HRSN Indicators</div>
            <div className="flex items-center space-x-1 border rounded-lg overflow-hidden">
              <Button
                variant={displayMode === "count" ? "default" : "outline"}
                size="sm"
                onClick={handleCountClick}
                className="h-7 px-2 text-xs font-semibold"
              >
                Count
              </Button>
              <Button
                variant={displayMode === "percentage" ? "default" : "outline"}
                size="sm"
                onClick={handlePercentageClick}
                className="h-7 px-2 text-xs font-semibold"
              >
                %
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          {hrsnData.length > 0 ? (
            <ResponsiveBar
              data={hrsnData}
              keys={[displayMode === 'percentage' ? 'percentage' : 'value']}
              indexBy="id"
              margin={{ top: 10, right: 10, bottom: 50, left: 60 }}
              padding={0.3}
              layout="horizontal"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'paired' }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: 40
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              role="application"
              ariaLabel="HRSN Indicators Chart"
              barAriaLabel={e => `${e.id}: ${e.formattedValue} ${displayMode === 'percentage' ? '%' : 'patients'}`}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}