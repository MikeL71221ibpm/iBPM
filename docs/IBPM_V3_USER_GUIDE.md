# iBPM v3 User Guide

## Introduction

The iBPM v3 (integrated Behavioral Health Population Manager) is a comprehensive analytics platform designed for healthcare providers to analyze patient data, with a focus on symptoms, diagnoses, and social determinants of health (HRSN). This guide will help you understand how to use the application, its file structure, and deployment options.

## System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Minimum screen resolution: 1280x720
- For deployment: Node.js 20+ and PostgreSQL 16+

## Application Structure

The application follows a client-server architecture:

```
/
├── client/            # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page layouts and routing
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   └── ...
├── server/            # Backend Node.js Express server
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Data access layer
│   └── ...
├── shared/            # Shared TypeScript types and utilities
└── ...
```

## Understanding Chart Percentages

### Important: Frequency vs Distribution Percentages

The iBPM application displays two types of percentage calculations that serve different analytical purposes:

**Frequency Percentages (Default View)**
- Show how often each item appears relative to the entire dataset
- Example: "3.95%" means this symptom ID appears in 3.95% of all 301,306 documented symptoms
- **Chart percentages will NOT add up to 100%** because only the top items are displayed
- Use this view to understand the true prevalence of symptoms across your patient population

**Distribution Percentages (Alternative View)**
- Show how each displayed item relates to only the items shown in the chart
- Chart percentages WILL add up to 100%
- Use this view to understand the relative proportions within the displayed subset

**Example Interpretation:**
If the Symptom ID chart shows 7 items with percentages 3.95%, 1.00%, 0.85%, etc.:
- These represent the top 7 out of 2,401 total unique symptom IDs
- Together they account for approximately 8.6% of all symptoms
- The remaining 91.4% is distributed across 2,394 other symptom IDs not shown

This distinction is crucial for clinical interpretation and should be explained to end users to avoid confusion about why percentages don't sum to 100%.

## Key Files and Components

### Controlling Files

The application's behavior is primarily controlled by these key files:

1. **Population Health Views**
   - `population-health-charts-controlling-file-05_12_25.tsx` - Count view
   - `population-health-percentage-charts-05_15_25.tsx` - Percentage view
   
2. **Navigation**
   - `App.tsx` - Main routing and navigation
   
3. **Data Handling**
   - `hrsn_data.json` - Sample data source
   - `server/storage.ts` - Database interactions

### Visualization Components

The application includes various visualization components for different analytics needs:

1. **Count Visualizations**
   - Bar charts for categorical data
   - Pie charts for proportional data
   
2. **Percentage Visualizations**
   - Shows data as percentages instead of raw counts
   - Same chart types with optimized display

## Features

### 1. Population Health Analysis

- **HRSN Indicators**: View social determinants of health distribution
- **Risk Stratification**: Analyze patient population by risk levels
- **Symptom Analysis**: Examine symptom frequency and patterns
- **Diagnosis Distribution**: Review diagnosis prevalence
- **Diagnostic Categories**: Analyze broader diagnostic groupings

### 2. Chart Interaction

- **Expand Charts**: Click the 'Expand' button to view charts in full-screen
- **Export Data**: Export chart data in CSV, Excel, or image formats
- **Interactive Tooltips**: Hover over chart elements for detailed information
- **Print Charts**: Generate printable reports with multiple charts

### 3. Navigation

- Toggle between count and percentage views using the main navigation
- Access different analysis modules through the sidebar

## Data Management

### File Formats

The application supports importing data from:
- CSV files
- Excel (XLSX) files

### Data Structure

Data must conform to these standardized formats:

1. **Patient Records**:
   - `patient_id`: Unique identifier
   - `age_range`: Age category (e.g., "18-24", "25-34")
   - Various demographic fields

2. **Symptom Records**:
   - `symptom_segment`: Name of symptom
   - `symp_prob`: "Symptom" or "Problem" indicator
   - `count`: Frequency or intensity value

## Deployment Options

### 1. Replit Deployment

1. Clone the repository to Replit
2. Run `npm install` to install dependencies
3. Set up database with `npm run db:push`
4. Launch with `npm run dev`

### 2. AWS Deployment

1. Provision EC2 instance
2. Install Node.js and PostgreSQL
3. Clone repository and install dependencies
4. Configure environment variables
5. Use PM2 or similar for process management

### 3. Local Development

1. Clone repository
2. Run `npm install` to install dependencies
3. Configure database connection in `.env`
4. Run `npm run dev` to start development server

## Backup and Restore

### Backup Locations

All important files are backed up in these locations:
- `/backups_05_15_2025/iBPM_v3_SUCCESS/` - Latest successful version

### Restore Process

To restore from a backup:
1. Copy files from backup directory to project root
2. Run `npm install` to ensure dependencies are updated
3. Restart the application

## Troubleshooting

### Common Issues

1. **Charts not displaying**:
   - Check browser console for errors
   - Verify data format in JSON file
   - Ensure proper field names in data

2. **Export not working**:
   - Check browser permissions for file downloads
   - Verify chart has loaded data

3. **Slow performance**:
   - Large datasets may impact performance
   - Consider pagination or data filtering

## Background Processing System

The iBPM v3 includes an intelligent background processing system for automated symptom extraction from clinical notes.

### How Background Processing Works

**Automatic Detection**: The system continuously monitors for unprocessed clinical notes and automatically starts symptom extraction when needed.

**Smart Activation**: Background processing only runs when there's work to do:
- Detects when notes are uploaded but symptoms haven't been extracted
- Automatically begins processing without user intervention
- Shows real-time progress updates in the interface

**Processing Workflow**:
1. Upload CSV file with clinical notes
2. System creates patient records and inserts notes
3. Background processor automatically detects unprocessed notes
4. Symptom extraction begins immediately in the background
5. Real-time progress shown with increasing symptom counts
6. Processing completes when all notes have been analyzed

**User Interface Indicators**:
- Database statistics show patient count, note count, and symptom count
- "Continue Processing" button appears when processing is available
- Real-time updates show symptom extraction progress
- Processing status updates automatically

**Performance Features**:
- Processes notes in optimized batches
- Handles enterprise-scale datasets (10,000+ patients)
- Continues processing even if browser is closed
- Automatic recovery from interruptions

### Managing Background Processing

**Starting Processing**: Processing starts automatically when notes are uploaded. You can also manually trigger it using the "Continue Processing" button.

**Monitoring Progress**: Watch the database statistics panel for real-time updates showing increasing symptom counts.

**Stopping Processing**: Use the reset functionality to clear all data and stop processing for a fresh start.

## Support and Resources

For additional support or to report issues:
1. Refer to the documentation in the `docs/` directory
2. Consult the Session Summary documents for historical context
3. Review code comments for implementation details

---

© 2025 iBPM Development Team | Version 3.0