import React from 'react';
import { ResponsiveHeatMap, DefaultHeatMapDatum } from '@nivo/heatmap';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar, BarDatum } from '@nivo/bar';

// Default empty dummy data for different chart types
const EMPTY_HEATMAP_DATA = [{ id: 'empty', data: [{ x: 'empty', y: 0 }] }];
const EMPTY_PIE_DATA = [{ id: 'empty', value: 0, label: 'No Data' }];
const EMPTY_BAR_DATA = [{ id: 'empty', value: 0 }];

// Error boundary wrapper - base class for visualization components
class VisualizationErrorBoundary extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Visualization rendering error:", error, errorInfo);
  }

  renderErrorUI() {
    return (
      <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Visualization Error</p>
          <p className="text-sm text-gray-500">There was a problem rendering this visualization.</p>
        </div>
      </div>
    );
  }

  renderEmptyUI() {
    return (
      <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No data available</p>
          <p className="text-sm text-gray-400">Please extract symptoms to view this visualization.</p>
        </div>
      </div>
    );
  }
}

// Type for HeatMap props - Override default type to make props optional
interface HeatMapWrapperProps extends Partial<React.ComponentProps<typeof ResponsiveHeatMap>> {
  data?: Array<{id: string, data: Array<{x: string | number, y: number}>}>;
}

// Error boundary wrapper for HeatMap
export class HeatMapWrapper extends React.Component<HeatMapWrapperProps, { hasError: boolean }> {
  constructor(props: HeatMapWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  // Add this to prevent unnecessary updates that could cause infinite loops
  shouldComponentUpdate(nextProps: HeatMapWrapperProps, nextState: { hasError: boolean }) {
    // Only update if error state changed
    if (this.state.hasError !== nextState.hasError) {
      return true;
    }
    
    // Only update if data changed significantly
    const currentData = this.props.data || [];
    const nextData = nextProps.data || [];
    
    // Quick check for reference equality
    if (currentData === nextData) {
      return false;
    }
    
    // Check length change
    if (currentData.length !== nextData.length) {
      return true;
    }
    
    // Avoid deep comparisons that might be expensive
    // Instead use shallow comparison of important props
    const currentKeys = JSON.stringify(currentData.map(item => item.id));
    const nextKeys = JSON.stringify(nextData.map(item => item.id));
    
    return currentKeys !== nextKeys;
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("HeatMap rendering error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Visualization Error</p>
            <p className="text-sm text-gray-500">There was a problem rendering this visualization.</p>
          </div>
        </div>
      );
    }

    // Apply props but ensure data is valid
    const data = this.props.data || [];
    
    // Try to detect if data structure is valid - each item should have an id and data array
    const isDataValid = Array.isArray(data) && data.length > 0 && 
      data.every(item => item && typeof item === 'object' && 'id' in item && Array.isArray(item.data));
    
    // If data isn't valid, render placeholder UI
    if (!isDataValid) {
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-gray-500 font-medium">No data available</p>
            <p className="text-sm text-gray-400">Please extract symptoms to view this visualization.</p>
          </div>
        </div>
      );
    }

    // Render actual heatmap with fixed props
    try {
      // Extract any key prop to avoid spreading it into child components
      const { key, ...restProps } = this.props as any; // Cast to any to avoid TypeScript error
      // Important: Clone data to prevent reference issues
      const safeData = JSON.parse(JSON.stringify(data));
      return <ResponsiveHeatMap {...restProps} data={safeData} />;
    } catch (error) {
      console.error("Error rendering HeatMap:", error);
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Visualization Error</p>
            <p className="text-sm text-gray-500">There was a problem rendering this visualization.</p>
          </div>
        </div>
      );
    }
  }
}

// Type for Pie chart props
interface PieWrapperProps extends Partial<React.ComponentProps<typeof ResponsivePie>> {
  data?: Array<{id: string, value: number, label?: string}>;
}

