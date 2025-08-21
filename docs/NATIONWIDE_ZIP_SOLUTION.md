# Nationwide ZIP Code Choropleth Solution

## Current Status
- **Working**: Pennsylvania ZIP codes (47MB file) displaying correctly
- **Challenge**: Need to support all 42,000+ US ZIP codes for any customer
- **File Size**: Complete US ZCTA file is 290MB+ (too large for web)

## Recommended Production Solutions

### Option 1: Progressive Regional Loading (Recommended)
Split nationwide data into regional files and load based on patient locations:
```javascript
const regions = {
  northeast: ['PA', 'NY', 'NJ', 'CT', 'MA', 'VT', 'NH', 'ME', 'RI'],
  southeast: ['FL', 'GA', 'SC', 'NC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS'],
  midwest: ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO'],
  // etc...
};
```

### Option 2: Vector Tile Service
Use Mapbox or MapTiler for on-demand ZIP boundary loading:
- Only loads visible ZIP codes in current viewport
- Scales to millions of features
- ~$50-200/month for typical usage

### Option 3: Simplified Nationwide File
Use mapshaper to create web-optimized file:
```bash
# Download Census ZCTA file
wget https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_zcta520_500k.zip
unzip cb_2020_us_zcta520_500k.zip

# Simplify to ~50MB target
mapshaper cb_2020_us_zcta520_500k.shp \
  -simplify 5% keep-shapes \
  -filter-fields ZCTA5CE20,GEOID20 \
  -o format=geojson us-zip-simplified.geojson
```

### Option 4: Database-Driven Solution
Store ZIP boundaries in PostGIS and serve dynamically:
```sql
-- Simplify on-the-fly based on zoom level
SELECT 
  zip_code,
  ST_AsGeoJSON(
    ST_Simplify(geometry, 
      CASE 
        WHEN zoom < 8 THEN 0.01
        WHEN zoom < 10 THEN 0.001
        ELSE 0.0001
      END
    )
  ) as geometry
FROM zip_boundaries
WHERE ST_Intersects(geometry, viewport_bounds);
```

## Implementation Steps

### Immediate (Current Implementation)
1. ✅ Using PA ZIP codes as proof of concept
2. ✅ Choropleth rendering working correctly
3. ✅ Patient data aggregation by ZIP code

### Phase 1: Multi-State Coverage
1. Download additional state files
2. Merge into regional files (~50MB each)
3. Load based on patient data distribution

### Phase 2: Full National Coverage
1. Implement one of the production solutions above
2. Add loading indicators for progressive loading
3. Cache loaded regions in browser

## File Size Comparison
- **Raw ZCTA**: 500MB+ (shapefile)
- **GeoJSON**: 1-2GB (uncompressed)
- **Simplified**: 50-100MB (5% simplification)
- **Regional**: 10-50MB per region
- **Vector Tiles**: <1MB per viewport

## Current Workaround
The PA file demonstrates the functionality. To extend:
1. Download state files from Census
2. Simplify using mapshaper
3. Load progressively based on viewport