// Diagnostic Category Chart With Fixed Percentage Display - May 21, 2025
import React, { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Percent, Hash, Maximize2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import ChartExportWidget from "@/components/chart-export-widget";

interface DiagnosticCategoryChartProps {
  data?: any[];
  title?: string;
  height?: number;
  width?: string;
  className?: string;
  compact?: boolean;
  chartId?: string;
}

export default function DiagnosticCategoryChart({
  data = [],
  title = "Diagnostic Categories",
  height = 400,
  width = "100%",
  className = "",
  compact = false,
  chartId = "diagnostic-categories-chart"
}: DiagnosticCategoryChartProps) {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const [expanded, setExpanded] = useState(false);
  
  // Ensure we have proper data structure
  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    const totalRecords = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return data.map(item => ({
      ...item,
      id: item.id || 'Unknown',
      // Store both raw count and percentage
      rawCount: item.value || 0,
      percentage: totalRecords > 0 ? Math.round((item.value / totalRecords) * 100) : 0,
      // The displayed value depends on display mode
      value: displayMode === 'percentage' 
        ? (totalRecords > 0 ? Math.round((item.value / totalRecords) * 100) : 0)
        : (item.value || 0)
    }));
  }, [data, displayMode]);

  // Generate color scheme
  const getChartColors = () => {
    return { scheme: 'category10' as const };
  };

  // Toggle between count and percentage modes
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'count' ? 'percentage' : 'count');
  };

  // Formatter for labels and tooltips
  const formatValue = (value: number) => {
    return displayMode === 'percentage' ? `${value}%` : value.toLocaleString();
  };

  if (!data || !Array.isArray(data)) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center p-6 text-gray-500">No data available</div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center p-6 text-gray-500">No diagnostic categories found</div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = (containerHeight: number | string, isExpanded: boolean = false) => (
    <div style={{ height: containerHeight }}>
      <ResponsiveBar
        data={chartData}
        keys={['value']}
        indexBy="id"
        margin={{ top: 20, right: 50, bottom: 70, left: isExpanded ? 70 : 50 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={getChartColors()}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 40,
          tickRotation: -45,
          legend: isExpanded ? 'Diagnostic Category' : undefined,
          legendPosition: 'middle',
          legendOffset: 50
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 40,
          tickRotation: 0,
          legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        // Format the labels correctly
        label={d => formatValue(d.value)}
        labelSkipWidth={16}
        labelSkipHeight={16}
        labelTextColor="#ffffff"
        animate={true}
        motionConfig="gentle"
        // Enhanced tooltip showing both count and percentage
        tooltip={({ id, value, data }) => (
          <div style={{
            background: 'white',
            padding: '9px 12px',
            border: '1px solid #ccc',
            borderRadius: '3px'
          }}>
            <div><strong>{id}</strong></div>
            <div>
              {displayMode === 'percentage' 
                ? `${value}% (${data.rawCount} patients)` 
                : `${value} patients (${data.percentage}%)`}
            </div>
          </div>
        )}
        role="application"
        ariaLabel="Diagnostic Categories"
      />
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <ChartExportWidget
            chartId={chartId}
            chartTitle={title}
            data={chartData.map(item => ({
              Category: item.id,
              Count: item.rawCount,
              Percentage: `${item.percentage}%`
            }))}
          />
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleDisplayMode}
              className="h-8"
            >
              {displayMode === 'count' 
                ? <Percent className="h-3.5 w-3.5 mr-1" /> 
                : <Hash className="h-3.5 w-3.5 mr-1" />}
              {displayMode === 'count' ? 'Show %' : 'Show Count'}
            </Button>
            
            {!compact && (
              <Dialog open={expanded} onOpenChange={setExpanded}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
                  <DialogHeader className="pb-0 mb-0">
                    <DialogTitle className="text-lg mb-0 pb-0">{title}</DialogTitle>
                  </DialogHeader>
                  <div className="h-[calc(120vh-60px)] mt-0 pt-0 w-full landscape-chart-container">
                    <ChartExportWidget
                      chartId={`${chartId}-expanded`}
                      chartTitle={`${title} (Expanded)`}
                      data={chartData.map(item => ({
                        Category: item.id,
                        Count: item.rawCount,
                        Percentage: `${item.percentage}%`
                      }))}
                      className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
                    />
                    <div className="flex justify-end mb-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleDisplayMode}
                      >
                        {displayMode === 'count' 
                          ? <Percent className="h-3.5 w-3.5 mr-1" /> 
                          : <Hash className="h-3.5 w-3.5 mr-1" />}
                        {displayMode === 'count' ? 'Show %' : 'Show Count'}
                      </Button>
                    </div>
                    {renderChart(500, true)}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        {renderChart(height)}
      </CardContent>
    </Card>
  );
}