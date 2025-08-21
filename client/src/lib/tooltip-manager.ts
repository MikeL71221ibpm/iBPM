// Global tooltip manager to prevent multiple tooltips from appearing simultaneously
// This ensures only one tooltip is visible at a time across all bubble charts

let globalTooltipData: any = null;
let globalTooltipSetters: Set<(data: any) => void> = new Set();

export const tooltipManager = {
  // Register a tooltip setter function
  register: (setter: (data: any) => void) => {
    globalTooltipSetters.add(setter);
    return () => {
      globalTooltipSetters.delete(setter);
    };
  },

  // Set tooltip data and clear all others
  setTooltip: (data: any, currentSetter: (data: any) => void) => {
    globalTooltipData = data;
    
    // Clear all other tooltips
    globalTooltipSetters.forEach(setter => {
      if (setter !== currentSetter) {
        setter(null);
      }
    });
    
    // Set the current tooltip
    currentSetter(data);
  },

  // Clear all tooltips
  clearAll: () => {
    globalTooltipData = null;
    globalTooltipSetters.forEach(setter => {
      setter(null);
    });
  },

  // Get current tooltip data
  getCurrent: () => globalTooltipData
};