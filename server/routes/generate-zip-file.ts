import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../storage.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/generate-patient-zipcodes', async (req, res) => {
  try {
    console.log('📍 Generating patient ZIP codes file...');
    
    // Get unique patient ZIP codes
    const result = await storage.executeRawQuery(
      `SELECT DISTINCT zip_code, COUNT(*) as count
       FROM patients
       WHERE zip_code IS NOT NULL AND zip_code != ''
       GROUP BY zip_code
       ORDER BY count DESC`
    );
    
    // Normalize ZIP codes
    const patientZips = new Set();
    const zipCounts: { [key: string]: number } = {};
    
    if (result && result.rows) {
      result.rows.forEach((row: any) => {
      let zip = row.zip_code.trim();
      // Remove +4 extension if present
      if (zip.includes('-')) {
        zip = zip.split('-')[0];
      }
      // Pad with leading zeros
      zip = zip.padStart(5, '0');
      patientZips.add(zip);
      zipCounts[zip] = row.count;
    });
    }
    
    console.log(`📍 Found ${patientZips.size} unique patient ZIP codes`);
    console.log(`📍 Sample ZIPs: ${Array.from(patientZips).slice(0, 10).join(', ')}`);
    
    // Read PA ZIP codes file first
    const paFilePath = path.join(__dirname, '../../public/us-zipcodes-real.geojson');
    console.log(`📍 Reading PA file from: ${paFilePath}`);
    
    if (!fs.existsSync(paFilePath)) {
      return res.status(404).json({ error: 'PA ZIP codes file not found' });
    }
    
    const paData = JSON.parse(fs.readFileSync(paFilePath, 'utf8'));
    console.log(`📍 PA file has ${paData.features.length} features`);
    
    // Filter to patient ZIP codes
    const matchingFeatures = paData.features.filter((feature: any) => {
      const zip = feature.properties?.ZCTA5CE10;
      return zip && patientZips.has(zip);
    });
    
    console.log(`📍 Found ${matchingFeatures.length} matching ZIP code boundaries`);
    
    // Add patient count to properties
    matchingFeatures.forEach((feature: any) => {
      const zip = feature.properties?.ZCTA5CE10;
      if (zip && zipCounts[zip]) {
        feature.properties.patient_count = zipCounts[zip];
      }
    });
    
    // Create filtered GeoJSON
    const filteredGeoJson = {
      type: 'FeatureCollection',
      features: matchingFeatures
    };
    
    // Save to public folder
    const outputPath = path.join(__dirname, '../../public/us-patient-zipcodes.geojson');
    fs.writeFileSync(outputPath, JSON.stringify(filteredGeoJson));
    
    const stats = fs.statSync(outputPath);
    const sizeMB = stats.size / (1024 * 1024);
    
    res.json({
      success: true,
      message: `Created us-patient-zipcodes.geojson: ${sizeMB.toFixed(1)} MB with ${matchingFeatures.length} ZIP codes`,
      totalPatientZips: patientZips.size,
      matchedZips: matchingFeatures.length,
      coverage: `${((matchingFeatures.length / patientZips.size) * 100).toFixed(1)}%`
    });
    
  } catch (error) {
    console.error('📍 Error generating ZIP file:', error);
    res.status(500).json({ error: 'Failed to generate ZIP codes file' });
  }
});

export default router;