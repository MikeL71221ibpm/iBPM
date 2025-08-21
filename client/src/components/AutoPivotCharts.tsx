import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface AutoPivotChartsProps {
  patientId?: string;
  chartType?: 'heatmap' | 'bar' | 'bubble';
}

const AUTO_PIVOT_TYPES = {
  symptoms: {
    title: 'Symptom Tracking Over Time',
    endpoint: '/api/pivot/symptom',
    colorScheme: 'blues'
  },
  diagnoses: {
    title: 'Diagnosis Tracking Over Time',
    endpoint: '/api/pivot/diagnosis',
    colorScheme: 'reds'
  },
  categories: {
    title: 'Diagnostic Category Tracking Over Time',
    endpoint: '/api/pivot/diagnostic-category',
    colorScheme: 'greens'
  },
  hrsn: {
    title: 'HRSN/Social Needs Tracking Over Time',
    endpoint: '/api/pivot/hrsn',
    colorScheme: 'oranges'
  }
};

const AutoPivotCharts: React.FC<AutoPivotChartsProps> = ({ 
  patientId,
  chartType = 'heatmap'
}) => {
  const [activeTab, setActiveTab] = useState<keyof typeof AUTO_PIVOT_TYPES>('symptoms');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<keyof typeof AUTO_PIVOT_TYPES, any[]>>({
    symptoms: [],
    diagnoses: [],
    categories: [],
    hrsn: []
  });
  const [columns, setColumns] = useState<Record<keyof typeof AUTO_PIVOT_TYPES, string[]>>({
    symptoms: [],
    diagnoses: [],
    categories: [],
    hrsn: []
  });
  
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const fetchAllPivotData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch data for all pivot types
        const results = await Promise.all(
          Object.entries(AUTO_PIVOT_TYPES).map(async ([key, config]) => {
            const url = patientId 
              ? `${config.endpoint}/${patientId}` 
              : config.endpoint;
            
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to load ${config.title} data`);
            }
            
            const pivotData = await response.json();
            return { key, data: pivotData };
          })
        );
        
        // Process all the results
        const newData: Record<string, any[]> = {
          symptoms: [],
          diagnoses: [],
          categories: [],
          hrsn: []
        };
        
        const newColumns: Record<string, string[]> = {
          symptoms: [],
          diagnoses: [],
          categories: [],
          hrsn: []
        };
        
        // Process each dataset
        results.forEach(result => {
          const { key, data: pivotData } = result;
          
          // Extract columns (dates) and rows (labels)
          if (pivotData.columns && pivotData.columns.length > 0) {
            newColumns[key as keyof typeof AUTO_PIVOT_TYPES] = pivotData.columns;
            
            // Transform the data for visualization
            if (pivotData.rows && pivotData.data) {
              const formattedData = pivotData.rows.map((row: string) => {
                const rowData: any = { label: row };
                
                pivotData.columns.forEach((column: string, index: number) => {
                  rowData[column] = pivotData.data[row]?.[column] || 0;
                });
                
                return rowData;
              });
              
              newData[key as keyof typeof AUTO_PIVOT_TYPES] = formattedData;
            }
          }
        });
        
        setData(newData);
        setColumns(newColumns);
      } catch (err) {
        console.error('Error fetching pivot data:', err);
        setError('Failed to load chart data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllPivotData();
  }, [patientId]);
  
  // If no real data from API, use sample data for demonstration
  useEffect(() => {
    // Only use sample data if we're in development and the API didn't return data
    if (process.env.NODE_ENV === 'development' && !isLoading && 
        Object.values(data).every(arr => arr.length === 0)) {
      
      // Example symptom data
      const sampleSymptomData = [
        { label: 'Depression', '1/1/24': 6, '1/15/24': 4, '2/1/24': 3, '2/15/24': 5 },
        { label: 'Anxiety', '1/1/24': 4, '1/15/24': 2, '2/1/24': 5, '2/15/24': 6 },
        { label: 'Insomnia', '1/1/24': 3, '1/15/24': 5, '2/1/24': 4, '2/15/24': 2 }
      ];
      
      // Example diagnosis data
      const sampleDiagnosisData = [
        { label: 'Major Depressive Disorder', '1/1/24': 2, '1/15/24': 1, '2/1/24': 3, '2/15/24': 2 },
        { label: 'Generalized Anxiety Disorder', '1/1/24': 1, '1/15/24': 3, '2/1/24': 2, '2/15/24': 3 },
        { label: 'Panic Disorder', '1/1/24': 1, '1/15/24': 0, '2/1/24': 2, '2/15/24': 1 }
      ];
      
      // Example diagnostic category data
      const sampleCategoryData = [
        { label: 'Depressive Disorders', '1/1/24': 5, '1/15/24': 3, '2/1/24': 6, '2/15/24': 4 },
        { label: 'Anxiety Disorders', '1/1/24': 3, '1/15/24': 5, '2/1/24': 4, '2/15/24': 6 },
        { label: 'Substance-Related Disorders', '1/1/24': 2, '1/15/24': 1, '2/1/24': 3, '2/15/24': 2 }
      ];
      
      // Example HRSN data
      const sampleHrsnData = [
        { label: 'Housing Instability', '1/1/24': 1, '1/15/24': 0, '2/1/24': 1, '2/15/24': 0 },
        { label: 'Food Insecurity', '1/1/24': 2, '1/15/24': 1, '2/1/24': 0, '2/15/24': 1 },
        { label: 'Transportation Needs', '1/1/24': 0, '1/15/24': 1, '2/1/24': 1, '2/15/24': 0 }
      ];
      
      const sampleColumns = ['1/1/24', '1/15/24', '2/1/24', '2/15/24'];
      
      setData({
        symptoms: sampleSymptomData,
        diagnoses: sampleDiagnosisData,
        categories: sampleCategoryData,
        hrsn: sampleHrsnData
      });
      
      setColumns({
        symptoms: sampleColumns,
        diagnoses: sampleColumns,
        categories: sampleColumns,
        hrsn: sampleColumns
      });
    }
  }, [isLoading, data]);
  
  const renderHeatmap = (chartData: any[], chartColumns: string[]) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex justify-center items-center h-[300px] bg-gray-50 rounded-md">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }
    
    // Transform data for heatmap format
    const heatmapData = chartData.map(item => {
      const rowData: any = { id: item.label };
      chartColumns.forEach(column => {
        rowData[column] = item[column] || 0;
      });
      return rowData;
    });
    
    return (
      <div className="h-[400px]">
        <ResponsiveHeatMap
          data={heatmapData}
          indexBy="id"
          keys={chartColumns}
          margin={{ top: 60, right: 90, bottom: 60, left: 150 }}
          forceSquare={false}
          axisTop={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
          }}
          cellOpacity={1}
          cellBorderWidth={1}
          cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
          colors={{ scheme: AUTO_PIVOT_TYPES[activeTab].colorScheme }}
          animate={true}
          motionStiffness={80}
          motionDamping={9}
          hoverTarget="cell"
          cellHoverOthersOpacity={0.25}
        />
      </div>
    );
  };
  
  const renderBarChart = (chartData: any[], chartColumns: string[]) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex justify-center items-center h-[300px] bg-gray-50 rounded-md">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }
    
    return (
      <div className="h-[400px]">
        <ResponsiveBar
          data={chartData}
          keys={chartColumns}
          indexBy="label"
          margin={{ top: 50, right: 130, bottom: 100, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: AUTO_PIVOT_TYPES[activeTab].colorScheme }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legendPosition: 'middle',
            legendOffset: 32
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Count',
            legendPosition: 'middle',
            legendOffset: -40
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 120,
              translateY: 0,
              itemsSpacing: 2,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 12,
              symbolShape: 'circle',
            }
          ]}
        />
      </div>
    );
  };
  
  const renderTable = (chartData: any[], chartColumns: string[]) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex justify-center items-center h-[300px] bg-gray-50 rounded-md">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }
    
    return (
      <ScrollArea className="h-[300px]">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                {chartColumns.map(date => (
                  <TableHead key={date} className="text-right">{date}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {chartColumns.map(date => (
                    <TableCell key={date} className="text-right">
                      {row[date] || 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    );
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    
    const activeData = data[activeTab] || [];
    const activeColumns = columns[activeTab] || [];
    
    return (
      <Tabs defaultValue="chart">
        <TabsList className="mb-4">
          <TabsTrigger value="chart">
            {chartType === 'heatmap' ? 'Heatmap' : 'Bar Chart'}
          </TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart">
          {chartType === 'heatmap'
            ? renderHeatmap(activeData, activeColumns)
            : renderBarChart(activeData, activeColumns)
          }
        </TabsContent>
        
        <TabsContent value="table">
          {renderTable(activeData, activeColumns)}
        </TabsContent>
      </Tabs>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pivot Charts</CardTitle>
        <CardDescription>
          Automatically generated charts from pivot table data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as keyof typeof AUTO_PIVOT_TYPES)}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="hrsn">HRSN</TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-4">
              {AUTO_PIVOT_TYPES[activeTab].title}
            </h3>
            {renderContent()}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AutoPivotCharts;