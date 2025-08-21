/**
 * Test Logging Utility
 * 
 * This module provides functions to log test events from the UI components.
 * It captures test results and can optionally send them to the server.
 */

interface TestLogEntry {
  id: string;        // Unique identifier for the test
  component: string; // Component being tested
  action: string;    // Action being performed
  result: boolean;   // Whether the test passed or failed
  details?: any;     // Additional details about the test
  timestamp: string; // When the test was performed
  duration?: number; // Duration in milliseconds
}

// Global array to store test logs
const testLogs: TestLogEntry[] = [];

/**
 * Log a test event
 * 
 * @param component The component being tested (e.g., 'Search', 'Auth', 'Payment')
 * @param action The specific action being tested
 * @param result Whether the test passed (true) or failed (false)
 * @param details Optional details about the test
 * @returns The created log entry
 */
export function logTestEvent(
  component: string,
  action: string,
  result: boolean,
  details?: any
): TestLogEntry {
  const testId = `${component}-${action}`.toUpperCase();
  
  const entry: TestLogEntry = {
    id: testId,
    component,
    action,
    result,
    details,
    timestamp: new Date().toISOString()
  };
  
  // Store locally
  testLogs.push(entry);
  
  // Output to console in a recognizable format for automated tools
  console.log(`TEST-LOG: ${component} | ${action} | ${result ? 'SUCCESS' : 'FAILURE'}`, details);
  
  // Optional: Send to server
  try {
    fetch('/api/test-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(err => console.error('Failed to log test event to server', err));
  } catch (error) {
    console.error('Error sending test log to server', error);
  }
  
  return entry;
}

/**
 * Get all test logs
 */
export function getTestLogs(): TestLogEntry[] {
  return [...testLogs];
}

/**
 * Clear all test logs
 */
export function clearTestLogs(): void {
  testLogs.length = 0;
}

/**
 * Download test logs as JSON
 */
export function downloadTestLogs(): void {
  const dataStr = JSON.stringify(testLogs, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileDefaultName = `test-logs-${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}