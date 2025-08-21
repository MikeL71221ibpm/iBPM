# Controlling Files Master List
Updated: May 18, 2025

## Main Application Files

### Routing and Navigation
- client/src/App.tsx - Main application routing and structure
- client/src/components/NavigationButton.tsx - Standardized navigation component

### Pages
- client/src/pages/dashboard.tsx - Main dashboard
- client/src/pages/patient-search.tsx - Search interface for patients
- client/src/pages/patient-analysis.tsx - Individual patient analysis
- client/src/pages/population-health-count-view.tsx - Population health dashboard (count view)
- client/src/pages/population-health-percentage-view-05_15_25.tsx - Population health dashboard (percentage view)
- client/src/pages/population-health-controlling-05_13_25.tsx - Controlling version of population health page
- client/src/pages/population-health-v3-1-05_18_25.tsx - V3.1 population health dashboard with standardized charts
- client/src/pages/symptom-analysis.tsx - Symptom-focused analytics
- client/src/pages/user-management.tsx - User account management
- client/src/pages/billing.tsx - Billing and subscription management
- client/src/pages/settings.tsx - Application settings

### Core Visualization Components

#### V3.1 Standardized Components (Latest)
- client/src/components/standardized-hrsn-chart-v3-1-05_18_25.tsx - Unified chart component with both bar/pie options
- client/src/components/hrsn-bar-chart-v3-1-05_18_25.tsx - Bar chart component with enhanced display mode handling
- client/src/components/hrsn-pie-chart-v3-1-05_18_25.tsx - Pie chart component with enhanced display mode handling
- client/src/components/visualization-metadata-v3-1-05_18_25.tsx - Standardized metadata display for visualizations

#### V3.0 Components (Production Release - May 16, 2025)
- client/src/components/population-health-charts-controlling-file-05_16_25-release.tsx - Main charts controller
- client/src/components/zip-code-map-controlling-file-05_17_25.tsx - Geographic visualization
- client/src/components/hrsn-bar-chart-controlling-file-05_15_25.tsx - Bar chart component
- client/src/components/hrsn-pie-chart-controlling-file-05_15_25.tsx - Pie chart component
- client/src/components/visualization-metadata-controlling-file-05_15_25.tsx - Metadata display component

### Search and Data Selection
- client/src/components/population-search-controlling-file-05_12_25.tsx - Population search interface
- client/src/components/search-filters.tsx - Search filter components
- client/src/components/date-range-picker.tsx - Date range selection component

### Patient Analysis 
- client/src/components/patient-visualization-controlling-file-05_12_25.tsx - Patient visualization wrapper
- client/src/components/symptom-heatmap-controlling-file-05_12_25.tsx - Symptom heatmap visualization
- client/src/components/symptom-trends-controlling-file-05_12_25.tsx - Symptom trends visualization
- client/src/components/clinical-notes-viewer.tsx - Notes viewer component
- client/src/components/note-extraction-viewer.tsx - Extracted data viewer

### UI Components
- client/src/components/theme-switcher.tsx - Theme control component
- client/src/components/color-theme-picker.tsx - Color scheme selection component
- client/src/components/ui/button.tsx - Base button component
- client/src/components/ui/card.tsx - Card component
- client/src/components/ui/tabs.tsx - Tabs component
- client/src/components/ui/select.tsx - Select component
- client/src/components/ui/toast.tsx - Toast notification component

### Shared Types and Utilities
- shared/schema.ts - Database schema and shared types
- client/src/lib/query-helpers.ts - Data query utilities
- client/src/lib/data-transformers.ts - Data transformation utilities
- client/src/lib/format-utils.ts - Formatting utilities
- client/src/hooks/use-visualization-data.tsx - Data hook for visualizations

## Server-Side Files

### API Endpoints
- server/routes.ts - API route definitions
- server/controllers/visualization-data.ts - Visualization data controller
- server/controllers/patient-data.ts - Patient data controller
- server/controllers/user-management.ts - User management controller
- server/controllers/billing.ts - Billing controller

### Database and Storage
- server/db.ts - Database connection
- server/storage.ts - Storage interface implementation
- server/migrations/ - Database migrations

### Authentication
- server/auth.ts - Authentication setup
- server/middleware/auth-middleware.ts - Auth middleware

## Data Processing
- scripts/process_csv_to_json.js - CSV processing script
- scripts/deduplication_solution.js - Deduplication utilities
- server/services/data-processor.ts - Server-side data processing

## Utility Files
- vite.config.ts - Vite configuration
- tailwind.config.ts - Tailwind CSS configuration
- package.json - Project dependencies
- tsconfig.json - TypeScript configuration