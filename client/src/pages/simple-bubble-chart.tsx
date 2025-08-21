import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Define types for clarity
interface DataPoint {
  x: string;
  y: string;
  intensity: number;
  frequency: number;
}

// Sample color scale
const COLORS = {
  HIGHEST: '#994C99', // Highest - Deep purple 
  HIGH: '#8856A7',    // High - Dark purple
  MEDIUM: '#8C96C6',  // Medium - Purple
  LOW: '#B3CDE3',     // Low - Blue/purple
  LOWEST: '#EDF8FB',  // Lowest - Light blue/purple
};

// Main component
export default function SimpleBubbleChart() {
  const { patientId } = useParams<{ patientId?: string }>();
  const displayId = patientId || '1';

  // Create sample data points with varying intensities and frequencies
  const sampleData: DataPoint[] = [
    { x: "1/1/2024", y: "Anxiety (16)", intensity: 16, frequency: 16 },
    { x: "1/2/2024", y: "Depression (12)", intensity: 12, frequency: 2 },
    { x: "1/3/2024", y: "Fatigue (8)", intensity: 8, frequency: 8 },
    { x: "1/4/2024", y: "Insomnia (8)", intensity: 8, frequency: 4 },
    { x: "1/5/2024", y: "Pain (5)", intensity: 5, frequency: 5 },
    { x: "1/6/2024", y: "Stress (4)", intensity: 4, frequency: 1 },
    { x: "1/7/2024", y: "Headache (1)", intensity: 1, frequency: 1 },
  ];

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Simple Bubble Chart</CardTitle>
          <CardDescription>Testing bubble colors and sizes with direct rendering</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm mb-4">
            <p>This chart demonstrates bubbles with:</p>
            <ul className="list-disc ml-6">
              <li>Size based on frequency (how many sessions)</li>
              <li>Color based on intensity (total occurrences)</li>
            </ul>
          </div>
          
          <div className="flex flex-wrap gap-6 p-4 bg-slate-50 rounded-md">
            {sampleData.map((point, index) => {
              // Determine color based on intensity
              let color;
              if (point.intensity >= 11) color = COLORS.HIGHEST;
              else if (point.intensity >= 8) color = COLORS.HIGH;
              else if (point.intensity >= 5) color = COLORS.MEDIUM;
              else if (point.intensity >= 2) color = COLORS.LOW;
              else color = COLORS.LOWEST;
              
              // Calculate bubble size based on frequency using new standardized scale
              let size;
              if (point.frequency >= 10) size = 46; // Double the radius for display (23px * 2)
              else if (point.frequency === 9) size = 42; // (21px * 2)
              else if (point.frequency === 8) size = 38; // (19px * 2)
              else if (point.frequency === 7) size = 34; // (17px * 2)
              else if (point.frequency === 6) size = 30; // (15px * 2)
              else if (point.frequency === 5) size = 26; // (13px * 2)
              else if (point.frequency === 4) size = 22; // (11px * 2)
              else if (point.frequency === 3) size = 18; // (9px * 2)
              else if (point.frequency === 2) size = 14; // (7px * 2)
              else size = 10; // (5px * 2)
              
              return (
                <div key={index} className="flex flex-col items-center justify-center mb-4">
                  <div
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div className="mt-2 text-xs text-center max-w-[100px]">
                    <div className="font-medium">{point.y}</div>
                    <div>Intensity: {point.intensity}</div>
                    <div>Frequency: {point.frequency}</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 text-sm">
            <div className="font-medium mb-2">Explanation:</div>
            <div>
              <strong>Example 1:</strong> Anxiety with intensity 16 and frequency 16 is large and dark purple
            </div>
            <div>
              <strong>Example 2:</strong> Depression with intensity 12 and frequency 2 is small and also dark purple
            </div>
            <div className="mt-2">
              This demonstrates how two symptoms can have:
              <ul className="list-disc ml-6 mt-1">
                <li>Similar colors (both have high intensity values over 11)</li>
                <li>Very different sizes (16 sessions vs 2 sessions)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}