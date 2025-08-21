/**
 * ALGORITHM PROTECTION SYSTEM
 * 
 * This system creates an immutable protection layer that prevents any deviation
 * from approved extraction methods without explicit user authorization.
 */

import fs from 'fs';
import crypto from 'crypto';
import { db } from '../db';

interface ProtectedMethod {
  name: string;
  hash: string;
  approved: boolean;
  version: string;
  maxExecutionTime: number;
  requiredSignature: string;
}

export class AlgorithmProtector {
  private static readonly APPROVED_METHODS: ProtectedMethod[] = [
    {
      name: 'BULK_SQL_EXTRACTION',
      hash: 'sha256_bulk_sql_v3_3_4',
      approved: true,
      version: '3.3.4',
      maxExecutionTime: 1200, // 20 minutes
      requiredSignature: 'BULK_SQL_ONLY_AUTHORIZED'
    }
  ];

  private static readonly FORBIDDEN_METHODS: string[] = [
    'PATIENT_BY_PATIENT',
    'INDIVIDUAL_PROCESSING',
    'SEQUENTIAL_EXTRACTION',
    'LOOP_BASED_EXTRACTION'
  ];

  /**
   * CRITICAL: Validate extraction method before ANY processing begins
   */
  public static validateMethod(methodName: string): void {
    console.log(`ALGORITHM GUARD: Validating method '${methodName}'`);

    // Check if method is explicitly forbidden
    if (this.FORBIDDEN_METHODS.includes(methodName)) {
      const error = `ALGORITHM VIOLATION: Method '${methodName}' is explicitly forbidden. System will terminate.`;
      this.logSecurityViolation(methodName, 'FORBIDDEN_METHOD_ATTEMPTED');
      throw new Error(error);
    }

    // Check if method is approved
    const approvedMethod = this.APPROVED_METHODS.find(m => m.name === methodName);
    if (!approvedMethod) {
      const error = `ALGORITHM VIOLATION: Method '${methodName}' is not in approved list. Only BULK_SQL_EXTRACTION is authorized.`;
      this.logSecurityViolation(methodName, 'UNAPPROVED_METHOD_ATTEMPTED');
      throw new Error(error);
    }

    console.log(`ALGORITHM GUARD: Method '${methodName}' validated successfully`);
  }

  /**
   * Create execution signature to prevent tampering
   */
  public static createExecutionSignature(userId: number, method: string): string {
    const timestamp = Date.now();
    const data = `${userId}_${method}_${timestamp}`;
    const signature = crypto.createHash('sha256').update(data).digest('hex');
    
    // Store signature for verification
    this.storeExecutionSignature(signature, userId, method, timestamp);
    
    return signature;
  }

  /**
   * Monitor execution and enforce time limits
   */
  public static async monitorExecution(signature: string): Promise<void> {
    const execution = await this.getExecutionRecord(signature);
    if (!execution) {
      throw new Error('ALGORITHM VIOLATION: Invalid execution signature');
    }

    const elapsed = Date.now() - execution.startTime;
    const maxTime = this.APPROVED_METHODS.find(m => m.name === execution.method)?.maxExecutionTime || 1200;

    if (elapsed > maxTime * 1000) {
      await this.terminateExecution(signature, 'TIMEOUT_EXCEEDED');
      throw new Error(`ALGORITHM VIOLATION: Execution exceeded maximum time of ${maxTime} seconds`);
    }
  }

  /**
   * Log security violations for audit
   */
  private static logSecurityViolation(attemptedMethod: string, violationType: string): void {
    const violation = {
      timestamp: new Date().toISOString(),
      attemptedMethod,
      violationType,
      systemResponse: 'EXECUTION_BLOCKED'
    };

    console.error(`SECURITY VIOLATION: ${JSON.stringify(violation)}`);
    
    // Write to security log file
    const logEntry = `${violation.timestamp} - ${violationType}: Attempted ${attemptedMethod}\n`;
    fs.appendFileSync('./security_violations.log', logEntry);
  }

  /**
   * Store execution signature in database
   */
  private static async storeExecutionSignature(signature: string, userId: number, method: string, timestamp: number): Promise<void> {
    try {
      await db.execute(`
        INSERT INTO algorithm_executions (signature, user_id, method, start_time, status)
        VALUES (?, ?, ?, ?, 'ACTIVE')
      `, [signature, userId, method, new Date(timestamp)]);
    } catch (error) {
      console.error('Failed to store execution signature:', error);
    }
  }

  /**
   * Get execution record
   */
  private static async getExecutionRecord(signature: string): Promise<any> {
    try {
      const result = await db.execute(`
        SELECT * FROM algorithm_executions WHERE signature = ?
      `, [signature]);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get execution record:', error);
      return null;
    }
  }

  /**
   * Terminate execution
   */
  private static async terminateExecution(signature: string, reason: string): Promise<void> {
    try {
      await db.execute(`
        UPDATE algorithm_executions 
        SET status = 'TERMINATED', end_time = NOW(), termination_reason = ?
        WHERE signature = ?
      `, [reason, signature]);
    } catch (error) {
      console.error('Failed to terminate execution:', error);
    }
  }
}

/**
 * Initialize protection system
 */
export async function initializeAlgorithmProtection(): Promise<void> {
  // Create audit table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS algorithm_executions (
      id SERIAL PRIMARY KEY,
      signature VARCHAR(255) UNIQUE,
      user_id INTEGER,
      method VARCHAR(100),
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      status VARCHAR(50),
      termination_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create security lock file
  const lockData = {
    protectionActive: true,
    approvedMethods: AlgorithmProtector['APPROVED_METHODS'],
    forbiddenMethods: AlgorithmProtector['FORBIDDEN_METHODS'],
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync('./ALGORITHM_PROTECTION_LOCK.json', JSON.stringify(lockData, null, 2));
  console.log('ALGORITHM PROTECTION: System initialized and locked');
}