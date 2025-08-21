import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import ReactLeafletChoropleth from '../components/ReactLeafletChoropleth';

export default function ZipCodeMapPage() {
  const [patientData, setPatientData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState("");
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    // Fetch patient data
    fetch('/api/visualization-data')
      .then(res => res.json())
      .then(data => {
        console.log('Map page data received:', data);
        if (data.patients) {
          console.log('Patient data sample:', data.patients.slice(0, 5));
          console.log('First patient ZIP:', data.patients[0]?.zip_code || data.patients[0]?.zipCode);
          setPatientData(data.patients);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching patient data:', err);
        setLoading(false);
      });
  }, []);

  const handleGenerateZipFile = async () => {
    try {
      setIsGenerating(true);
      setGenerateStatus("Generating patient ZIP codes file...");
      
      const response = await fetch('/api/generate-patient-zipcodes', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setGenerateStatus(data.message);
        // Force reload of the map with new file
        setMapKey(prev => prev + 1);
      } else {
        setGenerateStatus(`Error: ${data.error || 'Failed to generate file'}`);
      }
    } catch (error) {
      console.error('Error generating ZIP file:', error);
      setGenerateStatus('Error generating ZIP file');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/population-health">
              <a className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back to Population Health</span>
              </a>
            </Link>
            <div className="border-l border-gray-300 h-8 mx-2"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ZIP Code Patient Distribution Map</h1>
              <p className="text-sm text-gray-600 mt-1">
                Geographic visualization showing patient density by ZIP code
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <button
                onClick={handleGenerateZipFile}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Download GeoJSON file with ZIP boundaries for use in GIS tools"
              >
                {isGenerating ? 'Generating...' : 'Generate Patient ZIP File'}
              </button>
              <span className="text-xs text-gray-500">Export for GIS analysis</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Patients</div>
              <div className="text-xl font-semibold text-blue-600">{patientData.length.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
      
      {generateStatus && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 text-sm">
          {generateStatus}
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 p-4">
        <div id="choropleth-map-container" className="w-full h-full rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <ReactLeafletChoropleth 
            key={mapKey}
            data={patientData}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}