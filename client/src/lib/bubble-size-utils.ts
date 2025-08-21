/**
 * Standard bubble sizing utility for consistent sizing across all visualizations
 * Using the 8px to 22px scale: 1=8px, 2=12px, 3=15px, 4=18px, 5+=22px
 */

/**
 * Calculates standardized bubble size based on value (1-5+)
 * @param value The value to calculate size for (typically frequency or intensity)
 * @returns Bubble radius in pixels (8px to 22px)
 */
export function calculateBubbleSize(value: number): number {
  // Make sure value is a positive number
  const validValue = Math.max(0, Math.round(value));
  
  // Enhanced bubble sizing with bigger differences for better visibility
  if (validValue >= 5) return 22;  // Value 5+: 22px radius (much larger)
  if (validValue === 4) return 18; // Value 4: 18px radius
  if (validValue === 3) return 15; // Value 3: 15px radius
  if (validValue === 2) return 12; // Value 2: 12px radius
  if (validValue === 1) return 8;  // Value 1: 8px radius (smaller for contrast)
  return 0;                      // Value 0: No radius (shouldn't be visible)
}

/**
 * BubbleSize scale lookup for quick reference - Enhanced sizing for better visibility
 */
export const BUBBLE_SIZE_SCALE = {
  VALUE_1: 8,  // 8px radius (small for contrast)
  VALUE_2: 12, // 12px radius
  VALUE_3: 15, // 15px radius
  VALUE_4: 18, // 18px radius
  VALUE_5_PLUS: 22 // 22px radius for 5 and above (much larger)
};

/**
 * Get display size of bubble (for simple HTML/CSS bubbles)
 * This doubles the radius for diameter and adds padding
 * @param value The value to calculate size for
 * @returns Size in pixels for width/height CSS properties
 */
export function getBubbleDisplaySize(value: number): number {
  const radius = calculateBubbleSize(value);
  return radius * 2; // Return diameter
}