import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import EnhancedHeatmap from './EnhancedHeatmap';
import EnhancedBubbleChart from './EnhancedBubbleChart';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PivotTableParserProps {
  defaultData?: string;
  initialTitle?: string;
  colorScheme?: 'blue' | 'red' | 'green' | 'amber';
}

/**
 * A component that parses pivot table data in text form and visualizes it
 * 
 * Expected format:
 * Title
 * Header Row: Empty, Date1, Date2, Date3...
 * Row1: Label, Value1, Value2, Value3...
 * Row2: Label, Value1, Value2, Value3...
 */
const PivotTableParser: React.FC<PivotTableParserProps> = ({ 
  defaultData = '',
  initialTitle = 'Data Visualization',
  colorScheme = 'blue'
}) => {
  const [rawData, setRawData] = useState(defaultData);
  const [title, setTitle] = useState(initialTitle);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'heatmap' | 'bubble'>('heatmap');

  // Parse the pivot table data from text
  const parseData = () => {
    setLoading(true);
    setError(null);

    try {
      // Split the input into lines and filter out empty lines
      const lines = rawData.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        throw new Error('Not enough data. Need at least a header row and one data row.');
      }

      // Find the title (typically the first non-empty line)
      let titleLine = 0;
      while (titleLine < lines.length && lines[titleLine].trim() === '') {
        titleLine++;
      }

      // If we found a title, use it
      if (titleLine < lines.length) {
        setTitle(lines[titleLine].trim());
        titleLine++; // Move to the next line after the title
      }

      // Find the header row (first row with at least 2 cells, one empty and others dates)
      let headerRowIndex = titleLine;
      while (headerRowIndex < lines.length) {
        const cells = lines[headerRowIndex].split(/\s+/).filter(cell => cell.trim() !== '');
        if (cells.length >= 2) {
          break;
        }
        headerRowIndex++;
      }

      if (headerRowIndex >= lines.length) {
        throw new Error('Could not find a valid header row.');
      }

      // Extract the column headers (dates)
      const headerRow = lines[headerRowIndex];
      // Attempt to extract dates based on common formats
      const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{2,4})/g;
      const dateMatches = headerRow.match(dateRegex);
      
      if (!dateMatches || dateMatches.length === 0) {
        throw new Error('No valid dates found in the header row.');
      }

      const columns = dateMatches;

      // Extract data rows
      const rows: string[] = [];
      const values: Record<string, Record<string, number>> = {};

      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '' || !line.match(/[a-zA-Z]/)) continue; // Skip empty lines or lines without text
        
        // Try to extract the row label and values
        // Pattern: First word/phrase followed by numbers
        let rowLabel = '';
        const rowValues: number[] = [];
        
        // Extract row label using regex to find text before the first number
        const rowLabelMatch = line.match(/^(.*?)(?=\d+\s|$)/);
        if (rowLabelMatch && rowLabelMatch[1].trim() !== '') {
          rowLabel = rowLabelMatch[1].trim();
        } else {
          continue; // Skip rows without a label
        }

        // Extract numbers using regex
        const numberMatches = line.match(/\d+/g);
        if (numberMatches) {
          numberMatches.forEach(numStr => {
            rowValues.push(parseInt(numStr, 10));
          });
        }

        // Skip rows without enough values
        if (rowValues.length === 0) continue;

        // Add the row and values
        rows.push(rowLabel);
        values[rowLabel] = {};
        
        // Map values to columns - match as many as we can
        const minLength = Math.min(columns.length, rowValues.length);
        for (let j = 0; j < minLength; j++) {
          values[rowLabel][columns[j]] = rowValues[j];
        }
      }

      if (rows.length === 0) {
        throw new Error('No valid data rows were found.');
      }

      // Create the structured data
      const structuredData = {
        rows,
        columns,
        values
      };

      setParsedData(structuredData);
      setError(null);
    } catch (err) {
      console.error('Error parsing data:', err);
      setError(err.message || 'Failed to parse the data. Please check the format.');
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pivot Table Visualizer</CardTitle>
        <CardDescription>
          Paste your pivot table data here to visualize it as a heatmap or bubble chart
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="input">
          <TabsList className="mb-4">
            <TabsTrigger value="input">Input Data</TabsTrigger>
            <TabsTrigger value="visualization" disabled={!parsedData}>Visualization</TabsTrigger>
          </TabsList>
          
          <TabsContent value="input">
            <div className="space-y-4">
              <Textarea 
                placeholder="Paste your pivot table data here..."
                className="min-h-[300px] font-mono text-sm"
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
              />
              
              <div className="flex justify-between items-center">
                <Button onClick={parseData} disabled={loading || !rawData.trim()}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Parsing...' : 'Parse Data'}
                </Button>
                
                {error && (
                  <div className="flex items-center text-destructive gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="visualization">
            {parsedData && (
              <>
                <div className="mb-4">
                  <Tabs 
                    defaultValue="heatmap"
                    onValueChange={(value) => setActiveView(value as 'heatmap' | 'bubble')}
                  >
                    <TabsList>
                      <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                      <TabsTrigger value="bubble">Bubble Chart</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                {activeView === 'heatmap' && (
                  <EnhancedHeatmap 
                    data={parsedData}
                    title={title}
                    colorScheme={colorScheme}
                  />
                )}
                
                {activeView === 'bubble' && (
                  <EnhancedBubbleChart
                    data={parsedData}
                    title={title}
                    colorScheme={colorScheme}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PivotTableParser;