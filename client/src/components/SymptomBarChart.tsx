import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ResponsiveBar } from '@nivo/bar';
import { Loader2, Maximize2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import ChartExportWidget from '@/components/chart-export-widget';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SymptomBarChartProps {
  patientId?: string;
  dateRange?: any;
}

export default function SymptomBarChart({ patientId, dateRange }: SymptomBarChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartId] = useState(`symptom-bar-chart-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) return;
      
      setIsLoading(true);
      try {
        const response = await apiRequest('GET', `/api/pivot/symptom/${patientId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch symptom data');
        }
        
        const pivotData = await response.json();
        
        // Transform pivot data for bar chart
        const transformedData = Object.entries(pivotData.rows).map(([symptom]) => {
          const total = Object.values(pivotData.data[symptom] || {}).reduce((sum: any, val: any) => sum + val, 0);
          return {
            symptom,
            value: total,
            label: symptom
          };
        });
        
        // Sort by frequency and take top 10
        const sortedData = transformedData
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
          
        setData(sortedData);
      } catch (error) {
        console.error('Error fetching symptom data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [patientId]);

  // Format data for export
  const getExportData = () => {
    return data.map(item => ({
      Symptom: item.symptom,
      Frequency: item.value
    }));
  };

  // Get detailed export data
  const getDetailedExportData = () => {
    return data.map(item => ({
      Symptom: item.symptom,
      Frequency: item.value,
      PatientId: patientId,
      ExportDate: new Date().toISOString()
    }));
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Symptom Frequency</CardTitle>
        <ChartExportWidget
          chartId={chartId}
          chartTitle="Symptom Frequency"
          data={getExportData()}
          showDetailedExport={true}
          getDetailedData={getDetailedExportData}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center h-80 text-muted-foreground">
            <div className="flex flex-col items-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p>No symptom data available</p>
            </div>
          </div>
        ) : (
          <div className="h-80" id={chartId}>
            <ResponsiveBar
              data={data}
              keys={['value']}
              indexBy="symptom"
              margin={{ top: 20, right: 20, bottom: 50, left: 150 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'nivo' }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: 0,
                legend: 'Frequency',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: 0,
                legend: 'Symptom',
                legendPosition: 'middle',
                legendOffset: -140
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              role="application"
              ariaLabel="Symptom frequency chart"
              barAriaLabel={e => `${e.indexValue}: ${e.formattedValue}`}
            />
          </div>
        )}
      </CardContent>
      {!isLoading && data.length > 0 && (
        <CardFooter className="pt-0">
          <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" onClick={() => setIsExpanded(true)}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Expand Chart
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
              <DialogHeader className="pb-0 mb-0">
                <DialogTitle className="text-lg mb-0 pb-0">Symptom Frequency - Patient {patientId}</DialogTitle>
              </DialogHeader>
              <div className="h-[calc(120vh-60px)] mt-0 pt-0 w-full landscape-chart-container">
                <ChartExportWidget
                  chartId={`${chartId}-expanded`}
                  chartTitle="Symptom Frequency (Expanded)"
                  data={getExportData()}
                  showDetailedExport={true}
                  getDetailedData={getDetailedExportData}
                  iconSize={20}
                  className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
                />
                <ResponsiveBar
                  data={data}
                  keys={['value']}
                  indexBy="symptom"
                  margin={{ top: 40, right: 80, bottom: 60, left: 200 }}
                  padding={0.4}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={{ scheme: 'nivo' }}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 8,
                    tickPadding: 40,
                    tickRotation: 0,
                    legend: 'Frequency',
                    legendPosition: 'middle',
                    legendOffset: 45,
                    legendFontSize: 14
                  }}
                  axisLeft={{
                    tickSize: 8,
                    tickPadding: 40,
                    tickRotation: 0,
                    legend: 'Symptom',
                    legendPosition: 'middle',
                    legendOffset: -180,
                    format: (value) => value.length > 40 ? `${value.substring(0, 37)}...` : value
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  role="application"
                  ariaLabel="Symptom frequency chart"
                  barAriaLabel={e => `${e.indexValue}: ${e.formattedValue}`}
                  // Enhanced styling for full-page landscape view
                  enableGridY={true}
                  gridYValues={5}
                  theme={{
                    axis: {
                      ticks: {
                        text: {
                          fontSize: 14,
                          fontWeight: 500
                        }
                      },
                      legend: {
                        text: {
                          fontSize: 16,
                          fontWeight: 600
                        }
                      }
                    },
                    grid: {
                      line: {
                        stroke: '#f0f0f0',
                        strokeWidth: 1
                      }
                    },
                    tooltip: {
                      container: {
                        fontSize: '14px',
                        padding: '12px',
                        borderRadius: '4px'
                      }
                    }
                  }}
                  // Enhanced tooltip
                  tooltip={({ indexValue, value, color }) => (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      border: `2px solid ${color}`,
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      fontSize: '14px'
                    }}>
                      <strong>{indexValue}</strong>: {value} occurrences
                    </div>
                  )}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}