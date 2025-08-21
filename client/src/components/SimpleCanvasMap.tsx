// Simple Canvas Map Component - Direct Canvas rendering test
import React, { useRef, useEffect } from 'react';

interface SimpleCanvasMapProps {
  data: any[];
  title?: string;
}

export default function SimpleCanvasMap({ data, title = "Simple Canvas Test" }: SimpleCanvasMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('🎨 SIMPLE CANVAS: Component mounted with', data?.length || 0, 'patients');
    console.log('🎨 SIMPLE CANVAS: Canvas ref available:', !!canvasRef.current);
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('🎨 SIMPLE CANVAS: ERROR - No canvas ref');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('🎨 SIMPLE CANVAS: ERROR - No 2D context');
      return;
    }

    console.log('🎨 SIMPLE CANVAS: Starting to draw...');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 400;

    // Clear canvas with blue background
    ctx.fillStyle = '#e6f3ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(title, 20, 40);

    // Draw patient count
    ctx.font = '16px Arial';
    ctx.fillText(`Patients: ${data?.length || 0}`, 20, 70);

    // Draw some test rectangles representing ZIP codes
    const zipColors = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];
    const zipCodes = ['10026', '04002', '19106', '02813', '07002'];

    zipCodes.forEach((zip, i) => {
      const x = 50 + (i * 120);
      const y = 100;
      const width = 100;
      const height = 80;

      // Draw rectangle
      ctx.fillStyle = zipColors[i];
      ctx.fillRect(x, y, width, height);
      
      // Draw border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw ZIP code label
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(zip, x + 25, y + 45);

      // Draw patient count
      ctx.font = '12px Arial';
      ctx.fillText(`${Math.floor(Math.random() * 50)} patients`, x + 15, y + 65);
    });

    // Draw legend
    ctx.fillStyle = '#1f2937';
    ctx.font = '14px Arial';
    ctx.fillText('Canvas Rendering Test - ZIP Code Boundaries', 20, 220);
    ctx.font = '12px Arial';
    ctx.fillText('This confirms Canvas drawing works correctly', 20, 240);

    console.log('🎨 SIMPLE CANVAS: Drawing completed successfully');

  }, [data, title]);

  return (
    <div className="w-full bg-white border rounded-lg overflow-hidden">
      <div className="p-3 bg-green-50 border-b">
        <h3 className="font-semibold text-green-900">🎨 Simple Canvas Test</h3>
        <div className="text-sm text-green-700 mt-1">
          Testing Canvas rendering with {data?.length || 0} patients
        </div>
      </div>
      <div className="p-4">
        <canvas 
          ref={canvasRef} 
          className="w-full border border-gray-200 rounded"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        <div className="mt-2 text-xs text-gray-600">
          Canvas test: If you see colored rectangles above, Canvas rendering works
        </div>
      </div>
    </div>
  );
}