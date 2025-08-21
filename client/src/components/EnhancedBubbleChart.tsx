import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { useTheme } from '@/components/theme-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Type for the pivot table data
interface PivotTableData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}

interface EnhancedBubbleChartProps {
  data: PivotTableData;
  title: string;
  description?: string;
  colorScheme?: 'blue' | 'red' | 'green' | 'amber';
  height?: number;
}

const EnhancedBubbleChart: React.FC<EnhancedBubbleChartProps> = ({
  data,
  title,
  description,
  colorScheme = 'blue',
  height = 500
}) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  // Get color scheme
  const getColorScheme = () => {
    switch (colorScheme) {
      case 'red': return isDarkTheme ? 'reds' : 'reds';
      case 'green': return isDarkTheme ? 'greens' : 'greens';
      case 'amber': return isDarkTheme ? 'oranges' : 'oranges';
      default: return isDarkTheme ? 'blues' : 'blues';
    }
  };

  // Transform the pivot table data into bubble chart format
  const bubbleData = useMemo(() => {
    // First, calculate the total for each row to determine bubble size
    const rowTotals: Record<string, number> = {};
    data.rows.forEach(row => {
      let total = 0;
      data.columns.forEach(column => {
        total += data.values[row]?.[column] || 0;
      });
      rowTotals[row] = total;
    });

    // Create hierarchical structure for bubble chart
    const transformedData = {
      name: title,
      color: "hsl(0, 0%, 80%)",
      children: data.rows.map(row => {
        // Only include rows with a total > 0
        if (rowTotals[row] <= 0) return null;

        return {
          name: row,
          count: rowTotals[row],
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          children: data.columns
            .filter(column => (data.values[row]?.[column] || 0) > 0)
            .map(column => ({
              name: `${column}`,
              count: data.values[row]?.[column] || 0,
              color: `hsl(${Math.random() * 360}, 70%, 50%)`,
              loc: data.values[row]?.[column] || 0,
            }))
        };
      }).filter(Boolean)
    };

    return transformedData;
  }, [data, title]);

  // Helper function to check if the data is empty
  const isDataEmpty = useMemo(() => {
    // Check if we have any non-zero values
    let hasData = false;
    data.rows.forEach(row => {
      data.columns.forEach(column => {
        if ((data.values[row]?.[column] || 0) > 0) {
          hasData = true;
        }
      });
    });
    return !hasData || data.rows.length === 0 || data.columns.length === 0;
  }, [data]);

  // Get all values for the data table view
  const tableData = useMemo(() => {
    const result: Array<{ label: string; count: number }> = [];
    
    data.rows.forEach(row => {
      let rowTotal = 0;
      data.columns.forEach(column => {
        const value = data.values[row]?.[column] || 0;
        if (value > 0) {
          rowTotal += value;
          result.push({
            label: `${row} (${column})`,
            count: value
          });
        }
      });
      
      // Add row total 
      if (rowTotal > 0) {
        result.push({
          label: `${row} (Total)`,
          count: rowTotal
        });
      }
    });
    
    // Sort by count descending
    return result.sort((a, b) => b.count - a.count);
  }, [data]);

  if (isDataEmpty) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center text-muted-foreground p-8">
          No data available for visualization.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bubble">
          <TabsList className="mb-4">
            <TabsTrigger value="bubble">Bubble Chart</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          <TabsContent value="bubble" className="h-full">
            <div style={{ height: `${height}px` }}>
              <ResponsiveCirclePacking
                data={bubbleData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                identity="name"
                value="count"
                colors={{ scheme: getColorScheme() }}
                padding={6}
                labelTextColor={{
                  from: 'color',
                  modifiers: [['darker', 2]]
                }}
                borderWidth={2}
                borderColor={{
                  from: 'color',
                  modifiers: [['darker', 0.3]]
                }}
                animate={true}
                motionConfig="gentle"
                tooltip={({ id, value, color }) => (
                  <div style={{ 
                    backgroundColor: isDarkTheme ? '#1e293b' : 'white', 
                    padding: '8px', 
                    border: `1px solid ${isDarkTheme ? '#475569' : '#e2e8f0'}`,
                    borderRadius: '4px',
                    color: isDarkTheme ? 'white' : 'black'
                  }}>
                    <strong style={{ color }}>
                      {id}
                    </strong>
                    <div>Count: {value}</div>
                  </div>
                )}
              />
            </div>
          </TabsContent>
          <TabsContent value="table">
            <ScrollArea className="h-[450px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {row.label}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedBubbleChart;