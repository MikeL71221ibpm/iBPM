// Test Geographic Map Chart Component
// Simplified test to verify React component execution

import React from 'react';

interface TestGeoMapChartProps {
  title: string;
}

const TestGeoMapChart: React.FC<TestGeoMapChartProps> = ({ title }) => {
  console.log("🚨🚨🚨 TEST GEO COMPONENT EXECUTING - NIGHT SESSION:", title);
  console.log("🗺️🚨 COMPONENT MOUNTED AT:", new Date().toLocaleTimeString());
  
  // Force component to be visible regardless of any conditions
  React.useEffect(() => {
    console.log("🚨 EMERGENCY: TestGeoMapChart useEffect executed");
    console.log("🚨 EMERGENCY: Component is being forced to render");
  }, []);
  
  return (
    <div className="bg-red-500 border-4 border-yellow-500 p-6 rounded-lg shadow-lg">
      <h3 className="text-white font-bold text-lg">🚨 EMERGENCY RENDER SUCCESS: {title}</h3>
      <p className="text-white">If you can see this, components ARE rendering!</p>
      <p className="text-yellow-200 text-xs">Timestamp: {new Date().toLocaleTimeString()}</p>
      <p className="text-yellow-200 text-xs">Status: FORCED RENDER WORKING</p>
    </div>
  );
};

export default TestGeoMapChart;