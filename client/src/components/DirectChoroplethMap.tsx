import React, { useRef, useEffect, useState, useMemo } from 'react';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface DirectChoroplethMapProps {
  data: Patient[];
  title?: string;
}

// DIRECT CANVAS CHOROPLETH - BASED ON WORKING BACKUP IMPLEMENTATIONS
export default function DirectChoroplethMap({ data, title = "Direct ZIP Code Choropleth" }: DirectChoroplethMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  console.log('🔥 DIRECT CHOROPLETH: Component initialized with', data?.length || 0, 'patients');
  
  // Process patient ZIP codes - COPIED FROM WORKING BACKUP
  const zipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    if (!data || data.length === 0) {
      console.log('🔥 DIRECT CHOROPLETH: No data provided');
      return counts;
    }
    
    data.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
      }
    });
    
    console.log('🔥 DIRECT CHOROPLETH: Processed', Object.keys(counts).length, 'ZIP codes');
    console.log('🔥 DIRECT CHOROPLETH: Top ZIP codes:', Object.entries(counts).slice(0, 5));
    
    return counts;
  }, [data]);

  // Load GeoJSON boundaries - SIMPLIFIED FROM BACKUP
  useEffect(() => {
    const loadBoundaries = async () => {
      try {
        console.log('🔥 DIRECT CHOROPLETH: Loading boundaries...');
        setLoading(true);
        
        const response = await fetch('/us-zipcodes-sample.geojson');
        console.log('🔥 DIRECT CHOROPLETH: Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`);
        }
        
        const json = await response.json();
        console.log('🔥 DIRECT CHOROPLETH: Loaded', json?.features?.length || 0, 'features');
        
        setGeoData(json.features || []);
        setLoading(false);
        
      } catch (err) {
        console.error('🔥 DIRECT CHOROPLETH: Error loading:', err);
        setLoading(false);
        
        // Create fallback visualization
        const fallbackData = Object.entries(zipCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20);
        
        console.log('🔥 DIRECT CHOROPLETH: Using fallback with', fallbackData.length, 'ZIP codes');
        setGeoData(fallbackData.map(([zip, count]) => ({ zip, count })));
      }
    };
    
    if (Object.keys(zipCounts).length > 0) {
      loadBoundaries();
    }
  }, [zipCounts]);

  // Canvas rendering - DIRECT APPROACH FROM BACKUP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    console.log('🔥 DIRECT CHOROPLETH: Starting Canvas render...');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 500;
    
    // Clear with light blue background
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 30);
    
    // Create grid layout for top ZIP codes
    const sortedZips = Object.entries(zipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);
    
    if (sortedZips.length === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px Arial';
      ctx.fillText('No ZIP code data available', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const maxCount = Math.max(...sortedZips.map(([,count]) => count));
    const cols = 5;
    const rows = Math.ceil(sortedZips.length / cols);
    const cellWidth = (canvas.width - 60) / cols;
    const cellHeight = (canvas.height - 100) / rows;
    
    sortedZips.forEach(([zip, count], index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = 30 + col * cellWidth;
      const y = 60 + row * cellHeight;
      
      // Color by density
      const intensity = count / maxCount;
      let fillColor = '#dbeafe'; // Light blue
      if (intensity > 0.8) fillColor = '#1d4ed8'; // Dark blue
      else if (intensity > 0.6) fillColor = '#3b82f6'; // Medium blue
      else if (intensity > 0.4) fillColor = '#60a5fa'; // Light medium blue
      else if (intensity > 0.2) fillColor = '#93c5fd'; // Very light blue
      
      // Draw cell
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, cellWidth - 2, cellHeight - 2);
      
      // Draw border
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellWidth - 2, cellHeight - 2);
      
      // Draw ZIP code
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(zip, x + cellWidth / 2, y + cellHeight / 2 - 8);
      
      // Draw count
      ctx.font = '10px Arial';
      ctx.fillText(`${count} patients`, x + cellWidth / 2, y + cellHeight / 2 + 8);
    });
    
    // Draw legend
    ctx.fillStyle = '#1e40af';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Total: ${data?.length || 0} patients across ${Object.keys(zipCounts).length} ZIP codes`, 30, canvas.height - 10);
    
    console.log('🔥 DIRECT CHOROPLETH: Canvas rendering complete');
    
  }, [zipCounts, geoData, loading, title, data]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-gradient-to-r from-blue-100 to-green-100 flex items-center justify-center border-4 border-blue-500 rounded-lg">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-blue-800">Loading Geographic Data...</h2>
          <p className="text-lg text-green-700 mt-4">Fetching ZIP code boundaries...</p>
          <p className="text-md text-gray-600 mt-2">Processing {data?.length || 0} patient records</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">
          Interactive choropleth map showing patient distribution by ZIP code
        </p>
      </div>
      
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 rounded-lg shadow-lg cursor-pointer"
          style={{ maxWidth: '100%', height: 'auto' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            console.log('🔥 DIRECT CHOROPLETH: Canvas clicked at:', x, y);
          }}
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-600 text-center">
        <span className="font-medium">Data Summary:</span> {data?.length || 0} patients • {Object.keys(zipCounts).length} ZIP codes • 
        <span className="ml-2">Click map for details</span>
      </div>
    </div>
  );
}