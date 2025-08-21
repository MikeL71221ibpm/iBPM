// Direct HRSN Chart - Simple implementation that actually works
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { apiRequest } from "@/lib/queryClient";

interface HrsnChartProps {
  categoryName: string;
  chartType: 'count' | 'percentage' | 'pie';
  title: string;
}

export default function HrsnChartDirect({ categoryName, chartType, title }: HrsnChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHrsnData = async () => {
      if (!['financial_status', 'housing_insecurity', 'food_insecurity', 'access_to_transportation', 'has_a_car'].includes(categoryName)) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`Fetching HRSN data for ${categoryName}`);
        
        const response = await apiRequest('GET', '/api/hrsn-data');
        const hrsnData = await response.json();
        console.log('HRSN API Response:', hrsnData);
        
        const categoryValue = hrsnData.categories?.[categoryName] || 0;
        const totalPatients = hrsnData.totalPatients || 0;
        
        if (categoryValue > 0) {
          if (chartType === 'pie') {
            setData([
              {
                id: 'Issues Identified',
                label: 'Issues Identified',
                value: categoryValue,
                color: '#e74c3c'
              },
              {
                id: 'No Issues',
                label: 'No Issues',
                value: totalPatients - categoryValue,
                color: '#95a5a6'
              }
            ]);
          } else {
            const displayValue = chartType === 'percentage' 
              ? Math.round((categoryValue / totalPatients) * 100)
              : categoryValue;
            
            setData([{
              category: 'Issues Identified',
              value: displayValue,
              count: categoryValue,
              label: chartType === 'percentage' ? `${displayValue}%` : `${displayValue} patients`
            }]);
          }
        } else {
          setData([]);
        }
        
      } catch (err) {
        console.error('Error fetching HRSN data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchHrsnData();
  }, [categoryName, chartType]);

  if (loading) {
    return (
      <Card className="p-4 h-64">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Card>
    );
  }

  if (error || data.length === 0) {
    return (
      <Card className="p-4 h-64">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-full text-gray-500">
          No Data Available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-64">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-48">
        {chartType === 'pie' ? (
          <ResponsivePie
            data={data}
            margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={{ datum: 'data.color' }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          />
        ) : (
          <ResponsiveBar
            data={data}
            keys={['value']}
            indexBy="category"
            margin={{ top: 20, right: 60, bottom: 50, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            colors={['#3498db']}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            tooltip={({ data }) => (
              <div className="bg-white p-2 border rounded shadow">
                <strong>{data.category}</strong><br />
                {data.label}
              </div>
            )}
          />
        )}
      </div>
    </Card>
  );
}