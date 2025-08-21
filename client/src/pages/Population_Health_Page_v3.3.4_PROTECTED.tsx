/**
 * PROTECTED FILE - v3.3.4 Population Health Page
 * 
 * DO NOT MODIFY - This is the stable v3.3.4 release
 * Created: June 4, 2025
 * 
 * Features:
 * - Comprehensive HRSN integration with automatic extraction
 * - Database-aligned schema without separate HRSN processes
 * - 16,867 extracted symptoms with integrated social determinant data
 * - Population health visualizations with disparity analysis
 * 
 * This file serves as the baseline for all future development
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
}

export default function PopulationHealthCharts({ 
  data, 
  isLoading = false 
}: PopulationHealthChartsProps) {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  // Fetch authentic data from your database
  const { data: visualizationData, isLoading: dataLoading, error } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 30000,
    refetchInterval: 30000,
  });

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
        <span className="ml-2">Loading authentic data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        Error loading data: {error.message}
      </div>
    );
  }

  // Transform your database data for visualization
  const patients = visualizationData?.patients || [];
  const extractedSymptoms = visualizationData?.extractedSymptoms || [];

  // Generate diagnosis distribution data
  const diagnosisData = extractedSymptoms
    .filter(symptom => symptom.diagnosis && symptom.diagnosis.trim() !== '')
    .reduce((acc: any, symptom: any) => {
      const diagnosis = symptom.diagnosis;
      if (!acc[diagnosis]) {
        acc[diagnosis] = 0;
      }
      acc[diagnosis]++;
      return acc;
    }, {});

  const diagnosisChartData = Object.entries(diagnosisData)
    .map(([diagnosis, count]) => ({
      diagnosis: diagnosis.length > 25 ? diagnosis.substring(0, 25) + '...' : diagnosis,
      count: count as number,
      percentage: ((count as number) / extractedSymptoms.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Generate symptom segment distribution
  const symptomData = extractedSymptoms
    .filter(symptom => symptom.symptom_segment && symptom.symptom_segment.trim() !== '')
    .reduce((acc: any, symptom: any) => {
      const segment = symptom.symptom_segment;
      if (!acc[segment]) {
        acc[segment] = 0;
      }
      acc[segment]++;
      return acc;
    }, {});

  const symptomChartData = Object.entries(symptomData)
    .map(([segment, count]) => ({
      segment: segment.length > 25 ? segment.substring(0, 25) + '...' : segment,
      count: count as number,
      percentage: ((count as number) / extractedSymptoms.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Generate HRSN category distribution (integrated from zcode_hrsn field)
  const hrsnData = extractedSymptoms
    .filter(symptom => symptom.zcode_hrsn && symptom.zcode_hrsn !== 'No' && symptom.zcode_hrsn.trim() !== '')
    .reduce((acc: any, symptom: any) => {
      const hrsn = symptom.zcode_hrsn;
      if (!acc[hrsn]) {
        acc[hrsn] = 0;
      }
      acc[hrsn]++;
      return acc;
    }, {});

  const hrsnChartData = Object.entries(hrsnData)
    .map(([category, count]) => ({
      category: category.length > 25 ? category.substring(0, 25) + '...' : category,
      count: count as number,
      percentage: ((count as number) / extractedSymptoms.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Generate demographic distribution
  const demographicData = patients
    .filter(patient => patient.age_range && patient.age_range.trim() !== '')
    .reduce((acc: any, patient: any) => {
      const ageRange = patient.age_range;
      if (!acc[ageRange]) {
        acc[ageRange] = 0;
      }
      acc[ageRange]++;
      return acc;
    }, {});

  const demographicChartData = Object.entries(demographicData)
    .map(([ageRange, count]) => ({
      ageRange,
      count: count as number,
      percentage: ((count as number) / patients.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count);

  const chartTheme = {
    background: 'transparent',
    text: { fill: '#374151' },
    axis: {
      domain: { line: { stroke: '#e5e7eb' } },
      ticks: { line: { stroke: '#e5e7eb' } }
    },
    grid: { line: { stroke: '#f3f4f6' } }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Population Health Analytics</h2>
          <p className="text-muted-foreground">Comprehensive healthcare data analysis with HRSN indicators</p>
        </div>
        <div className="flex items-center space-x-4">
          <Label htmlFor="display-mode">Display Mode:</Label>
          <Select value={displayMode} onValueChange={(value: 'count' | 'percentage') => setDisplayMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diagnoses Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Diagnoses</CardTitle>
            <p className="text-sm text-muted-foreground">Most frequent diagnostic categories</p>
          </CardHeader>
          <CardContent>
            <div style={{ height: '400px' }}>
              <ResponsiveBar
                data={diagnosisChartData}
                keys={[displayMode === 'count' ? 'count' : 'percentage']}
                indexBy="diagnosis"
                margin={{ top: 20, right: 30, bottom: 80, left: 60 }}
                padding={0.3}
                colors={{ scheme: 'category10' }}
                theme={chartTheme}
                axisBottom={{
                  tickRotation: -45,
                  tickSize: 5,
                  tickPadding: 5
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </CardContent>
        </Card>

        {/* Symptom Segments Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Symptom Segments</CardTitle>
            <p className="text-sm text-muted-foreground">Most common symptom categories</p>
          </CardHeader>
          <CardContent>
            <div style={{ height: '400px' }}>
              <ResponsiveBar
                data={symptomChartData}
                keys={[displayMode === 'count' ? 'count' : 'percentage']}
                indexBy="segment"
                margin={{ top: 20, right: 30, bottom: 80, left: 60 }}
                padding={0.3}
                colors={{ scheme: 'set2' }}
                theme={chartTheme}
                axisBottom={{
                  tickRotation: -45,
                  tickSize: 5,
                  tickPadding: 5
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  legend: displayMode === 'count' ? 'Count' : 'Percentage (%)',
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
              />
            </div>
          </CardContent>
        </Card>

        {/* HRSN Categories Chart */}
        <Card>
          <CardHeader>
            <CardTitle>HRSN Indicators</CardTitle>
            <p className="text-sm text-muted-foreground">Social determinants of health from Z-codes</p>
          </CardHeader>
          <CardContent>
            <div style={{ height: '400px' }}>
              {hrsnChartData.length > 0 ? (
                <ResponsivePie
                  data={hrsnChartData.map(item => ({
                    id: item.category,
                    label: item.category,
                    value: displayMode === 'count' ? item.count : parseFloat(item.percentage)
                  }))}
                  margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  colors={{ scheme: 'paired' }}
                  theme={chartTheme}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  radialLabelsSkipAngle={10}
                  radialLabelsTextColor="#333333"
                  radialLabelsLinkColor={{ from: 'color' }}
                  sliceLabelsSkipAngle={10}
                  sliceLabelsTextColor="#333333"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No HRSN data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demographics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Patient demographics by age range</p>
          </CardHeader>
          <CardContent>
            <div style={{ height: '400px' }}>
              {demographicChartData.length > 0 ? (
                <ResponsivePie
                  data={demographicChartData.map(item => ({
                    id: item.ageRange,
                    label: item.ageRange,
                    value: displayMode === 'count' ? item.count : parseFloat(item.percentage)
                  }))}
                  margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  colors={{ scheme: 'accent' }}
                  theme={chartTheme}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  radialLabelsSkipAngle={10}
                  radialLabelsTextColor="#333333"
                  radialLabelsLinkColor={{ from: 'color' }}
                  sliceLabelsSkipAngle={10}
                  sliceLabelsTextColor="#333333"
                  animate={true}
                  motionStiffness={90}
                  motionDamping={15}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No demographic data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{patients.length.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Patients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{extractedSymptoms.length.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Extracted Symptoms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{diagnosisChartData.length}</div>
              <div className="text-sm text-muted-foreground">Unique Diagnoses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{hrsnChartData.length}</div>
              <div className="text-sm text-muted-foreground">HRSN Categories</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}