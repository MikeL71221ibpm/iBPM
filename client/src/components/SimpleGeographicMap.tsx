import React, { useEffect, useState, useRef } from 'react';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface SimpleGeographicMapProps {
  data: Patient[];
  title?: string;
}

// SIMPLIFIED GEOGRAPHIC MAP FOR DEBUGGING
export default function SimpleGeographicMap({ data, title = "Geographic ZIP Code Distribution" }: SimpleGeographicMapProps) {
  const [status, setStatus] = useState('initializing');
  const [geoData, setGeoData] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  console.log('🗺️ SIMPLE MAP: Component loaded with', data?.length || 0, 'patients');
  
  useEffect(() => {
    const loadAndRender = async () => {
      try {
        setStatus('loading');
        console.log('🗺️ SIMPLE MAP: Starting load process...');
        
        const response = await fetch('/us-zipcodes-sample.geojson');
        console.log('🗺️ SIMPLE MAP: Fetch response:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const json = await response.json();
        console.log('🗺️ SIMPLE MAP: JSON loaded, features:', json?.features?.length || 0);
        
        setGeoData(json.features || []);
        setStatus('loaded');
        console.log('🗺️ SIMPLE MAP: State updated to loaded');
        
        // Simple canvas test
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0284c7';
            ctx.font = '20px Arial';
            ctx.fillText('Geographic Map Loading...', 20, 50);
            ctx.fillText(`Features: ${json?.features?.length || 0}`, 20, 80);
            ctx.fillText(`Patients: ${data?.length || 0}`, 20, 110);
            console.log('🗺️ SIMPLE MAP: Canvas test drawn');
          }
        }
        
      } catch (error) {
        console.error('🗺️ SIMPLE MAP: Error:', error);
        setStatus('error');
      }
    };
    
    loadAndRender();
  }, [data]);
  
  return (
    <div className="w-full bg-white border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="text-sm mb-2">Status: {status}</div>
      <div className="text-sm mb-2">GeoData Features: {geoData.length}</div>
      <div className="text-sm mb-4">Patient Records: {data?.length || 0}</div>
      
      <canvas 
        ref={canvasRef}
        width={800} 
        height={400}
        className="border border-gray-300 w-full"
        style={{ maxWidth: '100%' }}
      />
      
      {status === 'error' && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error loading geographic data. Check console for details.
        </div>
      )}
    </div>
  );
}