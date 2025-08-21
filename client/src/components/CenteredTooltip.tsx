import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CenteredTooltipProps {
  content: string;
  isVisible: boolean;
  onClose: () => void;
  chartRef: React.RefObject<HTMLDivElement>;
}

export const CenteredTooltip: React.FC<CenteredTooltipProps> = ({
  content,
  isVisible,
  onClose,
  chartRef
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && chartRef.current) {
      const chartRect = chartRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      
      // Position tooltip at center of chart
      tooltip.style.left = `${chartRect.left + chartRect.width / 2}px`;
      tooltip.style.top = `${chartRect.top + chartRect.height / 2}px`;
      tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }, [isVisible, chartRef]);

  if (!isVisible || !content) return null;

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      style={{
        position: 'fixed',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 leading-tight">
          {content}
        </span>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-0.5 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close tooltip"
        >
          <X className="h-3 w-3 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export default CenteredTooltip;