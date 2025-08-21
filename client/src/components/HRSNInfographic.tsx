import React from 'react';

interface HRSNInfographicProps {
  title: string;
  totalPatients: number;
  affectedCount: number;
  categoryName: string;
  showPercentage?: boolean;
}

export function HRSNInfographic({ 
  title, 
  totalPatients, 
  affectedCount,
  categoryName,
  showPercentage = true
}: HRSNInfographicProps) {
  const unaffectedCount = totalPatients - affectedCount;
  const affectedPercentage = ((affectedCount / totalPatients) * 100).toFixed(1);
  const unaffectedPercentage = ((unaffectedCount / totalPatients) * 100).toFixed(1);

  // Format the category name for display
  const formatCategoryName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const displayTitle = title || formatCategoryName(categoryName);

  return (
    <div className="w-full h-full flex flex-col bg-white p-4 rounded-lg border border-gray-300">
      {/* Title */}
      <h3 className="text-sm font-bold text-gray-800 text-center mb-3 pb-2 border-b border-gray-300">
        {displayTitle}
      </h3>
      
      {/* HRSN Data Display */}
      <div className="flex-grow">
        <div className="text-xs font-semibold text-gray-700 mb-2 text-center border-b border-gray-300 pb-1">
          {formatCategoryName(categoryName)} Status
        </div>
        <div className="space-y-1">
          {/* Yes/Affected */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-700">
              <span className="font-medium mr-1">#1</span>
              Yes
            </span>
            <span className="font-semibold text-gray-900">
              {affectedCount} ({affectedPercentage}%)
            </span>
          </div>
          
          {/* No/Unaffected */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-700">
              <span className="font-medium mr-1">#2</span>
              No
            </span>
            <span className="font-semibold text-gray-900">
              {unaffectedCount} ({unaffectedPercentage}%)
            </span>
          </div>
        </div>
        
        {/* Additional Statistics - No spacing */}
        <div className="text-xs text-gray-600 text-center mt-0">
          Affected: {affectedCount} of {totalPatients} patients
        </div>
      </div>
    </div>
  );
}