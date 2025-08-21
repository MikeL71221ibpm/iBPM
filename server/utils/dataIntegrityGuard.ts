/**
 * DATA INTEGRITY GUARD - PREVENTS SYNTHETIC DATA GENERATION
 * 
 * This system ensures that only authentic uploaded data is used for extraction
 * and completely prohibits any synthetic or placeholder data generation.
 */

import { db } from '../db';

export interface DataIntegrityViolation {
  type: 'SYNTHETIC_DATA_DETECTED' | 'MISSING_UPLOAD_DATA' | 'ALGORITHM_BYPASS';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  timestamp: Date;
  userId: number;
  affectedRecords: number;
}

export class DataIntegrityGuard {
  private static instance: DataIntegrityGuard;
  private violations: DataIntegrityViolation[] = [];

  private constructor() {
    this.initializeIntegrityTables();
  }

  public static getInstance(): DataIntegrityGuard {
    if (!DataIntegrityGuard.instance) {
      DataIntegrityGuard.instance = new DataIntegrityGuard();
    }
    return DataIntegrityGuard.instance;
  }

  /**
   * CRITICAL: Verify uploaded data exists before extraction
   */
  public async validateUploadedDataExists(userId: number): Promise<boolean> {
    console.log(`🔍 DATA INTEGRITY: Validating uploaded data for user ${userId}`);
    
    // Check if notes table has proper HRSN columns from upload
    const notesStructure = await db.execute(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'notes' AND column_name LIKE '%hrsn%'
    `);

    if (notesStructure.rows.length === 0) {
      await this.logViolation({
        type: 'MISSING_UPLOAD_DATA',
        severity: 'CRITICAL',
        description: 'Notes table missing HRSN columns from uploaded data',
        timestamp: new Date(),
        userId,
        affectedRecords: 0
      });
      return false;
    }

    // Check if actual uploaded data exists
    const uploadedDataCheck = await db.execute(`
      SELECT COUNT(*) as count FROM notes 
      WHERE user_id = ? AND note_text IS NOT NULL
    `, [userId]);

    const noteCount = uploadedDataCheck.rows[0]?.count || 0;
    if (noteCount === 0) {
      await this.logViolation({
        type: 'MISSING_UPLOAD_DATA',
        severity: 'CRITICAL',
        description: 'No uploaded note data found for extraction',
        timestamp: new Date(),
        userId,
        affectedRecords: 0
      });
      return false;
    }

    console.log(`✅ DATA INTEGRITY: Validated ${noteCount} uploaded notes for user ${userId}`);
    return true;
  }

  /**
   * CRITICAL: Detect and prevent synthetic data patterns
   */
  public async detectSyntheticDataPatterns(extractedData: any[]): Promise<boolean> {
    console.log(`🔍 DATA INTEGRITY: Scanning for synthetic data patterns in ${extractedData.length} records`);

    // Known synthetic patterns to detect
    const syntheticPatterns = [
      /^(Stable|Struggling|Crisis)$/,
      /^(Secure|Insecure|Very Insecure)$/,
      /^(Stable|Unstable|Homeless)$/,
      /_guard_enforced$/,
      /HASHTEXT\(/i
    ];

    let syntheticCount = 0;
    for (const record of extractedData) {
      for (const [field, value] of Object.entries(record)) {
        if (typeof value === 'string') {
          for (const pattern of syntheticPatterns) {
            if (pattern.test(value)) {
              syntheticCount++;
              console.error(`🚨 SYNTHETIC DATA DETECTED: Field ${field} = "${value}"`);
              break;
            }
          }
        }
      }
    }

    if (syntheticCount > 0) {
      await this.logViolation({
        type: 'SYNTHETIC_DATA_DETECTED',
        severity: 'CRITICAL',
        description: `Detected ${syntheticCount} synthetic data values in extraction`,
        timestamp: new Date(),
        userId: 0,
        affectedRecords: syntheticCount
      });
      return true;
    }

    console.log(`✅ DATA INTEGRITY: No synthetic patterns detected`);
    return false;
  }

  /**
   * CRITICAL: Enforce authentic data extraction only
   */
  public async enforceAuthenticDataOnly(userId: number): Promise<void> {
    console.log(`🔒 DATA INTEGRITY: Enforcing authentic data only for user ${userId}`);

    // Verify uploaded data exists
    const hasValidData = await this.validateUploadedDataExists(userId);
    if (!hasValidData) {
      throw new Error('CRITICAL: Cannot proceed with extraction - no valid uploaded data found');
    }

    // Check for existing synthetic data in database
    const syntheticCheck = await db.execute(`
      SELECT COUNT(*) as count FROM extracted_symptoms 
      WHERE user_id = ? AND (
        financial_status IN ('Stable', 'Struggling', 'Crisis') OR
        housing_status IN ('Stable', 'Unstable', 'Homeless') OR
        mention_id LIKE '%_guard_enforced'
      )
    `, [userId]);

    const syntheticCount = syntheticCheck.rows[0]?.count || 0;
    if (syntheticCount > 0) {
      await this.logViolation({
        type: 'SYNTHETIC_DATA_DETECTED',
        severity: 'CRITICAL',
        description: `Found ${syntheticCount} existing synthetic records in database`,
        timestamp: new Date(),
        userId,
        affectedRecords: syntheticCount
      });

      console.error(`🚨 CRITICAL: Found ${syntheticCount} synthetic records - extraction blocked`);
      throw new Error('CRITICAL: Existing synthetic data detected - must be cleared before proceeding');
    }

    console.log(`✅ DATA INTEGRITY: Database clean - no synthetic data detected`);
  }

  /**
   * Clear contaminated synthetic data
   */
  public async clearSyntheticData(userId: number): Promise<number> {
    console.log(`🧹 DATA INTEGRITY: Clearing synthetic data for user ${userId}`);

    const result = await db.execute(`
      DELETE FROM extracted_symptoms 
      WHERE user_id = ? AND (
        financial_status IN ('Stable', 'Struggling', 'Crisis') OR
        housing_status IN ('Stable', 'Unstable', 'Homeless') OR
        mention_id LIKE '%_guard_enforced'
      )
    `, [userId]);

    const clearedCount = result.rowCount || 0;
    
    await this.logViolation({
      type: 'SYNTHETIC_DATA_DETECTED',
      severity: 'HIGH',
      description: `Cleared ${clearedCount} synthetic records from database`,
      timestamp: new Date(),
      userId,
      affectedRecords: clearedCount
    });

    console.log(`✅ DATA INTEGRITY: Cleared ${clearedCount} synthetic records`);
    return clearedCount;
  }

  /**
   * Log data integrity violations
   */
  private async logViolation(violation: DataIntegrityViolation): Promise<void> {
    this.violations.push(violation);
    
    try {
      await db.execute(`
        INSERT INTO data_integrity_violations (
          type, severity, description, timestamp, user_id, affected_records
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        violation.type,
        violation.severity,
        violation.description,
        violation.timestamp.toISOString(),
        violation.userId,
        violation.affectedRecords
      ]);

      // Send immediate notification for critical violations
      if (violation.severity === 'CRITICAL') {
        await this.sendCriticalAlert(violation);
      }
    } catch (error) {
      console.error('Failed to log integrity violation:', error);
    }
  }

  /**
   * Send critical data integrity alerts
   */
  private async sendCriticalAlert(violation: DataIntegrityViolation): Promise<void> {
    console.error(`🚨 CRITICAL DATA INTEGRITY VIOLATION:`);
    console.error(`Type: ${violation.type}`);
    console.error(`Description: ${violation.description}`);
    console.error(`User ID: ${violation.userId}`);
    console.error(`Affected Records: ${violation.affectedRecords}`);
    console.error(`Timestamp: ${violation.timestamp.toISOString()}`);
    
    // TODO: Implement email/SMS notifications here
    // await emailService.sendCriticalAlert(violation);
  }

  /**
   * Initialize integrity monitoring tables
   */
  private async initializeIntegrityTables(): Promise<void> {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS data_integrity_violations (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          description TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          user_id INTEGER,
          affected_records INTEGER DEFAULT 0,
          resolved BOOLEAN DEFAULT FALSE,
          resolution_notes TEXT
        )
      `);

      console.log('✅ DATA INTEGRITY: Monitoring tables initialized');
    } catch (error) {
      console.error('Failed to initialize integrity tables:', error);
    }
  }

  /**
   * Get violation summary
   */
  public getViolationSummary(): { total: number; critical: number; recent: DataIntegrityViolation[] } {
    const critical = this.violations.filter(v => v.severity === 'CRITICAL').length;
    const recent = this.violations.slice(-5);
    
    return {
      total: this.violations.length,
      critical,
      recent
    };
  }
}

// Export singleton instance
export const dataIntegrityGuard = DataIntegrityGuard.getInstance();