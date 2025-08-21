# Developer Guide - Behavioral Health Analytics Platform
**Version**: v3.6.3-mvp-daily-reports-08_15_25  
**Created**: August 15, 2025  

## Application Overview

This is a sophisticated **behavioral health analytics platform** designed for healthcare professionals. The platform transforms complex clinical data into actionable insights through advanced parallel processing and intelligent visualization.

### Core Purpose
- Process authentic medical data (clinical notes, patient records)
- Extract symptoms, diagnoses, and Health-Related Social Needs (HRSN) data
- Generate comprehensive patient summaries and trends analysis
- Provide Daily Patient Reports Service with PDF generation
- Support population health analytics with interactive charts

### Key Business Value
- **Healthcare Providers**: Get comprehensive patient insights before appointments
- **Data-Driven Decisions**: Transform raw clinical notes into structured analytics
- **HRSN Identification**: Identify social determinants of health affecting patients
- **Efficient Reporting**: Automated daily reports with 4 bubble charts per patient

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Nivo Charts** for data visualization (bubble plots, heatmaps)
- **React Leaflet** for geographic visualizations
- **Wouter** for routing
- **TanStack Query** for data fetching
- **WebSocket** for real-time updates

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** database with Drizzle ORM
- **Multer** for file uploads
- **XLSX** library for Excel processing
- **jsPDF + Canvas** for PDF generation
- **WebSocket** for real-time communication
- **Stripe** for payment processing

### Key Dependencies
```json
{
  "xlsx": "Excel file processing",
  "@nivo/scatterplot": "Bubble chart visualizations", 
  "drizzle-orm": "Database ORM",
  "canvas": "Server-side chart rendering",
  "jspdf": "PDF generation",
  "multer": "File upload handling"
}
```

## 🔥 CRITICAL FILES TO REVIEW

### 1. Core Application Architecture
```
/client/src/App.tsx                    - Main application router
/server/index.ts                       - Express server entry point
/shared/schema.ts                      - Database schema (PostgreSQL)
/replit.md                            - Project preferences and guidelines
```

### 2. Daily Patient Reports Service (NEW FEATURE)
```
/client/src/pages/daily-reports-page-controlling-file-08_12_25.tsx
- Main Daily Reports interface
- Excel/CSV upload functionality  
- Enhanced download progress system
- CRITICAL: Fixed XLSX import bug (changed from wildcard to default import)

/server/routes/daily-reports.ts
- File processing API endpoints
- Excel parsing with comprehensive error handling
- Patient matching algorithms
- CRITICAL: Uses XLSX default import (import XLSX from 'xlsx')

/server/services/report-generator.ts
- PDF generation with jsPDF
- 4 bubble charts per patient (Symptoms, Diagnoses, HRSN, Categories)
- Patient narrative summaries

/server/services/chart-generator.ts  
- Server-side chart rendering with Canvas
- Nivo ResponsiveScatterPlot implementation
- Chart image generation for PDF embedding
```

### 3. Main Analytics Platform
```
/client/src/pages/themed-visualization-fixed-new.tsx
- Population health charts and visualizations
- Multi-select filtering system
- Real-time data updates

/server/routes/index.ts
- Main API routes for analytics
- Data aggregation endpoints
- HRSN data processing
```

### 4. Data Processing Engine
```
/server/services/patient-matcher.ts
- Patient identification algorithms
- Fuzzy matching for names
- Data validation and cleaning

/server/services/symptom-extractor.ts
- NLP-based symptom extraction
- HRSN data categorization
- Parallel processing with 400-note batches
```

### 5. Database Layer
```
/shared/schema.ts
- Complete PostgreSQL schema
- Patient, symptoms, HRSN tables
- Drizzle ORM configuration

/server/storage.ts
- Database interface layer
- CRUD operations
- Data aggregation queries
```

## ⚠️ KNOWN CRITICAL ISSUES & SOLUTIONS

