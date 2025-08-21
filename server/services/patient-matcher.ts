// Patient Matching Service for Daily Reports
// Uses the sophisticated patient matching from Search functionality

import { storage } from '../storage';

export interface ScheduledPatient {
  patient_id: string;
  patient_name: string;
  [key: string]: any; // Additional fields to pass through
}

export interface MatchResult {
  scheduled: ScheduledPatient;
  matched?: any; // Database patient record
  status: 'found' | 'not_found' | 'multiple_matches';
  confidence: number;
}

export interface BatchMatchResult {
  matches: MatchResult[];
  summary: {
    total: number;
    found: number;
    not_found: number;
    multiple_matches: number;
  };
}

export class PatientMatcher {
  constructor(private userId: number) {}

  async matchBatch(scheduledPatients: ScheduledPatient[]): Promise<BatchMatchResult> {
    const matches: MatchResult[] = [];
    
    for (const scheduled of scheduledPatients) {
      const match = await this.matchSinglePatient(scheduled);
      matches.push(match);
    }

    const summary = {
      total: matches.length,
      found: matches.filter(m => m.status === 'found').length,
      not_found: matches.filter(m => m.status === 'not_found').length,
      multiple_matches: matches.filter(m => m.status === 'multiple_matches').length,
    };

    return { matches, summary };
  }

  private async matchSinglePatient(scheduled: ScheduledPatient): Promise<MatchResult> {
    try {
      console.log(`🔍 Matching patient: ID=${scheduled.patient_id}, Name="${scheduled.patient_name}"`);
      
      // Primary match: exact patient_id AND patient_name using sophisticated search
      console.log(`🔍 Primary search: ID=${scheduled.patient_id} AND Name="${scheduled.patient_name}"`);
      const exactMatches = await storage.searchPatients({
        patientId: scheduled.patient_id,
        patientName: scheduled.patient_name,
        matchType: 'exact',
        searchType: 'individual'
      }, this.userId);
      
      console.log(`🔍 Exact matches found: ${exactMatches.length}`);
      if (exactMatches.length > 0) {
        // The search returns raw database rows with snake_case, not camelCase
        const matched = exactMatches[0] as any;
        console.log(`🔍 DB patient: ID="${matched.patient_id}", Name="${matched.patient_name}"`);
        return {
          scheduled,
          matched,
          status: 'found',
          confidence: 1.0
        };
      }

      // Secondary match: patient_id only (fallback for name variations)
      console.log(`🔍 Secondary search: ID only=${scheduled.patient_id}`);
      const idMatches = await storage.searchPatients({
        patientId: scheduled.patient_id,
        matchType: 'exact',
        searchType: 'individual'
      }, this.userId);
      
      console.log(`🔍 ID-only matches found: ${idMatches.length}`);
      if (idMatches.length === 1) {
        const matched = idMatches[0] as any;
        console.log(`🔍 Found by ID: "${matched.patient_name}" (expected: "${scheduled.patient_name}")`);
        return {
          scheduled,
          matched,
          status: 'found',
          confidence: 0.9
        };
      }

      if (idMatches.length > 1) {
        console.log(`🔍 Multiple ID matches - using first one`);
        return {
          scheduled,
          matched: idMatches[0] as any,
          status: 'multiple_matches',
          confidence: 0.7
        };
      }

      // Tertiary match: patient_name only (fallback for ID variations)
      console.log(`🔍 Tertiary search: Name only="${scheduled.patient_name}"`);
      const nameMatches = await storage.searchPatients({
        patientName: scheduled.patient_name,
        matchType: 'exact',
        searchType: 'individual'
      }, this.userId);

      console.log(`🔍 Name-only matches found: ${nameMatches.length}`);
      if (nameMatches.length === 1) {
        const matched = nameMatches[0] as any;
        console.log(`🔍 Found by name: ID="${matched.patient_id}" (expected: "${scheduled.patient_id}")`);
        return {
          scheduled,
          matched,
          status: 'found',
          confidence: 0.8
        };
      }

      // DEBUG: Show what patients exist for this user
      console.log(`❌ No matches found for "${scheduled.patient_name}" (ID: ${scheduled.patient_id})`);
      const allUserPatients = await storage.searchPatients({
        searchType: 'population'
      }, this.userId);
      
      console.log(`🔍 Total patients for user ${this.userId}: ${allUserPatients.length}`);
      console.log(`🔍 First 5 available patients:`);
      allUserPatients.slice(0, 5).forEach(p => {
        const patient = p as any;
        console.log(`  ID: "${patient.patient_id}", Name: "${patient.patient_name}"`);
      });
      
      // No matches found
      return {
        scheduled,
        status: 'not_found',
        confidence: 0.0
      };

    } catch (error) {
      console.error('Error matching patient:', error);
      return {
        scheduled,
        status: 'not_found',
        confidence: 0.0
      };
    }
  }
}