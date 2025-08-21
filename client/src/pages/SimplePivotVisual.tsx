import React, { useState, useEffect } from 'react';

type PivotData = {
  [key: string]: any;
  rows?: string[];
};

type PivotTables = {
  symptomPivotTable: PivotData;
  diagnosisPivotTable: PivotData;
  diagnosticCategoryPivotTable: PivotData;
  hrsnPivotTable: PivotData;
};

function formatDate(dateStr: string) {
  if (!dateStr || dateStr === 'rows') return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year.slice(2)}`;
}

function generateColorStyle(value: number, maxValue: number) {
  // Return a background color based on the value
  if (value === 0) return { backgroundColor: '#f8fafc' };
  
  const intensity = Math.min(0.9, Math.max(0.1, value / maxValue));
  
  if (intensity < 0.25) {
    return { backgroundColor: '#dbeafe' }; // light blue
  } else if (intensity < 0.5) {
    return { backgroundColor: '#93c5fd' }; // medium blue
  } else if (intensity < 0.75) {
    return { backgroundColor: '#60a5fa' }; // darker blue
  } else {
    return { backgroundColor: '#3b82f6', color: 'white' }; // deep blue with white text
  }
}

function PivotTable({ data, title }: { data: PivotData; title: string }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <div className="bg-gray-50 p-4 text-center text-gray-500 rounded">
          No data available
        </div>
      </div>
    );
  }
  
  // Extract dates (columns) and sort them chronologically
  const dates = Object.keys(data)
    .filter(key => key !== 'rows')
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  // Find max value for color scaling
  let maxValue = 0;
  data.rows.forEach(row => {
    dates.forEach(date => {
      const value = data[date]?.[row] || 0;
      if (value > maxValue) maxValue = value;
    });
  });
  
  return (
    <div className="mb-8 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <table className="min-w-full border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border-b border-r sticky left-0 bg-gray-50 z-10">
              {title.split(' ')[0]}
            </th>
            {dates.map(date => (
              <th key={date} className="p-2 border-b whitespace-nowrap text-center">
                {formatDate(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row}>
              <td className="p-2 border-r font-medium sticky left-0 bg-white z-10">
                {row}
              </td>
              {dates.map(date => {
                const value = data[date]?.[row] || 0;
                return (
                  <td
                    key={`${row}-${date}`}
                    className="p-2 border text-center"
                    style={generateColorStyle(value, maxValue)}
                  >
                    {value || ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimplePivotVisual() {
  const [patientId, setPatientId] = useState('1');
  const [inputPatientId, setInputPatientId] = useState('1');
  const [pivotData, setPivotData] = useState<PivotTables | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientId(inputPatientId);
  };
  
  useEffect(() => {
    async function fetchPivotData() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/simple-pivot-debug?patientId=${patientId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setPivotData(data);
      } catch (err: any) {
        console.error('Error fetching pivot data:', err);
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPivotData();
  }, [patientId]);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Patient Data Visualization</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
              Patient ID
            </label>
            <input
              type="text"
              id="patientId"
              value={inputPatientId}
              onChange={(e) => setInputPatientId(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate Visualizations
          </button>
        </form>
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => { setInputPatientId('1'); setPatientId('1'); }}
            className={`px-3 py-1 rounded-md ${patientId === '1' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Patient 1
          </button>
          <button
            onClick={() => { setInputPatientId('10'); setPatientId('10'); }}
            className={`px-3 py-1 rounded-md ${patientId === '10' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Patient 10
          </button>
          <button
            onClick={() => { setInputPatientId('100'); setPatientId('100'); }}
            className={`px-3 py-1 rounded-md ${patientId === '100' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Patient 100
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {pivotData && !loading && (
        <div className="space-y-8">
          <PivotTable 
            data={pivotData.symptomPivotTable} 
            title="Symptom Visualization"
          />
          
          <PivotTable 
            data={pivotData.diagnosisPivotTable} 
            title="Diagnosis Visualization"
          />
          
          <PivotTable 
            data={pivotData.diagnosticCategoryPivotTable} 
            title="Diagnostic Category Visualization"
          />
          
          <PivotTable 
            data={pivotData.hrsnPivotTable} 
            title="HRSN Z-Code Visualization"
          />
          
          <div className="mt-8 border-t pt-4">
            <h2 className="text-xl font-semibold mb-2">Raw Pivot Tables</h2>
            <a 
              href={`/direct/${patientId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded inline-block"
            >
              View Raw Pivot Tables
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimplePivotVisual;