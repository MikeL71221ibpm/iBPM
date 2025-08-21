/**
 * Helper functions to manage display mode persistence
 */

// Save display mode to localStorage
export function saveDisplayMode(mode: 'count' | 'percentage'): void {
  try {
    localStorage.setItem('hrsnDisplayMode', mode);
  } catch (e) {
    console.error('Failed to save display mode:', e);
  }
}

// Load display mode from localStorage
export function loadDisplayMode(): 'count' | 'percentage' {
  try {
    const savedMode = localStorage.getItem('hrsnDisplayMode');
    return (savedMode === 'percentage' ? 'percentage' : 'count');
  } catch (e) {
    console.error('Failed to load display mode:', e);
    return 'count';
  }
}

// Clear stored display mode
export function clearDisplayMode(): void {
  try {
    localStorage.removeItem('hrsnDisplayMode');
  } catch (e) {
    console.error('Failed to clear display mode:', e);
  }
}