import React from 'react';
import { Database, Brain, GitMerge, AlertCircle } from 'lucide-react';

interface DualSourceIndicatorProps {
  dataSource: 'dual_sources' | 'customer_only' | 'insights_only' | 'no_data';
  className?: string;
  showText?: boolean;
}

const DualSourceIndicator: React.FC<DualSourceIndicatorProps> = ({ 
  dataSource, 
  className = "", 
  showText = true 
}) => {
  // Debug logging to see what dataSource value we're receiving
  console.log('🔍 DualSourceIndicator received dataSource:', dataSource);
  
  const getIndicatorConfig = (source: string) => {
    switch (source) {
      case 'dual_sources':
        return {
          icon: GitMerge,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          text: 'Combined Data',
          description: 'Customer data + Algorithm insights'
        };
      case 'customer_only':
        return {
          icon: Database,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Customer Data',
          description: 'Original customer records'
        };
      case 'insights_only':
        return {
          icon: Brain,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Algorithm Insights',
          description: 'Generated from clinical notes'
        };
      case 'no_data':
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'No Data',
          description: 'No data available'
        };
    }
  };

  const config = getIndicatorConfig(dataSource);
  const Icon = config.icon;

  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${config.bgColor} ${config.borderColor} ${className}`}
      title={config.description}
    >
      <Icon className={`w-3 h-3 ${config.color}`} />
      {showText && (
        <span className={`text-xs font-medium ${config.color}`}>
          {config.text}
        </span>
      )}
    </div>
  );
};

export default DualSourceIndicator;