### 1. Excel Processing Bug (RESOLVED v3.6.3)
**Issue**: "xlsx.readFile is not a function" error
**Root Cause**: Incorrect import syntax  
**Solution Applied**: 
```typescript
// WRONG (was causing errors)
import * as xlsx from 'xlsx';

// CORRECT (fixed in v3.6.3)  
import XLSX from 'xlsx';
```
**Files Modified**: `/server/routes/daily-reports.ts`

### 2. Download UX Issue (RESOLVED v3.6.3)
**Issue**: 1+ minute download with no visual feedback
**Solution Applied**: Enhanced spinner system with:
- 4x4px spinning loader
- 3x3px pulsing dot
- Gradual progress updates
- Clear status messaging

### 3. Chart Generation Performance
**Issue**: PDF generation takes 1-2 minutes for large patient sets
**Current Solution**: Progress tracking with realistic expectations
**Optimization Opportunity**: Consider chart caching or async generation

## 🚨 CONFIGURATION REQUIREMENTS

### Environment Variables (CRITICAL)
```bash
DATABASE_URL=postgresql://user:password@host:port/database
STRIPE_SECRET_KEY=sk_test_or_live_key_here
NODE_ENV=development|production
PORT=5000
SESSION_SECRET=secure_random_string_here
```

### Database Setup
1. PostgreSQL database required
2. Run migrations: `npm run db:push`
3. Tables auto-created: patients, extracted_symptoms, upload_metrics

### File Upload Configuration
- Upload directory: `/uploads/daily-reports/`
- Supported formats: CSV, XLS, XLSX
- File size limit: 10MB
- Required fields: patient_id, patient_name

## 🔧 DEVELOPMENT SETUP

### Installation
```bash
npm install
npm run db:push  # Setup database
npm run dev      # Start development server
```

### Build & Deploy
```bash
npm run build    # Build frontend
npm start        # Production server
```

### Key Scripts
```json
{
  "dev": "Start development server",
  "build": "Build production frontend", 
  "db:push": "Push schema changes to database",
  "db:studio": "Open database management UI"
}
```

## 🎯 PERFORMANCE CONSIDERATIONS

### Current Performance Metrics
- **Excel Processing**: ~10 seconds for 20 patients
- **PDF Generation**: 1-2 minutes with progress feedback
- **Chart Rendering**: ~2-3 seconds per chart
- **Database Queries**: Optimized with indexes

### Optimization Opportunities
1. **Chart Caching**: Cache generated chart images
2. **Async Processing**: Move PDF generation to background jobs
3. **Database Indexing**: Review query performance
4. **Memory Management**: Monitor memory usage during large file processing

## 🔍 TESTING & DEBUGGING

### Key Test Cases
1. Excel upload with various header formats
2. Patient matching accuracy
3. PDF generation with different patient counts
4. Real-time progress updates
5. Error handling for corrupted files

### Debug Endpoints
- Database health: Check PostgreSQL connection
- File processing: Monitor upload directory
- Memory usage: Watch for memory leaks during PDF generation

## 🚀 DEPLOYMENT NOTES

### Production Requirements
- Node.js 18+
- PostgreSQL database
- 2GB RAM minimum (for PDF generation)
- File system access for uploads/PDFs

### Scaling Considerations
- Consider Redis for session storage
- Implement job queues for PDF generation
- Add horizontal scaling for chart generation
- Monitor database connection pooling

## 📋 IMMEDIATE IMPROVEMENT OPPORTUNITIES

### High Priority
1. **Background Job Processing**: Move PDF generation to queue system
2. **Chart Caching**: Implement chart image caching
3. **Error Recovery**: Improve error handling for partial failures
4. **Performance Monitoring**: Add application performance monitoring

### Medium Priority  
1. **Unit Testing**: Add comprehensive test suite
2. **API Documentation**: Document all endpoints
3. **Logging System**: Implement structured logging
4. **Security Audit**: Review authentication and data access

This guide provides the foundation for understanding and improving the behavioral health analytics platform. Focus on the critical files listed above for maximum impact.