import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface DisplayModeToggleProps {
  mode: "count" | "percentage";
  onChange: (mode: "count" | "percentage") => void;
  className?: string;
}

/**
 * A dedicated component for toggling between count and percentage display modes
 * that properly handles state changes and prevents unnecessary rerenders
 */
export function DisplayModeToggle({
  mode,
  onChange,
  className = ""
}: DisplayModeToggleProps) {
  const [internalMode, setInternalMode] = useState<"count" | "percentage">(mode);
  
  // Keep internal state in sync with parent
  useEffect(() => {
    if (mode !== internalMode) {
      setInternalMode(mode);
    }
  }, [mode]);
  
  const handleModeChange = (newMode: "count" | "percentage") => {
    // Skip if already in this mode
    if (newMode === internalMode) return;
    
    // Update internal state first
    setInternalMode(newMode);
    
    // Notify parent
    onChange(newMode);
  };
  
  return (
    <div className={`flex items-center gap-1 border rounded-md p-1 ${className}`}>
      <Button
        variant={internalMode === "count" ? "default" : "outline"}
        size="sm"
        onClick={() => handleModeChange("count")}
        className="h-7 px-2 text-xs"
        aria-pressed={internalMode === "count"}
      >
        Count
      </Button>
      <Button
        variant={internalMode === "percentage" ? "default" : "outline"}
        size="sm"
        onClick={() => handleModeChange("percentage")}
        className="h-7 px-2 text-xs"
        aria-pressed={internalMode === "percentage"}
      >
        %
      </Button>
    </div>
  );
}