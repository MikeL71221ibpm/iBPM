import React from 'react';

interface SimpleTestMapProps {
  data: any[];
  title?: string;
}

// ULTRA SIMPLE TEST MAP FOR DEBUGGING
export default function SimpleTestMap({ data, title = "Test Map" }: SimpleTestMapProps) {
  console.log('🔥🔥🔥 SIMPLE TEST MAP: Component loaded and rendering');
  console.log('🔥🔥🔥 SIMPLE TEST MAP: Data length:', data?.length || 0);
  
  return (
    <div className="w-full h-96 bg-gradient-to-r from-blue-100 to-green-100 flex items-center justify-center border-4 border-red-500 rounded-lg">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-blue-800">{title}</h2>
        <p className="text-lg text-green-700 mt-4">TEST MAP IS RENDERING!</p>
        <p className="text-md text-gray-600 mt-2">Data Records: {data?.length || 0}</p>
        <p className="text-sm text-red-600 mt-2">If you see this, the component chain is working</p>
      </div>
    </div>
  );
}