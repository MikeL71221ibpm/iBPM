# Behavioral Health Analytics Platform

## Overview
This project is a sophisticated behavioral health analytics platform designed to transform complex medical data into actionable insights through advanced parallel processing and intelligent visualization. It processes authentic medical data using 16-core parallel processing with 400-note batches. Its core purpose is to provide robust analytics for healthcare professionals, enabling better understanding of patient populations and identification of health-related social needs (HRSN). The platform aims to be a leading tool for data-driven healthcare decisions, offering comprehensive patient summaries, diagnosis trends, and enhanced data management capabilities, ultimately improving patient outcomes and healthcare efficiency.

**Recent Achievement (August 15, 2025)**: Daily Patient Reports Service now fully operational with Excel upload support and enhanced download UX. System processes Excel schedules in ~10 seconds and generates comprehensive PDF reports with professional visual feedback during the 1-2 minute download preparation phase.

**Production Fix Applied (August 15, 2025)**: Resolved critical production download bug where PDF reports became inaccessible due to in-memory job storage loss during server restarts. Implemented disk-first, memory-fallback architecture ensuring 76MB PDF reports remain downloadable across all production scenarios. Both backup (`v3.6.3-mvp-daily-reports-production-fix-08_15_25`) and deployment packages (`v3.6.3-mvp-daily-reports-08_15_25`) updated with production fix.

**PDF Layout Fix Completed (August 15, 2025)**: Successfully resolved text overlap issue in Daily Patient Reports PDFs. Added proper line break after "Clinical Data Visualizations" title to prevent overlap with individual chart titles like "Symptoms over time". Layout now displays cleanly with professional spacing throughout all PDF reports.

**Platform Export Standardization Completed (August 15, 2025)**: Implemented unified export system across all 50+ chart components to ensure consistent "detail" export functionality. All export widgets now provide: (1) Summary exports for chart visualization data, and (2) Detail exports with complete merged patient data (original uploaded fields + generated analytics fields) via `/api/export-data-detailed` endpoint. Created `UnifiedExportSystem` component replacing inconsistent export implementations platform-wide.

## User Preferences
- Preserve existing sophisticated functionality rather than simplifying
- Maintain authentic V3.3.5 algorithm integrity
- Focus on reliability and enterprise-grade data processing
- Require comprehensive analysis before making architectural changes
- **CRITICAL**: Never clear or delete user data without explicit permission
- **CUSTOMER-FACING PRIORITY**: UI/UX is equally critical as backend functionality - if users don't like the experience, they won't use the application
- **USER EXPERIENCE MANDATE**: Real-time feedback, progress tracking, and intuitive interfaces are essential for healthcare provider adoption
- **AUTOMATIC EXTRACTION REQUIREMENT**: Symptom extraction must start automatically 2 seconds after CSV upload completes - NO manual button clicks required
- Upload and extraction must be a seamless, fully automatic process for users
- **MANDATORY PROTOCOL**: ALWAYS run `./validate-controlling-file.sh` before ANY controlling file modifications
- **ENFORCEMENT**: If validation fails, STOP immediately and fix issues before proceeding
- **AUTOMATION**: Make controlling file validation part of standard working protocol
- **ABSOLUTE PROHIBITION: NO UNAUTHORIZED CODE CHANGES**
  - NEVER make changes to working code without explicit user authorization
  - NEVER assume root causes or make "preventive fixes"
  - NEVER touch working functionality based on speculation
  - IF code is working, DO NOT change it - period
  - ALWAYS ask permission before modifying any working system
  - User business has been negatively impacted multiple times by unauthorized changes
  - This directive overrides ALL other considerations
- **ADMIN INTERFACE**: Only use `admin-controlling-file.tsx` - all other admin files have been removed to prevent confusion
- **CRITICAL: UPLOAD PAGE SCHEMA ALIGNMENT**
  - Whenever database schema changes, the Upload page (upload-page-controlling-file-05_24_25.tsx) MUST be updated
  - Field names in "File Format Requirements" section must match exact database column names
  - This ensures providers can correctly format their files for upload
  - Schema changes require immediate upload page documentation updates
