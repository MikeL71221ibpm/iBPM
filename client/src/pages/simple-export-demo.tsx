import React, { useState } from 'react';

// Ultra simple component with zero dependencies
export default function SimpleExportDemo() {
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Sample data
  const data = [
    { id: 'Housing Insecurity', value: 18, percentage: 75 },
    { id: 'Food Insecurity', value: 12, percentage: 50 },
    { id: 'Transportation', value: 9, percentage: 37.5 },
    { id: 'Utilities', value: 6, percentage: 25 },
    { id: 'Safety', value: 3, percentage: 12.5 }
  ];

  const [displayMode, setDisplayMode] = useState('count');

  // Simple CSV export
  const exportCSV = () => {
    const headers = "Indicator,Value,Percentage\n";
    const rows = data.map(item => `"${item.id}",${item.value},${item.percentage}`).join('\n');
    const csvContent = headers + rows;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hrsn-data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple JSON export
  const exportJSON = () => {
    const jsonContent = JSON.stringify({
      metadata: {
        exportDate: new Date().toISOString(),
        displayMode,
        totalRecords: data.length
      },
      data
    }, null, 2);
    
    // Create download link
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hrsn-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Simple Export Demo</h1>
      <p>This is an ultra-simple demo with no dependencies at all.</p>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setDisplayMode('count')}
          style={{ 
            padding: '8px 16px', 
            marginRight: '10px',
            backgroundColor: displayMode === 'count' ? '#4a90e2' : '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        >
          Count View
        </button>
        <button 
          onClick={() => setDisplayMode('percentage')}
          style={{ 
            padding: '8px 16px',
            backgroundColor: displayMode === 'percentage' ? '#4a90e2' : '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        >
          Percentage View
        </button>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '15px',
        marginBottom: '20px',
        position: 'relative'
      }}>
        <button
          onClick={() => setShowExportOptions(!showExportOptions)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {showExportOptions ? 'Hide Export Options' : 'Show Export Options'}
        </button>

        <h2>HRSN Indicators</h2>
        
        {showExportOptions && (
          <div style={{ 
            backgroundColor: '#333', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px' 
          }}>
            <span style={{ color: 'white', marginRight: '10px', fontWeight: 'bold' }}>EXPORT OPTIONS:</span>
            <button 
              onClick={exportCSV} 
              style={{ 
                backgroundColor: '#2874d1', 
                color: 'white', 
                border: 'none', 
                padding: '5px 10px', 
                borderRadius: '4px', 
                marginRight: '5px', 
                cursor: 'pointer' 
              }}
            >
              CSV
            </button>
            <button 
              onClick={exportJSON} 
              style={{ 
                backgroundColor: '#e67e22', 
                color: 'white', 
                border: 'none', 
                padding: '5px 10px', 
                borderRadius: '4px', 
                marginRight: '5px', 
                cursor: 'pointer' 
              }}
            >
              JSON
            </button>
            <button 
              onClick={handlePrint} 
              style={{ 
                backgroundColor: '#7f8c8d', 
                color: 'white', 
                border: 'none', 
                padding: '5px 10px', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              Print
            </button>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Indicator</th>
              <th style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                {displayMode === 'count' ? 'Value' : 'Percentage'}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {displayMode === 'count' ? item.value : `${item.percentage}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '15px' }}>
          {data.map(item => (
            <div key={item.id} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{item.id}</span>
                <span style={{ fontWeight: 'bold' }}>
                  {displayMode === 'count' ? item.value : `${item.percentage}%`}
                </span>
              </div>
              <div style={{ height: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${item.percentage}%`,
                    backgroundColor: '#4a90e2'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2>Raw Data</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}