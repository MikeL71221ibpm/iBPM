import React from 'react';

// Patient data interface
interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface TestChoroplethMapProps {
  data: Patient[];
  title?: string;
}

// SIMPLE TEST COMPONENT TO VERIFY RENDERING
export default function TestChoroplethMap({ data, title = "Test Geographic Component" }: TestChoroplethMapProps) {
  
  // CRITICAL DEBUG: Always log when component is called
  console.log('🗺️🚨 TEST CHOROPLETH: Component called with props:', {
    dataLength: data?.length || 0,
    title,
    hasData: Array.isArray(data),
    dataType: typeof data,
    isDataNull: data === null,
    isDataUndefined: data === undefined
  });
  
  console.log('🗺️🚨 TEST CHOROPLETH: Component executing successfully');
  
  return (
    <div className="w-full h-full bg-red-100 border-4 border-red-500 flex items-center justify-center">
      <div className="text-center p-4">
        <div className="text-xl font-bold text-red-600 mb-2">🗺️ TEST MAP COMPONENT</div>
        <div className="text-lg text-gray-700">Data: {data?.length || 0} patients</div>
        <div className="text-lg text-gray-700">Title: {title}</div>
        <div className="text-sm text-gray-500 mt-2">✅ Component is rendering successfully!</div>
        <div className="text-xs text-gray-400 mt-1">This confirms React can load the component</div>
      </div>
    </div>
  );
}