- **COMPANY PHILOSOPHY: ROOT CAUSE SOLUTIONS**
  - NO quick workarounds or temporary fixes
  - Always analyze systematically to understand root causes
  - Develop permanent, enterprise-grade solutions
  - Consider long-term impact on customers and company
  - Quality over speed - do it right the first time
- **MANDATORY DEBUGGING PROCESS**
  - ALWAYS check previous working versions (backups folder) when fixing issues
  - ALWAYS review controlling files before making changes
  - ALWAYS use proven solutions from working versions instead of creating new ones
  - Document successful fixes from backups for future reference
  - This is a required process, not optional - no exceptions
- **UI IMPROVEMENTS APPROVAL PROCESS**
  - Once user reviews and approves a UI enhancement, it's approved for implementation in next cycle
  - No need to ask permission again for approved changes
- **SPINNER DISPLAY STANDARDS**
  - PostUploadLoading spinner must NEVER show "Extraction In Progress" text
  - Use clear, professional messaging: "Processing Upload" (1-99%), "Processing Complete!" (100%)
  - No stale extraction messages from database processing status

## System Architecture
The platform is built with a modern, scalable architecture prioritizing data visualization, intuitive navigation, and robust data processing.

- **Frontend**: Developed using React with TypeScript and styled with Tailwind CSS. UI/UX emphasizes clear data visualization, print-friendly designs, and consistent color schemes.
    - **Data Visualization**: Extensive use of Nivo charts (bubble plots, heatmaps) with highly responsive tooltips and dynamic labels. Tooltips feature immediate dismissal, precise mouse detection (8-12px radii), and container-level clearing. Includes a universal ChartExportWidget for various export formats.
    - **Geographic Visualization**: Implements real ZIP code polygon boundaries using React Leaflet, with state-based GeoJSON data loading for performance optimization. Features choropleth styling, hover effects, and patient count popups.
    - **Progress Monitoring**: Real-time progress bars and notifications with clean, professional messaging.
- **Backend**: Implemented with Express.js and TypeScript, handling API requests, data processing orchestration, and database interactions.
- **Data Processing**: Features parallel extraction with timeout safety, smart field detection, content analysis, comprehensive HRSN data extraction, and advanced date parsing.
    - **Summary Tab Algorithm**: Includes a revised algorithm with frequency-based symptom groupings, three diagnosis fields, diagnosis trends, diagnostic category trends, and enhanced last two sessions analysis, providing a comprehensive text-based patient summary with space optimization.
    - **Configurable Threshold System**: Allows healthcare providers to adjust frequency grouping thresholds for symptoms, diagnosis, diagnostic categories, and HRSN data.
    - **Daily Patient Reports Service**: Automates the generation of daily patient reports (4 bubble charts + narrative summary per patient in PDF format) based on end-of-day file uploads, with real-time progress tracking. PDF charts use the identical medical pivot data processing as the main application for consistent, professional medical-grade visualizations.
- **Communication**: Utilizes WebSocket and Server-Sent Events for real-time updates.
- **Core Features**:
    - **Filtering System**: Sophisticated two-level Boolean logic for multi-select filters.
    - **Authentication**: Enterprise-grade, session-based user authentication with strict data isolation.
    - **Data Integrity**: Robust systems for unique patient counting, data preservation, and "no data available" handling.
    - **Deployment**: Designed for robust deployment with careful management of bundle size, .gitignore for large files, and ES5 compatibility. Deployment server includes intelligent path detection for static files and handles cached authentication requests gracefully.
- **Data Standards**: Education Level data element follows Health IT.gov USCDI Version 4 standards for Patient Demographics/Information, based on U.S. Census Bureau's American Community Survey values.

## External Dependencies
- **Frontend Framework**: React
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Charting Library**: Nivo charts
- **Mapping Library**: React-Leaflet
- **Authentication**: Passport.js
- **Payment Processing**: Stripe
- **Icons**: Lucide React