
import fetch from 'node-fetch';

interface ZipBoundary {
  type: string;
  properties: {
    ZCTA5CE20: string;
    GEOID: string;
    NAME: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

class ZipBoundaryService {
  private cache = new Map<string, ZipBoundary>();
  private batchCache = new Map<string, ZipBoundary[]>();

  async getZipBoundary(zipCode: string): Promise<ZipBoundary | null> {
    // Normalize ZIP code
    const normalizedZip = this.normalizeZip(zipCode);
    
    // Check cache first
    if (this.cache.has(normalizedZip)) {
      return this.cache.get(normalizedZip)!;
    }

    try {
      // Use US Census Bureau API for ZIP Code Tabulation Areas (ZCTAs)
      const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/2/query?where=ZCTA5CE20='${normalizedZip}'&outFields=*&geometryType=esriGeometryPolygon&spatialRel=esriSpatialRelIntersects&returnGeometry=true&outSR=4326&f=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const boundary = data.features[0];
        this.cache.set(normalizedZip, boundary);
        return boundary;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching boundary for ZIP ${normalizedZip}:`, error);
      return null;
    }
  }

  async getMultipleZipBoundaries(zipCodes: string[]): Promise<{ [zipCode: string]: ZipBoundary }> {
    const results: { [zipCode: string]: ZipBoundary } = {};
    const normalizedZips = zipCodes.map(zip => this.normalizeZip(zip));
    
    // Check cache for existing boundaries
    const uncachedZips: string[] = [];
    normalizedZips.forEach(zip => {
      if (this.cache.has(zip)) {
        results[zip] = this.cache.get(zip)!;
      } else {
        uncachedZips.push(zip);
      }
    });

    // Fetch uncached boundaries in batches
    if (uncachedZips.length > 0) {
      const batchSize = 10; // API rate limiting
      for (let i = 0; i < uncachedZips.length; i += batchSize) {
        const batch = uncachedZips.slice(i, i + batchSize);
        await this.fetchBatch(batch, results);
        
        // Small delay to respect API limits
        if (i + batchSize < uncachedZips.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    return results;
  }

  private async fetchBatch(zipCodes: string[], results: { [zipCode: string]: ZipBoundary }) {
    const promises = zipCodes.map(async (zip) => {
      const boundary = await this.getZipBoundary(zip);
      if (boundary) {
        results[zip] = boundary;
      }
    });

    await Promise.all(promises);
  }

  private normalizeZip(zipCode: string): string {
    const cleaned = zipCode.toString().trim();
    // Ensure 5-digit format with leading zeros
    return cleaned.padStart(5, '0');
  }

  // Generate a complete GeoJSON for the current dataset
  async generateCompleteGeoJSON(zipCodes: string[]): Promise<any> {
    console.log(`🗺️ Generating complete GeoJSON for ${zipCodes.length} ZIP codes...`);
    
    const boundaries = await this.getMultipleZipBoundaries(zipCodes);
    const features = Object.values(boundaries);
    
    console.log(`🗺️ Successfully fetched ${features.length} ZIP code boundaries`);
    
    return {
      type: "FeatureCollection",
      features: features
    };
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cachedBoundaries: this.cache.size,
      batchCaches: this.batchCache.size
    };
  }
}

export const zipBoundaryService = new ZipBoundaryService();
