export interface ProcessingMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  patientsProcessed: number;
  symptomsExtracted: number;
  notesAnalyzed: number;
  errorCount: number;
  averageProcessingTime: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface ExtractionStatus {
  status: 'idle' | 'initializing' | 'processing' | 'completed' | 'error' | 'paused';
  stage: 'setup' | 'loading_segments' | 'processing_patients' | 'batch_processing' | 'finalizing';
  progress: number;
  currentPatient?: string;
  currentBatch?: number;
  totalBatches?: number;
  message: string;
  timestamp: number;
  metrics?: ProcessingMetrics;
}

export interface DatabaseHealth {
  connectionStatus: 'healthy' | 'degraded' | 'critical';
  queryPerformance: {
    averageResponseTime: number;
    slowQueries: number;
    failedQueries: number;
  };
  poolStatus: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
  };
}

export interface SystemHealth {
  database: DatabaseHealth;
  extraction: ExtractionStatus;
  lastHealthCheck: number;
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

export function createProcessingMetrics(): ProcessingMetrics {
  return {
    startTime: Date.now(),
    patientsProcessed: 0,
    symptomsExtracted: 0,
    notesAnalyzed: 0,
    errorCount: 0,
    averageProcessingTime: 0
  };
}

export function updateProcessingMetrics(
  metrics: ProcessingMetrics, 
  patientsProcessed: number, 
  symptomsExtracted: number, 
  notesAnalyzed: number
): ProcessingMetrics {
  const now = Date.now();
  const duration = now - metrics.startTime;
  
  return {
    ...metrics,
    endTime: now,
    duration,
    patientsProcessed,
    symptomsExtracted,
    notesAnalyzed,
    averageProcessingTime: patientsProcessed > 0 ? duration / patientsProcessed : 0
  };
}