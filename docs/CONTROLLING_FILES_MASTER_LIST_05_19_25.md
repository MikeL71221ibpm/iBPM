# CONTROLLING FILES MASTER LIST (Updated 05/19/25)

This document provides a comprehensive list of the standardized controlling files used in the HRSN + BH Analytics application. These files should be referenced when making changes to ensure consistency across the application.

## CORE COMPONENTS

### Navigation Components
- `client/src/components/topnav-component-controlling-file-05_09_25.tsx`
- `client/src/components/NavigationButton.tsx` (Updated 05/17/25 with size prop)
- `client/src/components/SideNavigation.tsx`
- `client/src/components/BreadcrumbNavigation.tsx`

### Authentication Components
- `client/src/pages/auth-page-controlling-file-05_09_25.tsx`
- `client/src/hooks/use-auth.tsx`
- `client/src/lib/protected-route.tsx`
- `client/src/components/LoginButton.tsx`

### Payment and Billing Components
- `client/src/pages/payment-page-controlling-file-05_09_25.tsx`
- `client/src/pages/receipt-page-controlling-file-05_09_25.tsx`
- `client/src/pages/receipts-page-controlling-file-05_09_25.tsx`
- `client/src/pages/receipt-detail-controlling-file-05_10_25.tsx`
- `client/src/pages/billing-page-controlling-file-05_10_25.tsx`

### Home and Search Components
- `client/src/pages/home-page-controlling-file-05_09_25.tsx`
- `client/src/pages/search-page-controlling-file-05_09_25.tsx`
- `client/src/pages/upload-page-controlling-file-05_09_25.tsx`

### Administration Components
- `client/src/pages/admin-page-controlling-file-05_09_25.tsx`
- `client/src/pages/admin-direct.tsx`
- `client/src/pages/admin-setup.tsx`

## VISUALIZATION COMPONENTS

### Chart Components
- `client/src/components/hrsn-bar-chart-v3-1-05_19_25.tsx` (Updated 05/19/25)
- `client/src/components/hrsn-pie-chart-v3-1-05_19_25.tsx` (Updated 05/19/25)
- `client/src/components/standardized-hrsn-chart-v3-1-05_19_25.tsx` (Updated 05/19/25)
- `client/src/components/hrsn-heatmap-controlling-file-05_09_25.tsx`
- `client/src/components/ZipCodeMap.tsx`

### Symptom Visualization Pages
- `client/src/pages/nivo-scatter-view-controlling-file-05_09_25.tsx`
- `client/src/pages/direct-grid-view-controlling-file-05_09_25.tsx`
- `client/src/pages/heatmap-view-controlling-file-05_09_25.tsx`
- `client/src/pages/nivo-heatmap-view-controlling-file-05_09_25.tsx`
- `client/src/pages/simplified-auto-pivot-controlling-file-05_09_25.tsx`

### Population Health Pages
- `client/src/pages/population-health-controlling-05_13_25.tsx` (Main production version)
- `client/src/pages/population-health-percentage-view-05_15_25.tsx` (Percentage view)
- `client/src/pages/population-health-v3-1-05_19_25.tsx` (Updated 05/19/25)

## DATA PROCESSING UTILITIES

### Data Normalization and Processing
- `client/src/utils/data-normalization.ts`
- `client/src/utils/chart-data-processing.ts`
- `client/src/utils/patient-data-utils.ts`
- `client/src/utils/symptom-processing.ts`

### Date and String Formatting
- `client/src/utils/date-formatting.ts`
- `client/src/utils/string-utils.ts`
- `client/src/utils/data-validation.ts`

### Version Control
- `client/src/config/version-control.ts` (Added 05/19/25)

## SERVER COMPONENTS

### API Routes
- `server/routes.ts`
- `server/auth.ts`
- `server/storage.ts`
- `server/db.ts`

### Payment Processing
- `server/stripe-webhooks.ts`
- `server/billing-processor.ts`
- `server/receipt-generator.ts`

## VERSION INFORMATION

- Current Production Version: V3.0 (Released 05/16/25)
- Current Development Version: V3.1 (In Progress)
- Last Updated: May 19, 2025

## IMPORTANT NOTES

1. Always reference the controlling file when making changes to ensure consistency.
2. When updating a controlling file, create a new dated version and update this list.
3. Update the App.tsx file to reference the new controlling file versions.
4. Document all changes in session summaries and version management files.
5. Maintain backward compatibility whenever possible.