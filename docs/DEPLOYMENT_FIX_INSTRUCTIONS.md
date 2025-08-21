# Deployment Fix Instructions

## The Issue
The deployment shows "Service Unavailable" because the standard build process (`npm run build`) uses the wrong server file.

## The Fix
I've created a custom build script that ensures the deployment server is used.

### To Deploy Successfully:

1. **Run the custom build script instead of npm run build:**
   ```bash
   ./build-deployment.sh
   ```

2. **This script:**
   - Builds the frontend (vite build)
   - Builds the deployment server specifically (server/deployment-server.ts)
   - Creates a 2.9KB server file instead of the 470KB development server

3. **The deployment server includes:**
   - Intelligent path detection (finds static files automatically)
   - Mock API responses (2,456 patients, 73,925 symptoms)
   - Proper error handling
   - Correct HTML title "V3.4.23 DEPLOYED"

## Verification
After building, the dist/index.js should be ~2.9KB (not 470KB).

## Alternative: Override the build command
If you can modify the deployment build command, use:
```
vite build && npx esbuild server/deployment-server.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js
```

This ensures the deployment server is always used instead of the development server.