/**
 * Performance Tracking Utility
 * 
 * This module provides functions to track and log performance metrics
 * for key processing steps in the application.
 */

import { logTestEvent } from './testLogger';

interface TimingMarker {
  start: number;
  name: string;
  category: string;
  details?: any;
}

// Store active timing operations
const activeTimers: Map<string, TimingMarker> = new Map();

// Store completed timings
const completedTimings: Array<{
  name: string;
  category: string;
  duration: number;
  timestamp: string;
  details?: any;
}> = [];

/**
 * Start timing a specific operation
 * 
 * @param category The operation category (e.g., 'Search', 'DataProcessing', 'Rendering')
 * @param name The specific operation name
 * @param details Optional details about the operation
 * @returns The timer ID (used to stop the timer)
 */
export function startTimer(category: string, name: string, details?: any): string {
  const timerId = `${category}-${name}-${Date.now()}`;
  
  activeTimers.set(timerId, {
    start: performance.now(),
    name,
    category,
    details
  });
  
  console.log(`TIMER-START: ${category} | ${name}`);
  return timerId;
}

/**
 * Stop timing a specific operation and log the results
 * 
 * @param timerId The timer ID returned by startTimer
 * @param success Whether the operation completed successfully
 * @param additionalDetails Optional additional details to add to the log
 * @returns The duration in milliseconds
 */
export function stopTimer(timerId: string, success: boolean = true, additionalDetails?: any): number {
  const timer = activeTimers.get(timerId);
  if (!timer) {
    console.error(`Timer ${timerId} not found`);
    return 0;
  }
  
  const endTime = performance.now();
  const duration = endTime - timer.start;
  
  // Remove from active timers
  activeTimers.delete(timerId);
  
  // Combine original details with additional details
  const details = {
    ...(timer.details || {}),
    ...(additionalDetails || {}),
    duration
  };
  
  // Add to completed timings
  completedTimings.push({
    name: timer.name,
    category: timer.category,
    duration,
    timestamp: new Date().toISOString(),
    details
  });
  
  // Log the timing information
  console.log(`TIMER-END: ${timer.category} | ${timer.name} | ${duration.toFixed(2)}ms | ${success ? 'SUCCESS' : 'FAILURE'}`);
  
  // Also log as a test event
  logTestEvent(
    timer.category,
    `PERF-${timer.name}`,
    success,
    {
      duration,
      ...details
    }
  );
  
  return duration;
}

/**
 * Time a function execution
 * 
 * @param category The operation category
 * @param name The operation name
 * @param fn The function to time
 * @param details Optional details about the operation
 * @returns The result of the function
 */
export async function timeFunction<T>(
  category: string,
  name: string,
  fn: () => Promise<T> | T,
  details?: any
): Promise<T> {
  const timerId = startTimer(category, name, details);
  try {
    const result = await fn();
    stopTimer(timerId, true);
    return result;
  } catch (error) {
    stopTimer(timerId, false, { error: error.message });
    throw error;
  }
}

/**
 * Get all completed timings
 */
export function getCompletedTimings() {
  return [...completedTimings];
}

/**
 * Clear all completed timings
 */
export function clearCompletedTimings() {
  completedTimings.length = 0;
}

/**
 * Get performance summary by category
 */
export function getPerformanceSummary() {
  const summary = {};
  
  // Group by category
  for (const timing of completedTimings) {
    if (!summary[timing.category]) {
      summary[timing.category] = {
        operations: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        operationBreakdown: {}
      };
    }
    
    const categorySummary = summary[timing.category];
    categorySummary.operations++;
    categorySummary.totalDuration += timing.duration;
    categorySummary.minDuration = Math.min(categorySummary.minDuration, timing.duration);
    categorySummary.maxDuration = Math.max(categorySummary.maxDuration, timing.duration);
    
    // Add to operation breakdown
    if (!categorySummary.operationBreakdown[timing.name]) {
      categorySummary.operationBreakdown[timing.name] = {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      };
    }
    
    const opSummary = categorySummary.operationBreakdown[timing.name];
    opSummary.count++;
    opSummary.totalDuration += timing.duration;
    opSummary.minDuration = Math.min(opSummary.minDuration, timing.duration);
    opSummary.maxDuration = Math.max(opSummary.maxDuration, timing.duration);
  }
  
  // Calculate averages
  for (const category in summary) {
    const categorySummary = summary[category];
    categorySummary.avgDuration = categorySummary.totalDuration / categorySummary.operations;
    
    for (const operation in categorySummary.operationBreakdown) {
      const opSummary = categorySummary.operationBreakdown[operation];
      opSummary.avgDuration = opSummary.totalDuration / opSummary.count;
    }
  }
  
  return summary;
}

/**
 * Download performance summary as JSON
 */
export function downloadPerformanceSummary() {
  const summary = getPerformanceSummary();
  const dataStr = JSON.stringify(summary, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileDefaultName = `performance-summary-${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}