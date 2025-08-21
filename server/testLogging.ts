/**
 * Server-side test logging utility
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Ensure the log directory exists
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const TEST_LOG_FILE = path.join(LOG_DIR, 'test-logs.json');
const TEST_SUMMARY_FILE = path.join(LOG_DIR, 'test-summary.json');

// Initialize log files if they don't exist
if (!fs.existsSync(TEST_LOG_FILE)) {
  fs.writeFileSync(TEST_LOG_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(TEST_SUMMARY_FILE)) {
  fs.writeFileSync(TEST_SUMMARY_FILE, JSON.stringify({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testsByComponent: {},
    lastUpdated: new Date().toISOString()
  }, null, 2));
}

interface TestLogEntry {
  id: string;        // Unique identifier for the test
  component: string; // Component being tested
  action: string;    // Action being performed
  result: boolean;   // Whether the test passed or failed
  details?: any;     // Additional details about the test
  timestamp: string; // When the test was performed
  duration?: number; // Duration in milliseconds
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testsByComponent: Record<string, {
    total: number;
    passed: number;
    failed: number;
  }>;
  lastUpdated: string;
}

/**
 * Handle test log submissions from the client
 */
export function handleTestLog(req: Request, res: Response) {
  try {
    const logEntry: TestLogEntry = req.body;
    
    // Validate log entry
    if (!logEntry.id || !logEntry.component || !logEntry.action || logEntry.result === undefined) {
      return res.status(400).json({ message: 'Invalid test log entry' });
    }
    
    // Add timestamp if not provided
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString();
    }
    
    // Read existing logs
    const existingLogs = JSON.parse(fs.readFileSync(TEST_LOG_FILE, 'utf-8')) as TestLogEntry[];
    
    // Add new log
    existingLogs.push(logEntry);
    
    // Write updated logs
    fs.writeFileSync(TEST_LOG_FILE, JSON.stringify(existingLogs, null, 2));
    
    // Update summary
    updateTestSummary();
    
    console.log(`Test log added: ${logEntry.component} | ${logEntry.action} | ${logEntry.result ? 'PASS' : 'FAIL'}`);
    
    return res.status(201).json({ message: 'Test log added successfully' });
  } catch (error) {
    console.error('Error handling test log:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get all test logs
 */
export function getTestLogs(req: Request, res: Response) {
  try {
    const logs = JSON.parse(fs.readFileSync(TEST_LOG_FILE, 'utf-8'));
    return res.json(logs);
  } catch (error) {
    console.error('Error getting test logs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get test summary
 */
export function getTestSummary(req: Request, res: Response) {
  try {
    let summary: TestSummary;
    
    // Check if summary file exists
    if (fs.existsSync(TEST_SUMMARY_FILE)) {
      summary = JSON.parse(fs.readFileSync(TEST_SUMMARY_FILE, 'utf-8'));
    } else {
      // Generate summary if it doesn't exist
      summary = generateTestSummary();
      fs.writeFileSync(TEST_SUMMARY_FILE, JSON.stringify(summary, null, 2));
    }
    
    return res.json(summary);
  } catch (error) {
    console.error('Error getting test summary:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update the test summary file
 */
function updateTestSummary() {
  try {
    const summary = generateTestSummary();
    fs.writeFileSync(TEST_SUMMARY_FILE, JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('Error updating test summary:', error);
  }
}

/**
 * Generate a summary of all test logs
 */
function generateTestSummary(): TestSummary {
  const summary: TestSummary = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    testsByComponent: {},
    lastUpdated: new Date().toISOString()
  };
  
  try {
    // Read test logs
    const logs = JSON.parse(fs.readFileSync(TEST_LOG_FILE, 'utf-8')) as TestLogEntry[];
    
    // Update summary counts
    summary.totalTests = logs.length;
    summary.passedTests = logs.filter(log => log.result).length;
    summary.failedTests = logs.filter(log => !log.result).length;
    
    // Group by component
    const componentMap = new Map<string, { total: number, passed: number, failed: number }>();
    
    for (const log of logs) {
      if (!componentMap.has(log.component)) {
        componentMap.set(log.component, { total: 0, passed: 0, failed: 0 });
      }
      
      const componentStats = componentMap.get(log.component)!;
      componentStats.total++;
      
      if (log.result) {
        componentStats.passed++;
      } else {
        componentStats.failed++;
      }
    }
    
    // Convert map to object
    componentMap.forEach((stats, component) => {
      summary.testsByComponent[component] = stats;
    });
  } catch (error) {
    console.error('Error generating test summary:', error);
  }
  
  return summary;
}

/**
 * Clear all test logs
 */
export function clearTestLogs(req: Request, res: Response) {
  try {
    // Clear logs
    fs.writeFileSync(TEST_LOG_FILE, JSON.stringify([], null, 2));
    
    // Reset summary
    const emptySummary: TestSummary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testsByComponent: {},
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(TEST_SUMMARY_FILE, JSON.stringify(emptySummary, null, 2));
    
    return res.json({ message: 'Test logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing test logs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}