/**
 * Routes Integration File
 * 
 * This file integrates the v3.2 symptom matcher with the main routes system,
 * allowing for version control and fallback capability.
 * 
 * Version: 3.2.0
 * Date: May 19, 2025
 */

import { Express } from 'express';
import { symptomExtractionRouter } from './routes-symptom-v3-2';
import { VERSION_INFO } from './utils/symptomExtractorV3_2';

/**
 * Integrates the enhanced symptom matcher (v3.2) with the main Express application
 * 
 * @param app - Express application
 */
export function integrateV32SymptomMatcher(app: Express) {
  // Register the version 3.2 symptom extraction routes
  app.use('/api/v3.2/symptoms', symptomExtractionRouter);
  
  // Provide version info endpoint
  app.get('/api/symptom-matcher/versions', (req, res) => {
    res.json({
      available: [
        {
          id: VERSION_INFO.version,
          name: VERSION_INFO.name,
          description: VERSION_INFO.description,
          releaseDate: VERSION_INFO.releaseDate,
          endpoints: [
            { method: 'POST', path: '/api/v3.2/symptoms/extract' },
            { method: 'POST', path: '/api/v3.2/symptoms/compare' },
            { method: 'GET', path: '/api/v3.2/symptoms/version' }
          ]
        },
        {
          id: 'v3.0',
          name: 'Legacy Symptom Matcher',
          description: 'Original symptom matching algorithm',
          releaseDate: '2025-03-10',
          endpoints: [
            { method: 'POST', path: '/api/extract-symptoms' }
          ]
        }
      ],
      current: VERSION_INFO.version
    });
  });
  
  // Log successful integration
  console.log(`[Integration] Symptom matcher v3.2 integrated successfully`);
  console.log(`[Integration] Available at: /api/v3.2/symptoms/extract`);
}