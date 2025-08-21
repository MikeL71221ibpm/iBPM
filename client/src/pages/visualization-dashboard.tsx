import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import AutoPivotCharts from '@/components/AutoPivotCharts';
import NivoScatterViewThemed from '@/pages/nivo-scatter-view-themed-new-colors-fixed';
import EnhancedHeatmap from '@/components/EnhancedHeatmap';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define parameter type
interface VisualizationDashboardParams {
  patientId?: string;
}

// Data view options (consistent with other components)
const DATA_VIEWS = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

export default function VisualizationDashboard() {
  const { patientId = "1" } = useParams<VisualizationDashboardParams>();
  const [selectedView, setSelectedView] = useState<string>(DATA_VIEWS[0].id);

  // Load data for the selected view
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/pivot/${selectedView}/${patientId}`],
    refetchOnWindowFocus: false
  });

  // Convert the data format for the heatmap component
  const transformDataForHeatmap = (data: any) => {
    if (!data || !data.rows || !data.columns || !data.data) {
      return { rows: [], columns: [], values: {} };
    }

    // Transform the data structure to match the heatmap component's expected format
    const values: Record<string, Record<string, number>> = {};
    
    data.rows.forEach((row: string) => {
      values[row] = {};
      data.columns.forEach((col: string) => {
        values[row][col] = data.data[row]?.[col] || 0;
      });
    });

    return {
      rows: data.rows,
      columns: data.columns,
      values
    };
  };

  // Handle no data case
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visualization Error</CardTitle>
          <CardDescription>
            Error loading visualization data
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-6">
          <p className="text-destructive">{(error as any).message || 'An error occurred'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Patient {patientId} Visualizations</h1>
      
      <div className="mb-6">
        <label className="text-sm font-medium block mb-2">
          Data Category:
        </label>
        <Select
          value={selectedView}
          onValueChange={setSelectedView}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {DATA_VIEWS.map(view => (
              <SelectItem key={view.id} value={view.id}>
                {view.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Loading visualizations...</span>
        </div>
      ) : (
        <Tabs defaultValue="bubble" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="bubble">Bubble Chart</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="table">Pivot Table</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bubble">
            <div className="border rounded-lg overflow-hidden">
              {/* We're passing the patientId from the URL parameters to the component */}
              <NivoScatterViewThemed patientId={patientId} dataType={selectedView} />
            </div>
          </TabsContent>
          
          <TabsContent value="heatmap">
            <EnhancedHeatmap
              data={transformDataForHeatmap(data)}
              title={`Patient ${patientId} ${DATA_VIEWS.find(v => v.id === selectedView)?.label || ''}`}
              description="Frequency of occurrences by date"
              colorScheme="blue"
              height={600}
            />
          </TabsContent>
          
          <TabsContent value="table">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>
                  {`Patient ${patientId} ${DATA_VIEWS.find(v => v.id === selectedView)?.label || ''} - Pivot Table`}
                </CardTitle>
                <CardDescription>
                  Frequency of occurrences by date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {data && data.rows && data.rows.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-10 min-w-[240px] font-bold">
                              {DATA_VIEWS.find(v => v.id === selectedView)?.label || 'Item'}
                            </TableHead>
                            {data.columns.map((column: string) => (
                              <TableHead key={column} className="text-center whitespace-nowrap">
                                {column}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.rows.map((row: string) => (
                            <TableRow key={row}>
                              <TableCell className="font-medium sticky left-0 bg-background z-10">
                                {row}
                              </TableCell>
                              {data.columns.map((column: string) => {
                                const value = data.data[row]?.[column] || 0;
                                return (
                                  <TableCell key={column} className="text-center">
                                    {value > 0 ? value : ''}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      No data available
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}