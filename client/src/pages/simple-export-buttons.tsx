// Simple Export Buttons Demo - May 23, 2025
// A minimal demo showing just the enhanced export buttons functionality

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sampleData = [
  { id: "Housing instability", value: 312, percentage: 24 },
  { id: "Food insecurity", value: 267, percentage: 21 },
  { id: "Transportation barriers", value: 241, percentage: 19 },
  { id: "Financial strain", value: 182, percentage: 14 },
  { id: "Utility needs", value: 156, percentage: 12 }
];

// Super simple custom export button component for demo purposes
function ExportButtons() {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
      <button 
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
        onClick={() => console.log("CSV export")}
      >
        <span className="w-3 h-3">📊</span>
        <span>CSV</span>
      </button>
      
      <button 
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
        onClick={() => console.log("Detailed export")}
      >
        <span className="w-3 h-3">📥</span>  
        <span>Detailed</span>
      </button>
      
      <button 
        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
        onClick={() => console.log("Excel export")}
      >
        <span className="w-3 h-3">📑</span>
        <span>Excel</span>
      </button>
      
      <button 
        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
        onClick={() => console.log("JSON export")}
      >
        <span className="w-3 h-3">🗄️</span>
        <span>JSON</span>
      </button>
      
      <button 
        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
        onClick={() => window.print()}
      >
        <span className="w-3 h-3">🖨️</span>
        <span>Print</span>
      </button>
    </div>
  );
}

export default function SimpleExportButtons() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">High-Visibility Export Buttons Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Demo chart 1 */}
        <Card className="relative overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">HRSN Indicators</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[350px] relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg text-muted-foreground">Chart Content Placeholder</div>
            </div>
            
            {/* Export buttons */}
            <ExportButtons />
          </CardContent>
        </Card>
        
        {/* Demo chart 2 */}
        <Card className="relative overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Symptom Segments</CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[350px] relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg text-muted-foreground">Chart Content Placeholder</div>
            </div>
            
            {/* Export buttons */}
            <ExportButtons />
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>High-Visibility Export Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">Key Features:</h3>
              <ul className="list-disc pl-6 mt-2">
                <li>Colorful, high-contrast buttons for improved visibility</li>
                <li>All 5 options (CSV, Detailed, Excel, JSON, Print) clearly visible at once</li>
                <li>Each button has both an icon and text label for clarity</li>
                <li>Positioned consistently at the top-right of each chart</li>
                <li>Bold text and drop shadows for better visual prominence</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold">Implementation:</h3>
              <p>This simplified demo shows the basic UI styles for the export buttons. The full component includes all file export functionality.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}