# IBPM V3.2 Application User Workflow Guide

This document provides a step-by-step guide for using the IBPM V3.2 Behavioral Health Analytics Platform, from authentication to data visualization and export. Each step includes the controlling file responsible for that functionality.

## Complete Application Workflow Table

| Step | Process | Description | Controlling File | Functions (Y/N) | Comments |
|------|---------|-------------|-----------------|-----------------|----------|
| 1 | **Authentication** | User logs in with credentials | client/src/pages/auth-page.tsx | Y | |
| 2 | **Billing Setup** | User enters payment information | client/src/pages/billing-setup.tsx | Y | |
| 3 | **Navigation** | User navigates between application sections | client/src/components/topnav-reorganized-final-05_23_25.tsx | Y | |
| 4 | **File Upload** | User uploads CSV/XLSX clinical data | client/src/pages/upload-page-controlling-file-05_24_25.tsx | Y | |
| 5 | **File Validation** | System validates file format and fields | client/src/lib/file-validation.ts | Y | |
| 6 | **Search Initialization** | User navigates to search functionality | client/src/pages/search-page.tsx | Y | |
| 7 | **Individual Patient Search** | User searches for specific patient | client/src/components/individual-search-controlling-file-05_23_25.tsx | Y | |
| 8 | **Patient Visualization** | System displays patient-specific visualizations | client/src/components/patient-visualization-05_23_25.tsx | Y | |
| 9 | **Population Health** | User accesses population health analytics | client/src/pages/population-health-page.tsx | Y | |
| 10 | **HRSN Visualization** | System displays HRSN indicators charts | client/src/components/standardized-hrsn-chart-05_13_25.tsx | Y | |
| 11 | **Population Charts** | System displays population health charts | client/src/components/population-health-charts-controlling-file-05_23_25.tsx | Y | |
| 12 | **Symptom Visualization** | System displays symptom distribution charts | client/src/components/symptom-visualization-05_23_25.tsx | Y | |
| 13 | **Chart Export** | User exports charts as images or PDFs | client/src/components/chart-export-widget.tsx | Y | |
| 14 | **Results Download** | User downloads complete analysis results | client/src/components/data-export-widget.tsx | Y | |
| 15 | **Session Management** | User logs out or switches sessions | client/src/components/session-manager.tsx | Y | |

## Detailed Process Breakdown

### 1. Authentication
- **User Actions**: 
  - Navigate to application URL
  - Enter username/password or use SSO option
  - Click "Login" button
- **System Actions**:
  - Validate credentials
  - Create user session
  - Redirect to dashboard
- **Controlling File**: client/src/pages/auth-page.tsx

### 2. Billing Setup
- **User Actions**:
  - Enter credit card information
  - Review pricing details ($1/search, $1/unique patient)
  - Confirm billing agreement
- **System Actions**:
  - Validate payment information
  - Store payment method for future billing
  - Create billing account
- **Controlling File**: client/src/pages/billing-setup.tsx

### 3. File Upload
- **User Actions**:
  - Navigate to Upload page
  - Select CSV/XLSX file
  - Choose date range or use all dates
  - Click "Upload" button
- **System Actions**:
  - Parse file contents
  - Validate required fields
  - Process notes using NLP
  - Extract HRSNs and symptoms
  - Organize into diagnostic categories
- **Controlling File**: client/src/pages/upload-page-controlling-file-05_24_25.tsx

### 4. Individual Patient Search
- **User Actions**:
  - Navigate to Search page
  - Enter patient identifier or search criteria
  - Review patient list
  - Select specific patient
- **System Actions**:
  - Query database for matching patients
  - Display patient details
  - Prepare visualizations
- **Controlling File**: client/src/components/individual-search-controlling-file-05_23_25.tsx

### 5. Population Health Analysis
- **User Actions**:
  - Navigate to Population Health page
  - Set filters for population segment
  - Select visualization type
  - Toggle between count and percentage views
- **System Actions**:
  - Aggregate data based on filters
  - Generate visualizations
  - Update charts in real-time
- **Controlling File**: client/src/components/population-health-charts-controlling-file-05_23_25.tsx

### 6. Chart Export
- **User Actions**:
  - Identify chart to export
  - Click export button
  - Select format (PNG, PDF, etc.)
  - Choose destination
- **System Actions**:
  - Render chart at high resolution
  - Convert to selected format
  - Initiate download
- **Controlling File**: client/src/components/chart-export-widget.tsx

### 7. Session Management
- **User Actions**:
  - Review usage statistics
  - Check billing summary
  - Log out when finished
- **System Actions**:
  - Calculate session charges
  - Update billing records
  - Close session securely
- **Controlling File**: client/src/components/session-manager.tsx

## System Requirements and Compatibility

- **Supported Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **File Formats**: CSV, XLSX
- **Required Data Fields**: Patient ID, Notes, Date of Service
- **Optional Fields**: Diagnosis, Provider, Location, Demographics

## Troubleshooting

Common issues and their solutions:

1. **File Upload Errors**: Ensure all required fields are present and properly formatted
2. **Search Not Returning Results**: Verify patient identifiers and try broader search terms
3. **Charts Not Displaying**: Check that data contains sufficient records for meaningful visualization
4. **Export Failures**: Ensure browser permissions allow downloads and file creation