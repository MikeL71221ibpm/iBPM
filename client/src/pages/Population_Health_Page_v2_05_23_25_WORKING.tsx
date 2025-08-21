import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Maximize2 } from "lucide-react";
import VisualizationMetadata from "../components/visualization-metadata";
import CategoricalHrsnChart from "../components/categorical-hrsn-chart-05_13_25";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';

import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { ResponsiveTreeMap } from '@nivo/treemap';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Define types for chart data
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
}

export default function PopulationHealthCharts({ 
  data, 
  isLoading = false 
}: PopulationHealthChartsProps) {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  // Sample demo data for immediate display
  const demoData = {
    hrsnIndicators: [
      { id: "Housing", value: 18, percentage: 23.5 },
      { id: "Food", value: 15, percentage: 19.6 },
      { id: "Transportation", value: 12, percentage: 15.7 },
      { id: "Financial", value: 11, percentage: 14.4 },
      { id: "Education", value: 10, percentage: 13.1 },
      { id: "Employment", value: 7, percentage: 9.2 },
      { id: "Legal", value: 3, percentage: 3.9 }
    ],
    symptomSegments: [
      { id: "Anxiety-Related", value: 28, percentage: 32.1 },
      { id: "Depression-Related", value: 22, percentage: 25.3 },
      { id: "Trauma-Related", value: 18, percentage: 20.7 },
      { id: "Substance-Related", value: 12, percentage: 13.8 },
      { id: "Behavioral-Related", value: 7, percentage: 8.0 }
    ]
  };

  const getChartColors = () => {
    const baseColors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
    ];
    return baseColors;
  };

  const renderChart = (chartData: ChartDataItem[], title: string, description: string) => {
    const validData = chartData.map(item => ({
      ...item,
      displayValue: displayMode === 'percentage' ? item.percentage || 0 : item.value
    }));

    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ height: "350px", width: '100%' }}>
            <ResponsiveBar
              data={validData}
              keys={['displayValue']}
              indexBy="id"
              margin={{ top: 20, right: 30, bottom: 80, left: 60 }}
              padding={0.2}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={getChartColors()}
              borderRadius={3}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={20}
              labelSkipHeight={15}
              label={d => {
                const value = d.value || 0;
                return displayMode === 'percentage' 
                  ? `${value.toFixed(1)}%` 
                  : value.toLocaleString();
              }}
              labelTextColor="#000000"
              animate={true}
              motionConfig="gentle"
              tooltip={({ id, value }) => (
                <div className="bg-white p-2 border rounded shadow-lg">
                  <div className="font-medium">{id}</div>
                  <div className="text-sm">
                    {displayMode === 'percentage' ? `${value}%` : `${value} records`}
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="px-2 py-2 max-w-[1920px] mx-auto">
      <div className="mb-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1">
          <div>
            <h1 className="text-xl font-bold mb-0">Population Health Analytics</h1>
            <p className="text-gray-600 text-xs">Analyzing HRSN and BH Impact</p>
          </div>
        </div>
      </div>

      {/* Display Mode Toggle */}
      <div className="mb-4 flex justify-center">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setDisplayMode('count')}
            className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${
              displayMode === 'count'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Count View
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('percentage')}
            className={`px-4 py-2 text-sm font-medium border rounded-r-lg ${
              displayMode === 'percentage'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Percentage View
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {renderChart(
          demoData.hrsnIndicators, 
          "HRSN Indicators", 
          "Distribution of Health-Related Social Needs"
        )}
        
        {renderChart(
          demoData.symptomSegments, 
          "Symptom Segments", 
          "Distribution of Behavioral Health Symptoms"
        )}
      </div>
    </div>
  );
}