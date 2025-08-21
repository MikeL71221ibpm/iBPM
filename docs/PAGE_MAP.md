# Application Page Map

This document maps each application route/URL to its corresponding implementation file. This helps track which files are actively used by the application and ensures we're editing the correct files when making changes.

## Main Page Mapping

| Page/Route | Description | Active File Location | Last Modified | Modified By |
|------------|-------------|---------------------|---------------|------------|
| / (Home/Auth) | Authentication/Login page | client/src/pages/auth-page.tsx | May 8, 2025 | Replit Agent |
| /home | Home page after login | client/src/pages/home.tsx | May 8, 2025 | Replit Agent |
| /upload | File upload page | client/src/pages/upload.tsx | May 8, 2025 | Replit Agent |
| /pivot-tables-with-download/:patientId | Pivot table view | client/src/pages/simplified-auto-pivot.tsx | May 8, 2025 | Replit Agent |
| /nivo-heatmap-view/:patientId | Heatmap visualization | client/src/pages/nivo-heatmap-view.tsx | May 8, 2025 | Replit Agent |
| /nivo-scatter-view-themed/:patientId | Bubble chart visualization | client/src/pages/nivo-scatter-view-themed-new-colors-fixed.tsx | May 8, 2025 | Replit Agent |
| /payment | Payment processing page | client/src/pages/payment-page.tsx | May 8, 2025 | Replit Agent |
| /receipts | List of payment receipts | client/src/pages/receipts-page.tsx | May 8, 2025 | Replit Agent |
| /receipts/:id | Individual receipt view | client/src/pages/receipt-page.tsx | May 8, 2025 | Replit Agent |
| /admin | Admin dashboard | client/src/pages/admin.tsx | May 8, 2025 | Replit Agent |

## Important Components

| Component | Description | File Location | Last Modified | Modified By |
|-----------|-------------|---------------|---------------|------------|
| Main Navigation | Site-wide navigation bar | client/src/components/MainNav.tsx | May 8, 2025 | Replit Agent |
| Individual Search | Patient search component | client/src/components/IndividualSearch.tsx | May 8, 2025 | Replit Agent |
| Population Health | Population health charts | client/src/components/PopulationHealthCharts.tsx | May 8, 2025 | Replit Agent |
| Visualizations | Force visualizations module | client/src/components/ForceVisualizations.tsx | May 8, 2025 | Replit Agent |
| Bubble Chart | Bubble chart implementation | client/src/components/BubbleChartRevised.tsx | May 8, 2025 | Replit Agent |

## Important Rules

1. **When making changes to any page or component:**
   - Always verify you're editing the active file listed in this document
   - After making changes, update the "Last Modified" and "Modified By" columns
   - If you create a new version of a file, update this document to reflect the new active file

2. **Communication Protocol:**
   - When referring to files in communication, always provide the full path
   - When asking for review of changes, include a direct link or exact file path
   - Always confirm which file is being modified before making changes

3. **File Versioning Notes:**
   - Files with suffixes like "-fixed", "-new", or "-revised" typically indicate newer versions
   - The App.tsx routing configuration defines which file version is actually used

This document should be reviewed at the beginning and end of each development session to ensure everyone is working with the correct files.