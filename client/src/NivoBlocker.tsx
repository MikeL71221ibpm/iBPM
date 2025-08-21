// This is a special "blocklist" component that intercepts and blocks any Nivo component imports
// It's a last resort technique to prevent Nivo components from loading when there are
// hard-to-find references in the codebase

import React from 'react';

// Create mock implementations of all Nivo components
const nivoComponentNames = [
  'ResponsiveHeatMap',
  'HeatMap',
  'ResponsiveBubble',
  'Bubble',
  'ResponsiveCirclePacking',
  'CirclePacking',
  'ResponsivePie',
  'Pie',
  'ResponsiveBar',
  'Bar',
  'ResponsiveLine',
  'Line',
  'ResponsiveScatterPlot',
  'ScatterPlot',
  'ResponsiveNetwork',
  'Network',
  'ResponsiveTreeMap',
  'TreeMap',
  'ResponsiveSunburst',
  'Sunburst',
  'ResponsiveWaffle',
  'Waffle',
  'ResponsiveRadar',
  'Radar',
  'ResponsiveChord',
  'Chord',
  'ResponsiveSankey',
  'Sankey',
  'ResponsiveCalendar',
  'Calendar',
  'ResponsiveTimeRange',
  'TimeRange',
  'ResponsiveStream',
  'Stream',
  'ResponsiveSwarmPlot',
  'SwarmPlot',
  'ResponsiveBump',
  'Bump',
  'ResponsiveParallelCoordinates',
  'ParallelCoordinates',
  'ResponsiveVoronoi',
  'Voronoi',
  'ResponsiveMarimekko',
  'Marimekko',
];

// Function to create a placeholder component
const createPlaceholderComponent = (name: string) => {
  const PlaceholderComponent = (props: any) => {
    console.log(`⚠️ Attempted to use ${name} - this is blocked to prevent rendering issues`);
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">
        <h3 className="font-bold">Visualization Error</h3>
        <p>The {name} component from Nivo is blocked to prevent application crashes.</p>
        <p className="text-sm">Please use the simplified visualization components instead.</p>
      </div>
    );
  };
  
  return PlaceholderComponent;
};

// Create all the mock components
const mockComponents: Record<string, React.FC<any>> = {};
nivoComponentNames.forEach(name => {
  mockComponents[name] = createPlaceholderComponent(name);
});

// Export all mock components
export const {
  ResponsiveHeatMap,
  HeatMap,
  ResponsiveBubble,
  Bubble,
  ResponsiveCirclePacking,
  CirclePacking,
  ResponsivePie,
  Pie,
  ResponsiveBar,
  Bar,
  ResponsiveLine,
  Line,
  ResponsiveScatterPlot,
  ScatterPlot,
  ResponsiveNetwork,
  Network,
  ResponsiveTreeMap,
  TreeMap,
  ResponsiveSunburst,
  Sunburst,
  ResponsiveWaffle,
  Waffle,
  ResponsiveRadar,
  Radar,
  ResponsiveChord,
  Chord,
  ResponsiveSankey,
  Sankey,
  ResponsiveCalendar,
  Calendar,
  ResponsiveTimeRange,
  TimeRange,
  ResponsiveStream,
  Stream,
  ResponsiveSwarmPlot,
  SwarmPlot,
  ResponsiveBump,
  Bump,
  ResponsiveParallelCoordinates,
  ParallelCoordinates,
  ResponsiveVoronoi,
  Voronoi,
  ResponsiveMarimekko,
  Marimekko,
} = mockComponents;

// Mock the hooks too
export const useHeatMapCanvas = () => {
  console.log('⚠️ Attempted to use useHeatMapCanvas - this is blocked to prevent rendering issues');
  return null;
};

// Create an initialization function to intercept imports
export const initNivoBlocker = () => {
  console.log('🛡️ Nivo Blocker initialized - preventing Nivo components from loading');
  
  // Try to monkey patch any existing Nivo imports in the global namespace
  try {
    if (typeof window !== 'undefined') {
      // Create a mock for any Nivo package
      const mockExport = (packageName: string) => {
        const mockPackage = new Proxy({}, {
          get: (target, prop) => {
            if (typeof prop === 'string') {
              console.log(`⚠️ Attempted to access ${packageName}.${String(prop)} - blocked`);
              if (nivoComponentNames.includes(prop)) {
                return createPlaceholderComponent(prop);
              }
            }
            return () => null;
          }
        });
        
        return mockPackage;
      };
      
      // Try to intercept various Nivo packages
      const nivoPackages = [
        '@nivo/heatmap',
        '@nivo/circle-packing',
        '@nivo/pie',
        '@nivo/bar',
        '@nivo/line',
        '@nivo/scatterplot',
        '@nivo/network',
        '@nivo/treemap',
        '@nivo/sunburst',
        '@nivo/waffle',
        '@nivo/radar',
        '@nivo/chord',
        '@nivo/sankey',
        '@nivo/calendar',
        '@nivo/stream',
      ];
      
      // Create a mock for each package
      nivoPackages.forEach(packageName => {
        // @ts-ignore
        if (!window[packageName]) {
          // @ts-ignore
          window[packageName] = mockExport(packageName);
        }
      });
    }
  } catch (error) {
    console.error('Failed to intercept Nivo imports:', error);
  }
};

// Export a component that will initialize the blocker
export const NivoBlocker: React.FC = () => {
  React.useEffect(() => {
    initNivoBlocker();
  }, []);
  
  return null;
};

export default NivoBlocker;