// Error boundary wrapper for Pie chart
export class PieWrapper extends React.Component<PieWrapperProps, { hasError: boolean }> {
  constructor(props: PieWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  // Add similar optimization to prevent infinite updates
  shouldComponentUpdate(nextProps: PieWrapperProps, nextState: { hasError: boolean }) {
    // Update if error state changed
    if (this.state.hasError !== nextState.hasError) {
      return true;
    }
    
    // Only update if data changed significantly
    const currentData = this.props.data || [];
    const nextData = nextProps.data || [];
    
    // Quick reference check
    if (currentData === nextData) {
      return false;
    }
    
    // Check length change
    if (currentData.length !== nextData.length) {
      return true;
    }
    
    // Shallow comparison of important props
    const currentKeys = JSON.stringify(currentData.map(item => item.id));
    const nextKeys = JSON.stringify(nextData.map(item => item.id));
    
    return currentKeys !== nextKeys;
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Pie chart rendering error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Visualization Error</p>
            <p className="text-sm text-gray-500">There was a problem rendering this visualization.</p>
          </div>
        </div>
      );
    }

    // Apply props but ensure data is valid
    const data = this.props.data || [];
    
    // Try to detect if data structure is valid - each item should have id and value
    const isDataValid = Array.isArray(data) && data.length > 0 && 
      data.every(item => item && typeof item === 'object' && 'id' in item && 'value' in item);
    
    // If data isn't valid, render placeholder UI
    if (!isDataValid) {
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-gray-500 font-medium">No data available</p>
            <p className="text-sm text-gray-400">Please extract symptoms to view this visualization.</p>
          </div>
        </div>
      );
    }

    // Render actual pie chart with fixed props
    try {
      // Extract any key prop to avoid spreading it into child components
      const { key, ...restProps } = this.props as any; // Cast to any to avoid TypeScript error
      // Important: Clone data to prevent reference issues
      const safeData = JSON.parse(JSON.stringify(data));
      return <ResponsivePie {...restProps} data={safeData} />;
    } catch (error) {
      console.error("Error rendering Pie chart:", error);
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Visualization Error</p>
            <p className="text-sm text-gray-500">There was a problem rendering this visualization.</p>
          </div>
        </div>
      );
    }
  }
}

// Type for Bar chart props
interface BarWrapperProps extends Partial<React.ComponentProps<typeof ResponsiveBar>> {
  data?: Array<BarDatum>;
}

// Error boundary wrapper for Bar chart
export class BarWrapper extends React.Component<BarWrapperProps, { hasError: boolean }> {
  constructor(props: BarWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  // Add similar performance optimization
  shouldComponentUpdate(nextProps: BarWrapperProps, nextState: { hasError: boolean }) {
    // Always update for error state changes
    if (this.state.hasError !== nextState.hasError) {
      return true;
    }
    
    // Only update if data changed significantly
    const currentData = this.props.data || [];
    const nextData = nextProps.data || [];
    
    // Quick equality check
    if (currentData === nextData) {
      return false;
    }
    
    // Check length change
    if (currentData.length !== nextData.length) {
      return true;
    }
    
    // Only do a more detailed check if necessary
    // For bar charts, just do a simple check based on stringified length
    // since bar chart data might not have consistent ID fields
    try {
      const currentStr = JSON.stringify(currentData).length;
      const nextStr = JSON.stringify(nextData).length;
      
      // Only update if the data has actually changed significantly
      return Math.abs(currentStr - nextStr) > 5; // Allow small differences
    } catch (e) {
      // If we can't compare, err on the side of updating
      return true;
    }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Bar chart rendering error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Visualization Error</p>
            <p className="text-sm text-gray-500">There was a problem rendering this visualization.</p>
          </div>
        </div>
      );
    }

    // Apply props but ensure data is valid
    const data = this.props.data || [];
    
    // Try to detect if data structure is valid
    const isDataValid = Array.isArray(data) && data.length > 0;
    
    // If data isn't valid, render placeholder UI
    if (!isDataValid) {
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-gray-500 font-medium">No data available</p>
            <p className="text-sm text-gray-400">Please extract symptoms to view this visualization.</p>
          </div>
        </div>
      );
    }

    // Render actual bar chart with fixed props
    try {
      // Extract any key prop to avoid spreading it into child components
      const { key, ...restProps } = this.props as any; // Cast to any to avoid TypeScript error
      // Important: Clone data to prevent reference issues
      const safeData = JSON.parse(JSON.stringify(data));
      return <ResponsiveBar {...restProps} data={safeData} />;
    } catch (error) {
      console.error("Error rendering Bar chart:", error);
      return (
        <div className="flex items-center justify-center h-full border rounded-md bg-gray-50 p-4">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">Visualization Error</p>
            <p className="text-sm text-gray-500">There was a problem rendering this visualization.</p>
          </div>
        </div>
      );
    }
  }
}