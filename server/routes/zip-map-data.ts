import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../db';

const router = Router();

// Cache for processed ZIP codes
let cachedGeoJSON: any = null;

router.get('/zip-map-data', async (req, res) => {
  console.log('🗺️ ZIP map data requested');
  
  try {
    // Get all unique ZIP codes from patients
    const result = await pool.query(`
      SELECT DISTINCT zip_code
      FROM patients
      WHERE zip_code IS NOT NULL AND zip_code != ''
      AND user_id = $1
    `, [req.user?.id || 4]);
    
    const patientZipCodes = new Set(result.rows.map(r => r.zip_code));
    console.log(`🗺️ Found ${patientZipCodes.size} unique patient ZIP codes`);
    
    // Load and filter the multi-state GeoJSON
    if (!cachedGeoJSON) {
      const geoJsonPath = path.join(__dirname, '../../public/us-zipcodes-multi-state.geojson');
      console.log('🗺️ Loading multi-state GeoJSON file...');
      
      try {
        const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
        cachedGeoJSON = geoJsonData;
        console.log(`🗺️ Loaded ${geoJsonData.features?.length || 0} ZIP code features`);
      } catch (err) {
        console.error('🗺️ Error loading GeoJSON:', err);
        // Fallback to PA file
        const paGeoJsonPath = path.join(__dirname, '../../public/us-zipcodes-real.geojson');
        const paGeoJsonData = JSON.parse(fs.readFileSync(paGeoJsonPath, 'utf8'));
        cachedGeoJSON = paGeoJsonData;
        console.log('🗺️ Using PA fallback file');
      }
    }
    
    // Filter features to only include patient ZIP codes
    const filteredFeatures = cachedGeoJSON.features.filter((feature: any) => {
      const zipCode = feature.properties?.ZCTA5CE10 || 
                     feature.properties?.ZCTA5CE20 || 
                     feature.properties?.zip || 
                     feature.properties?.ZIP;
      return zipCode && patientZipCodes.has(zipCode);
    });
    
    console.log(`🗺️ Filtered to ${filteredFeatures.length} relevant ZIP codes`);
    
    // Create filtered GeoJSON
    const filteredGeoJSON = {
      type: 'FeatureCollection',
      features: filteredFeatures
    };
    
    res.json(filteredGeoJSON);
  } catch (error) {
    console.error('🗺️ Error processing ZIP map data:', error);
    res.status(500).json({ error: 'Failed to load ZIP map data' });
  }
});

export default router;