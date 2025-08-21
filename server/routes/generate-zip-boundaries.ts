import { Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { patients } from "@shared/schema";
import fs from "fs/promises";
import path from "path";

// Generate GeoJSON with approximate ZIP code boundaries based on patient data
export async function generateZipBoundaries(req: Request, res: Response) {
  try {
    console.log('🗺️ Generating ZIP code boundaries for patient data...');
    
    // Get unique ZIP codes from patient data
    const patientZips = await db
      .select({
        zip_code: patients.zip_code,
        count: sql<number>`COUNT(*)::int`
      })
      .from(patients)
      .where(sql`${patients.zip_code} IS NOT NULL AND ${patients.zip_code} != ''`)
      .groupBy(patients.zip_code)
      .orderBy(sql`COUNT(*) DESC`);
    
    console.log(`🗺️ Found ${patientZips.length} unique patient ZIP codes`);
    
    // Create approximate boundaries for demonstration
    // In production, you would use actual ZIP boundaries from Census data
    const features = patientZips.map(({ zip_code, count }) => {
      // Get approximate center based on ZIP code prefix
      const zipPrefix = zip_code.substring(0, 3);
      let lat = 40.7128; // Default NYC
      let lng = -74.0060;
      
      // Rough approximations for major ZIP prefixes
      if (zipPrefix.startsWith('100')) { // NYC
        lat = 40.7128 + (Math.random() - 0.5) * 0.2;
        lng = -74.0060 + (Math.random() - 0.5) * 0.2;
      } else if (zipPrefix.startsWith('191')) { // Philadelphia
        lat = 39.9526 + (Math.random() - 0.5) * 0.2;
        lng = -75.1652 + (Math.random() - 0.5) * 0.2;
      } else if (zipPrefix.startsWith('021')) { // Boston
        lat = 42.3601 + (Math.random() - 0.5) * 0.2;
        lng = -71.0589 + (Math.random() - 0.5) * 0.2;
      }
      
      // Create a simple polygon around the center point
      const size = 0.01; // About 1km
      const polygon = [
        [lng - size, lat - size],
        [lng + size, lat - size],
        [lng + size, lat + size],
        [lng - size, lat + size],
        [lng - size, lat - size]
      ];
      
      return {
        type: "Feature",
        properties: {
          ZCTA5CE10: zip_code,
          NAME: zip_code,
          GEOID: zip_code,
          patientCount: count
        },
        geometry: {
          type: "Polygon",
          coordinates: [polygon]
        }
      };
    });
    
    const geoJson = {
      type: "FeatureCollection",
      features
    };
    
    // Save to file
    const outputPath = path.join(process.cwd(), 'public', 'patient-zip-boundaries.geojson');
    await fs.writeFile(outputPath, JSON.stringify(geoJson, null, 2));
    
    console.log(`✅ Generated ZIP boundaries for ${features.length} ZIP codes`);
    
    res.json({
      success: true,
      message: `Generated boundaries for ${features.length} patient ZIP codes`,
      file: '/patient-zip-boundaries.geojson'
    });
    
  } catch (error) {
    console.error('Error generating ZIP boundaries:', error);
    res.status(500).json({ error: 'Failed to generate ZIP boundaries' });
  }
}