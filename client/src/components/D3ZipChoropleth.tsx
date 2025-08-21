import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface D3ZipChoroplethProps {
  data: Patient[];
  title?: string;
}

export default function D3ZipChoropleth({ data, title = "ZIP Code Patient Distribution Map" }: D3ZipChoroplethProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Process patient data into ZIP counts
  const zipCounts = useMemo(() => {
    console.log('🗺️ D3 CHOROPLETH: Processing', data?.length || 0, 'patients');
    
    const counts: Record<string, number> = {};
    
    data?.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        // Normalize ZIP to 5-digit format (3034 → 03034)
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
      }
    });
    
    console.log('🗺️ D3 CHOROPLETH: Found', Object.keys(counts).length, 'unique ZIP codes');
    console.log('🗺️ D3 CHOROPLETH: Top ZIPs:', Object.entries(counts).slice(0, 5));
    
    return counts;
  }, [data]);

  // Color scale for patient density
  const colorScale = useMemo(() => {
    const maxCount = Math.max(...Object.values(zipCounts), 1);
    return d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxCount]);
  }, [zipCounts]);

  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(zipCounts), 0);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = 800;
    const height = 500;

    // Set up projection for US map
    const projection = d3.geoAlbersUsa()
      .scale(1000)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Load and render ZIP code boundaries
    d3.json('/us-zipcodes-real.geojson').then((geoData: any) => {
      console.log('🗺️ D3 CHOROPLETH: Loaded GeoJSON with', geoData.features?.length || 0, 'ZIP boundaries');
      
      if (!geoData || !geoData.features) {
        console.error('🗺️ D3 CHOROPLETH ERROR: Invalid GeoJSON data structure');
        return;
      }

      // Create tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '1000');

      // Draw ZIP code polygons
      console.log('🗺️ D3 CHOROPLETH: Starting to draw', geoData.features.length, 'ZIP polygons');
      
      const paths = svg.selectAll('.zip-path')
        .data(geoData.features)
        .enter()
        .append('path')
        .attr('class', 'zip-path')
        .attr('d', path)
        .attr('fill', (d: any) => {
          const zipCode = d.properties?.ZCTA5CE20 || d.properties?.GEOID || d.properties?.NAME;
          const patientCount = zipCode ? zipCounts[zipCode] || 0 : 0;
          
          if (patientCount > 0) {
            console.log('🗺️ D3 CHOROPLETH: Coloring ZIP', zipCode, 'with', patientCount, 'patients');
          }
          
          const fillColor = patientCount > 0 ? colorScale(patientCount) : '#f3f4f6';
          console.log('🗺️ D3 CHOROPLETH: ZIP', zipCode, 'gets color', fillColor);
          return fillColor;
        })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .on('mouseover', function(event: any, d: any) {
          const zipCode = d.properties?.ZCTA5CE20 || d.properties?.GEOID || d.properties?.NAME;
          const patientCount = zipCode ? zipCounts[zipCode] || 0 : 0;
          
          if (patientCount > 0) {
            d3.select(this)
              .attr('stroke', '#333')
              .attr('stroke-width', 2);
            
            tooltip
              .style('visibility', 'visible')
              .html(`<strong>ZIP Code: ${zipCode}</strong><br>Patients: ${patientCount}`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          }
        })
        .on('mousemove', function(event: any) {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 0.5);
          
          tooltip.style('visibility', 'hidden');
        })
        .on('click', function(event: any, d: any) {
          const zipCode = d.properties?.ZCTA5CE20 || d.properties?.GEOID || d.properties?.NAME;
          const patientCount = zipCode ? zipCounts[zipCode] || 0 : 0;
          
          if (patientCount > 0) {
            alert(`ZIP Code ${zipCode}\nPatients: ${patientCount}`);
          }
        });

    }).catch(error => {
      console.error('🗺️ D3 CHOROPLETH ERROR: Failed to load GeoJSON:', error);
      
      // Show error message in SVG
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .style('font-size', '16px')
        .text('Error loading ZIP code boundaries');
    });

    // Cleanup tooltip on unmount
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };

  }, [zipCounts, colorScale]);

  return (
    <div className="w-full h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
        <div className="flex gap-4 text-sm text-blue-700 mt-2">
          <span>📊 Total Patients: {totalPatients.toLocaleString()}</span>
          <span>📍 ZIP Codes: {Object.keys(zipCounts).length}</span>
          <span>🔥 Max per ZIP: {maxCount}</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[500px] w-full bg-gray-100 overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 800 500"
          style={{ background: '#f9fafb' }}
        />
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50">
        <h4 className="text-sm font-semibold mb-2 text-gray-700">Patient Density Scale</h4>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-300 border"></div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#deebf7' }}></div>
            <span>1-5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#9ecae1' }}></div>
            <span>6-10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#6baed6' }}></div>
            <span>11-15</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#3182bd' }}></div>
            <span>16-20</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#08519c' }}></div>
            <span>20+</span>
          </div>
        </div>
      </div>
    </div>
  );
}