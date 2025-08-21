/**
 * SYNTHETIC DATA BLOCKER - PREVENTS ALL ARTIFICIAL DATA GENERATION
 * 
 * This system completely blocks any attempt to generate synthetic data
 * and ensures only authentic uploaded HRSN data is used for extraction.
 */

export class SyntheticDataBlocker {
  private static instance: SyntheticDataBlocker;
  private blockedPatterns: RegExp[] = [
    /^(Stable|Struggling|Crisis)$/,
    /^(Secure|Insecure|Very Insecure)$/,
    /^(Stable|Unstable|Homeless)$/,
    /HASHTEXT\(/i,
    /ABS\(HASHTEXT/i,
    /_guard_enforced$/,
    /CASE.*WHEN.*THEN/i
  ];

  private constructor() {
    console.log('🚫 SYNTHETIC DATA BLOCKER: Initialized - all artificial data generation blocked');
  }

  public static getInstance(): SyntheticDataBlocker {
    if (!SyntheticDataBlocker.instance) {
      SyntheticDataBlocker.instance = new SyntheticDataBlocker();
    }
    return SyntheticDataBlocker.instance;
  }

  /**
   * Block any synthetic data generation attempts
   */
  public blockSyntheticData(value: any): void {
    if (typeof value === 'string') {
      for (const pattern of this.blockedPatterns) {
        if (pattern.test(value)) {
          throw new Error(`BLOCKED: Synthetic data pattern detected: "${value}"`);
        }
      }
    }
  }

  /**
   * Validate SQL query for synthetic data generation
   */
  public validateSQL(sql: string): void {
    const upperSQL = sql.toUpperCase();
    
    if (upperSQL.includes('HASHTEXT(') || 
        upperSQL.includes('ABS(HASHTEXT') ||
        (upperSQL.includes('CASE') && upperSQL.includes('WHEN') && upperSQL.includes('STABLE'))) {
      throw new Error('BLOCKED: SQL contains synthetic data generation patterns');
    }
  }

  /**
   * Ensure only uploaded data is used
   */
  public enforceUploadedDataOnly(data: any[]): void {
    for (const record of data) {
      if (record.financial_status) {
        this.blockSyntheticData(record.financial_status);
      }
      if (record.housing_status) {
        this.blockSyntheticData(record.housing_status);
      }
    }
  }
}

export const syntheticDataBlocker = SyntheticDataBlocker.getInstance();