import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define types for our pivot data
type PivotData = {
  [key: string]: any;
  rows?: string[];
};

type PivotTables = {
  symptomPivotTable: PivotData;
  diagnosisPivotTable: PivotData;
  diagnosticCategoryPivotTable: PivotData;
  hrsnPivotTable: PivotData;
};

function formatDate(dateStr: string) {
  if (!dateStr || dateStr === 'rows') return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year.slice(2)}`;
}

function generateColorStyle(value: number, maxValue: number) {
  // Return a background color based on the value
  if (value === 0) return { backgroundColor: '#f8fafc' };
  
  const intensity = Math.min(0.9, Math.max(0.1, value / maxValue));
  
  if (intensity < 0.25) {
    return { backgroundColor: '#dbeafe' }; // light blue
  } else if (intensity < 0.5) {
    return { backgroundColor: '#93c5fd' }; // medium blue
  } else if (intensity < 0.75) {
    return { backgroundColor: '#60a5fa' }; // darker blue
  } else {
    return { backgroundColor: '#3b82f6', color: 'white' }; // deep blue with white text
  }
}

function PivotTableHeatmap({ data, title }: { data: PivotData; title: string }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 text-center text-gray-500 rounded">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Extract dates (columns) and sort them chronologically
  const dates = Object.keys(data)
    .filter(key => key !== 'rows')
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  // Find max value for color scaling
  let maxValue = 0;
  data.rows.forEach(row => {
    dates.forEach(date => {
      const value = data[date]?.[row] || 0;
      if (value > maxValue) maxValue = value;
    });
  });
  
  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border-b border-r sticky left-0 bg-gray-50 z-10">
                  {title.split(' ')[0]}
                </th>
                {dates.map(date => (
                  <th key={date} className="p-2 border-b whitespace-nowrap text-center">
                    {formatDate(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map(row => (
                <tr key={row}>
                  <td className="p-2 border-r font-medium sticky left-0 bg-white z-10">
                    {row}
                  </td>
                  {dates.map(date => {
                    const value = data[date]?.[row] || 0;
                    return (
                      <td
                        key={`${row}-${date}`}
                        className="p-2 border text-center"
                        style={generateColorStyle(value, maxValue)}
                      >
                        {value || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HeatmapPage() {
  const { patientId: urlPatientId } = useParams<{ patientId?: string }>();
  const [patientId, setPatientId] = useState(urlPatientId || '1');
  const [inputPatientId, setInputPatientId] = useState(patientId);
  const [pivotData, setPivotData] = useState<PivotTables | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('symptoms');
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientId(inputPatientId);
  };
  
  useEffect(() => {
    async function fetchPivotData() {
      setLoading(true);
      
      try {
        const response = await fetch(`/simple-pivot-debug?patientId=${patientId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setPivotData(data);
      } catch (err: any) {
        console.error('Error fetching pivot data:', err);
        toast({
          title: 'Error loading visualization data',
          description: err.message || 'Failed to load patient data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchPivotData();
  }, [patientId, toast]);
  
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Patient Heatmap Visualization</h1>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Patient Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
                Patient ID
              </label>
              <Input
                id="patientId"
                value={inputPatientId}
                onChange={(e) => setInputPatientId(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit">
              Generate Visualizations
            </Button>
          </form>
          
          <div className="mt-4 flex gap-2">
            <Button 
              variant={patientId === '1' ? 'default' : 'outline'}
              onClick={() => { setInputPatientId('1'); setPatientId('1'); }}
            >
              Patient 1
            </Button>
            <Button 
              variant={patientId === '10' ? 'default' : 'outline'}
              onClick={() => { setInputPatientId('10'); setPatientId('10'); }}
            >
              Patient 10
            </Button>
            <Button 
              variant={patientId === '100' ? 'default' : 'outline'}
              onClick={() => { setInputPatientId('100'); setPatientId('100'); }}
            >
              Patient 100
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading visualization data...</span>
        </div>
      ) : pivotData ? (
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
              <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="hrsn">HRSN Z-Codes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="symptoms" className="mt-0">
              <PivotTableHeatmap 
                data={pivotData.symptomPivotTable} 
                title="Symptom Heatmap"
              />
            </TabsContent>
            
            <TabsContent value="diagnoses" className="mt-0">
              <PivotTableHeatmap 
                data={pivotData.diagnosisPivotTable} 
                title="Diagnosis Heatmap"
              />
            </TabsContent>
            
            <TabsContent value="categories" className="mt-0">
              <PivotTableHeatmap 
                data={pivotData.diagnosticCategoryPivotTable} 
                title="Diagnostic Category Heatmap"
              />
            </TabsContent>
            
            <TabsContent value="hrsn" className="mt-0">
              <PivotTableHeatmap 
                data={pivotData.hrsnPivotTable} 
                title="HRSN Z-Code Heatmap"
              />
            </TabsContent>
          </Tabs>
          
          <div className="mt-8 text-sm text-muted-foreground">
            <p>Data shown is for Patient ID: {patientId}</p>
            <p className="mt-1">Color intensity indicates frequency of occurrence.</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p>No data available. Please select a patient to view their heatmap visualizations.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}