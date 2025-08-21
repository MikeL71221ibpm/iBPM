import React, { useEffect, useState } from 'react';

interface WorkingGeoChartProps {
  title: string;
  data?: any[];
  categoryName?: string;
}

const WorkingGeoChart: React.FC<WorkingGeoChartProps> = ({ title, data = [], categoryName = "" }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    console.log("🚨🚨🚨 WORKING GEO CHART MOUNTED:", title);
    console.log("🗺️ Data:", data?.length || 0, "items");
    setIsLoaded(true);
  }, [title, data]);
  
  const handleClick = () => {
    console.log("🚨🚨🚨 WORKING GEO CHART CLICKED:", title);
  };
  
  console.log("🚨🚨🚨 WORKING GEO CHART RENDER:", title);
  
  return (
    <div 
      className="bg-blue-200 border-2 border-blue-500 p-4 rounded-lg cursor-pointer"
      onClick={handleClick}
    >
      <h3 className="text-blue-800 font-bold text-lg">🗺️ {title}</h3>
      <p className="text-blue-600">Category: {categoryName}</p>
      <p className="text-blue-600">Data Count: {data?.length || 0}</p>
      <p className="text-blue-600">Status: {isLoaded ? "Loaded" : "Loading..."}</p>
      <p className="text-sm text-blue-500 mt-2">Click me to test interaction</p>
    </div>
  );
};

export default WorkingGeoChart;