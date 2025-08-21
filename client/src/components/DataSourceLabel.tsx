import React from 'react';

interface DataSourceLabelProps {
  source: 'real' | 'synthetic' | 'unknown' | 'processing';
  className?: string;
}

const DataSourceLabel: React.FC<DataSourceLabelProps> = ({ source, className = '' }) => {
  let bgColor = 'bg-gray-200';
  let textColor = 'text-gray-700';
  let label = 'Unknown Data Source';
  
  if (source === 'real') {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
    label = 'Real Patient Data';
  } else if (source === 'synthetic') {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-800';
    label = 'Synthetic Data';
  } else if (source === 'processing') {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
    label = 'Processing Real Data';
  }
  
  return (
    <div className={`rounded-md px-2 py-1 text-xs font-medium ${bgColor} ${textColor} ${className}`}>
      {label}
    </div>
  );
};

export default DataSourceLabel;