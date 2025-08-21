import React, { useEffect, useState } from 'react';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { ExtractedSymptom } from './DataProcessing';

// Color scheme definitions
const COLOR_SCHEMES: Record<string, string[]> = {
  blues: ['#cfe4ff', '#a5c8fd', '#7dadfc', '#5591f5', '#3275ea', '#185bcd', '#0d429e', '#072e6f', '#031a40'],
  reds: ['#ffd4d4', '#ffaaaa', '#ff8080', '#ff5555', '#ff2a2a', '#e60000', '#b30000', '#800000', '#4d0000'],
  greens: ['#d4ffd4', '#aaffaa', '#80ff80', '#55ff55', '#2aff2a', '#00e600', '#00b300', '#008000', '#004d00'],
  purples: ['#f0d4ff', '#e5aaff', '#d580ff', '#c655ff', '#b72aff', '#9900e6', '#7700b3', '#550080', '#33004d'],
  oranges: ['#ffecd4', '#ffdcaa', '#ffcb80', '#ffba55', '#ffa92a', '#e68a00', '#b36b00', '#804c00', '#4d2d00']
};

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  'Depressive Disorders': '#FF6384',
  'Non-Categorical Disorders': '#36A2EB',
  'Safety': '#FFCD56',
  'Substance-Related Disorders': '#4BC0C0',
  'Bipolar & Related Disorders': '#9966FF',
  'Anxiety Disorders': '#FF9F40',
  'Personality Disorders': '#FFD700',
  'Trauma- and Stressor-Related Disorders': '#8A2BE2',
  'Neurodevelopmental Disorders': '#32CD32',
  'Obsessive-Compulsive and Related Disorders': '#FF4500',
  'Somatic Symptom and Related Disorders': '#1E90FF',
  'Feeding and Eating Disorders': '#FF69B4',
  'Sleep-Wake Disorders': '#9370DB',
  'Sexual Dysfunctions': '#FF7F50',
  'Dissociative Disorders': '#20B2AA',
  'Neurocognitive Disorders': '#BA55D3',
  'Disruptive Impulse-Control and Conduct Disorders': '#D2691E',
  'Tobacco-Related Disorders': '#778899',
  'Breathing-Related Sleep Disorders': '#4682B4',
  'Non-Substance-Related Disorders': '#00CED1',
  'Finances/Financial Stress': '#DAA520',
  'Schizophrenia Spectrum and Other Psychotic Disorders': '#DC143C',
  'Uncategorized': '#C7C7C7'
};

// Support both old direct data prop and new bubbleData format
interface BubbleChartProps {
  data?: ExtractedSymptom[];
  bubbleData?: any;
  title?: string;
  colorScheme?: string;
}

interface ProcessedData {
  name: string;
  children: {
    name: string;
    value: number;
    color: string;
    loc?: number;
  }[];
}

// Helper function for random colors
function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Helper function to get color for category
function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || getRandomColor();
}

// Get color from scheme based on value
function getColorFromScheme(scheme: string, value: number): string {
  // Default to blues if scheme not found
  const colors = COLOR_SCHEMES[scheme] || COLOR_SCHEMES.blues;
  
  // Map the value to a color in the scheme (higher value = deeper color)
  // For simplicity, we'll use a basic scale
  const index = Math.min(Math.floor(value / 10), colors.length - 1);
  return colors[index];
}

const BubbleChart: React.FC<BubbleChartProps> = ({ data, bubbleData, title, colorScheme = 'blues' }) => {
  const [chartData, setChartData] = useState<ProcessedData | null>(null);

  useEffect(() => {
    try {
      let childrenNodes = [];
      
      // Handle bubbleData format (from processSymptomData)
      if (bubbleData && bubbleData.data) {
        console.log("Processing bubble data in new format:", bubbleData);
        
        childrenNodes = bubbleData.data.map((item: any) => ({
          name: item.label || item.id,
          value: item.value,
          color: getColorFromScheme(colorScheme || 'blues', item.value),
          loc: item.value
        }));
      } 
      // Handle direct data format (original)
      else if (data && data.length > 0) {
        console.log("Processing direct data format:", data.length, "items");
        
        // Count symptom occurrences
        const symptomCounts: Record<string, { count: number; category: string }> = {};
        
        data.forEach((item) => {
          const symptom = item.symptom_segment || item.symptomSegment;
          if (!symptom) return;
          
          if (!symptomCounts[symptom]) {
            symptomCounts[symptom] = {
              count: 1,
              category: item.diagnostic_category || item.diagnosticCategory || 'Uncategorized'
            };
          } else {
            symptomCounts[symptom].count++;
          }
        });
        
        childrenNodes = Object.entries(symptomCounts).map(([name, info]) => ({
          name,
          value: info.count,
          color: getCategoryColor(info.category),
          loc: info.count
        }));
      }
      
      // If we have data, format it for the chart
      if (childrenNodes.length > 0) {
        // Sort by value (descending)
        childrenNodes.sort((a: {value: number}, b: {value: number}) => b.value - a.value);
        
        setChartData({
          name: title || 'Data',
          children: childrenNodes
        });
      } else {
        setChartData(null);
      }
    } catch (error) {
      console.error('Error processing data for bubble chart:', error);
      setChartData(null);
    }
  }, [data, bubbleData, title, colorScheme]);

  // Show placeholder if no data
  if (!chartData || !chartData.children || chartData.children.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-md">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  // Render the bubble chart
  return (
    <div className="w-full h-[400px]">
      {title && <h3 className="text-center text-sm font-medium mb-2">{title}</h3>}
      <ResponsiveCirclePacking
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        id="name"
        value="value"
        colors={(node: any) => node.data.color || '#0891b2'}
        padding={6}
        enableLabels={true}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        animate={true}
        tooltip={(node: any) => (
          <div 
            className="bg-white p-2 shadow-md rounded-sm border"
            style={{ pointerEvents: 'none' }}
          >
            <strong>{node.data.name}</strong>: {node.data.value} occurrences
          </div>
        )}
        onMouseLeave={() => {
          // Force tooltip to disappear immediately when mouse leaves any node
        }}
        labelsSkipRadius={10}
      />
    </div>
  );
};

export default BubbleChart;