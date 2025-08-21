import React, { useMemo } from 'react';
import SimplePieChart from './SimplePieChart';
import SimpleBarChart from './SimpleBarChart';
import { 
  ExtractedSymptom,
  processDataForDiagnosticCategories,
  processDataForSymptomProblems
} from './DataProcessing';

// For precomputed pivot data
interface PieChartData {
  id: string;
  value: number;
}

interface BarChartData {
  id: string;
  value: number;
}

interface VisualizationWrapperProps {
  type: 'diagnosticCategories' | 'symptomProblems';
  data: ExtractedSymptom[];
  pivotData?: PieChartData[] | BarChartData[];
  title?: string;
  excludeCategories?: string[];
  usedPreProcessedData?: boolean;
}

const VisualizationWrapper: React.FC<VisualizationWrapperProps> = ({
  type,
  data,
  pivotData,
  title,
  excludeCategories = [],
  usedPreProcessedData = false,
}) => {
  try {
    // Transform data based on visualization type
    const processedData = useMemo(() => {
      // If we have pivot data, use that directly
      if (pivotData && pivotData.length > 0) {
        console.log(`Using pre-computed pivot data for ${type} (${pivotData.length} items)`);
        return pivotData.filter(item => 
          !excludeCategories.includes(item.id as string)
        );
      }
      
      // Otherwise process the raw data
      if (!data || data.length === 0) {
        return [];
      }
      
      try {
        if (type === 'diagnosticCategories') {
          return processDataForDiagnosticCategories(data)
            .filter(item => !excludeCategories.includes(item.id as string));
        } else if (type === 'symptomProblems') {
          return processDataForSymptomProblems(data)
            .filter(item => !excludeCategories.includes(item.id as string))
            .slice(0, 20); // Limit to top 20 problems for readability
        }
      } catch (error) {
        console.error("Error processing visualization data:", error);
        return [];
      }
      
      return [];
    }, [data, pivotData, type, excludeCategories, usedPreProcessedData]);

    // If no data, display a placeholder
    if (!processedData || processedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
          <p className="text-gray-500">No data available for visualization</p>
        </div>
      );
    }

    // Render pie chart for diagnostic categories
    if (type === 'diagnosticCategories') {
      return (
        <SimplePieChart
          data={processedData}
          title={title}
        />
      );
    }
    
    // Render bar chart for symptom problems
    if (type === 'symptomProblems') {
      return (
        <SimpleBarChart
          data={processedData}
          title={title}
          horizontal={true}
        />
      );
    }
    
    // Default fallback
    return <div>Invalid visualization type</div>;
  } catch (error) {
    console.error("Error in VisualizationWrapper:", error);
    return (
      <div className="flex items-center justify-center h-[400px] bg-red-50 rounded-md p-4">
        <div className="text-center text-red-800">
          <h3 className="font-bold">Visualization Error</h3>
          <p>There was a problem rendering the visualization.</p>
          <p className="text-sm mt-2">{String(error)}</p>
        </div>
      </div>
    );
  }
};

export default VisualizationWrapper;