import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SymptomData {
  symptom_segment: string;
  count: number;
  unique_patients: number;
}

interface AuthenticSymptomChartsProps {
  data?: any;
  isLoading?: boolean;
}

export default function AuthenticSymptomCharts({ data, isLoading }: AuthenticSymptomChartsProps) {
  const [symptomData, setSymptomData] = useState<SymptomData[]>([]);

  // Process the data passed as props to extract symptom segment statistics
  useEffect(() => {
    if (data && data.extractedSymptoms) {
      // Group symptoms by segment and count occurrences
      const symptomCounts: Record<string, { count: number; patients: Set<string> }> = {};
      
      data.extractedSymptoms.forEach((symptom: any) => {
        const segment = symptom.symptom_segment || symptom.symptomSegment || 'Unknown';
        const patientId = symptom.patient_id || symptom.patientId || symptom.id;
        
        if (!symptomCounts[segment]) {
          symptomCounts[segment] = { count: 0, patients: new Set() };
        }
        
        symptomCounts[segment].count++;
        if (patientId) {
          symptomCounts[segment].patients.add(patientId);
        }
      });

      // Convert to chart data format
      const chartData = Object.entries(symptomCounts).map(([segment, stats]) => ({
        symptom_segment: segment,
        count: stats.count,
        unique_patients: stats.patients.size
      })).sort((a, b) => b.count - a.count); // Sort by count descending

      setSymptomData(chartData);
    }
  }, [data]);

  const chartColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899'];

  const barData = symptomData.map((item, index) => ({
    id: item.symptom_segment,
    value: item.count,
    color: chartColors[index % chartColors.length]
  }));

  const pieData = symptomData.map((item, index) => ({
    id: item.symptom_segment,
    label: item.symptom_segment,
    value: item.count,
    color: chartColors[index % chartColors.length]
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading authentic symptom data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Authentic Symptom Analysis</h2>
        <p className="text-gray-600 mt-2">
          Based on {symptomData.reduce((sum, item) => sum + item.count, 0)} authentic extracted symptoms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symptom Segments Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Symptom Segments Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveBar
                data={barData}
                keys={['value']}
                indexBy="id"
                margin={{ top: 50, right: 50, bottom: 80, left: 60 }}
                padding={0.3}
                colors={{ datum: 'data.color' }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: 'Symptom Segments',
                  legendPosition: 'middle',
                  legendOffset: 60
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Count',
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                enableLabel={true}
                labelTextColor="#000000"
                animate={true}
                motionConfig="gentle"
              />
            </div>
          </CardContent>
        </Card>

        {/* Symptom Segments Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Symptom Categories Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsivePie
                data={pieData}
                margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                colors={{ datum: 'data.color' }}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#333333"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#000000"
                animate={true}
                motionConfig="gentle"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Authentic Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {symptomData.length}
              </div>
              <div className="text-sm text-gray-600">Symptom Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {symptomData.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Symptoms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {symptomData.reduce((sum, item) => sum + item.unique_patients, 0)}
              </div>
              <div className="text-sm text-gray-600">Unique Patients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {symptomData.length > 0 ? 
                  Math.round(symptomData.reduce((sum, item) => sum + item.count, 0) / 
                  symptomData.reduce((sum, item) => sum + item.unique_patients, 0) * 100) / 100 : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Symptoms/Patient</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QA Validation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Assurance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Button 
              onClick={() => window.open('/qa-analytics', '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              View QA Validation Matrix
            </Button>
            <p className="text-sm text-gray-600 mt-2">
              Clinical validation tracking with true positives, false negatives, and accuracy metrics
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}