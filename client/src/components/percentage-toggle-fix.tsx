import React from "react";
import { Button } from "@/components/ui/button";

interface PercentageToggleFixProps {
  displayMode: "count" | "percentage";
  onChange: (mode: "count" | "percentage") => void;
}

/**
 * Simple toggle between count and percentage view with no animation
 * This component avoids NaN issues by not using animated transitions
 */
export function PercentageToggleFix({ displayMode, onChange }: PercentageToggleFixProps) {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button
        variant={displayMode === "count" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("count")}
        className="h-7 px-2 text-xs"
        aria-pressed={displayMode === "count"}
      >
        Count
      </Button>
      <Button
        variant={displayMode === "percentage" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("percentage")}
        className="h-7 px-2 text-xs"
        aria-pressed={displayMode === "percentage"}
      >
        %
      </Button>
    </div>
  );
}