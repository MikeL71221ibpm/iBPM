import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

interface ChartDisplayModeSwitcherProps {
  data: any;
  isLoading?: boolean;
  renderCountView: (data: any, isLoading?: boolean) => React.ReactNode;
  renderPercentageView: (data: any, isLoading?: boolean) => React.ReactNode;
  defaultMode?: 'count' | 'percentage';
}

/**
 * A component that completely switches between two different renderers
 * for count and percentage views without any animations or transitions.
 * This avoids NaN errors by using separate components for each view.
 */
export function ChartDisplayModeSwitcher({
  data,
  isLoading = false,
  renderCountView,
  renderPercentageView,
  defaultMode = 'count'
}: ChartDisplayModeSwitcherProps) {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>(defaultMode);

  return (
    <div className="w-full">
      {/* Simple toggle with minimal styling */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={displayMode === "count" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayMode("count")}
            className="h-7 px-2 text-xs"
            aria-pressed={displayMode === "count"}
          >
            Count
          </Button>
          <Button
            variant={displayMode === "percentage" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayMode("percentage")}
            className="h-7 px-2 text-xs"
            aria-pressed={displayMode === "percentage"}
          >
            %
          </Button>
        </div>
      </div>

      {/* Completely separate renderers for each mode */}
      {displayMode === 'count' ? (
        <div key="count-view">{renderCountView(data, isLoading)}</div>
      ) : (
        <div key="percentage-view">{renderPercentageView(data, isLoading)}</div>
      )}
    </div>
  );
}