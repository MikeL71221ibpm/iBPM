import React, { useMemo } from 'react';

interface Patient {
  patient_id: string;
  zip_code: string;
  [key: string]: any;
}

interface SimpleZipMapProps {
  data: Patient[];
  title?: string;
}

export default function SimpleZipMap({ data, title = "Geographic Distribution" }: SimpleZipMapProps) {
  console.log("🗺️ SIMPLE ZIP MAP COMPONENT CALLED:", {
    dataLength: data?.length || 0,
    title,
    sampleData: data?.slice(0, 3).map(p => ({ patient_id: p.patient_id, zip_code: p.zip_code })) || []
  });

  // Process geographic data from patient ZIP codes
  const geographicData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    const zipCounts = data.reduce((acc, patient) => {
      if (patient.zip_code) {
        const zip = String(patient.zip_code).padStart(5, '0');
        acc[zip] = (acc[zip] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(zipCounts).map(([zip, count]) => ({
      zip_code: zip,
      patient_count: count,
      state: zip.substring(0, 2) // First 2 digits for state grouping
    }));

    console.log("🗺️ Geographic data processed:", {
      totalPatients: data.length,
      zipCodesFound: result.length,
      topZips: result.sort((a, b) => b.patient_count - a.patient_count).slice(0, 5)
    });

    return result;
  }, [data]);

  // Get state distribution for coverage summary
  const stateDistribution = useMemo(() => {
    const states = geographicData.reduce((acc, zip) => {
      const stateCode = zip.zip_code.substring(0, 2);
      acc[stateCode] = (acc[stateCode] || 0) + zip.patient_count;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(states)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [geographicData]);

  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          <p>No patient data available for geographic analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600 mt-1">
          Patient Distribution: {geographicData.length} ZIP codes, {data.length} patients
        </p>
      </div>
      
      {/* Working Geographic Analysis */}
      <div className="p-4 space-y-4 h-80 overflow-y-auto">
        {/* Top ZIP Codes */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
          <h4 className="text-base font-semibold text-blue-900 mb-3">Top 8 ZIP Codes by Patient Density</h4>
          <div className="space-y-2">
            {geographicData
              .sort((a, b) => b.patient_count - a.patient_count)
              .slice(0, 8)
              .map((zip, index) => {
                const maxPatients = Math.max(...geographicData.map(d => d.patient_count));
                const percentage = ((zip.patient_count / maxPatients) * 100).toFixed(0);
                
                return (
                  <div key={zip.zip_code} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-slate-700 w-12">
                        {zip.zip_code}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[120px]">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-blue-700 ml-3">
                      {zip.patient_count} patients
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
        
        {/* State Coverage Summary */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
          <h4 className="text-base font-semibold text-green-900 mb-3">State-Level Geographic Coverage</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-800">Top States by Patient Count:</p>
              {stateDistribution.slice(0, 3).map((state, index) => (
                <div key={state.code} className="flex justify-between text-sm">
                  <span className="text-green-700">State {state.code}:</span>
                  <span className="font-semibold text-green-800">{state.count} patients</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-800">Coverage Statistics:</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-green-700">Total ZIP Codes:</span>
                  <span className="font-semibold text-green-800">{geographicData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">States Covered:</span>
                  <span className="font-semibold text-green-800">{stateDistribution.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Avg Patients/ZIP:</span>
                  <span className="font-semibold text-green-800">{Math.round(data.length / geographicData.length)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}