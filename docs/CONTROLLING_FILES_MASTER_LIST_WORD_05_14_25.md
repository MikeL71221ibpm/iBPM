# List of Controlling and Pertinent files updated on 5/14/25

Here's the full updated list of standardized files with all the details:

## Page/Route Controlling Files
| Feature/Function | Route | File Name | File Location | Last Revised | Status |
|------------------|-------|-----------|--------------|--------------|--------|
| Admin Page | /admin | admin-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-10 | ✓ Standardized |
| Authentication | /auth, / | auth-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Home Dashboard | /home | home-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| File Upload | /upload | upload-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Bubble Chart | /nivo-scatter-view/:patientId? | nivo-scatter-view-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Heatmap | /nivo-heatmap-view/:patientId? | nivo-heatmap-view-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Direct Grid View | /direct-grid-view/:patientId? | direct-grid-view-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Heatmap View | /heatmap-view/:patientId? | heatmap-view-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Payment | /payment | payment-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Billing | /billing | billing-page-controlling-file-05_10_25.tsx | client/src/pages/ | 2025-05-10 | ✓ Standardized |
| Receipts List | /receipts | receipts-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Receipt Detail | /receipts/:id | receipt-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Search | /search | search-page-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Pivot Tables | /simplified-auto-pivot/:patientId? | simplified-auto-pivot-controlling-file-05_09_25.tsx | client/src/pages/ | 2025-05-09 | ✓ Standardized |
| Population Health | /population-health | population-health-controlling-05_13_25.tsx | client/src/pages/ | 2025-05-14 | ✓ Updated |

## Component Controlling Files
| Feature/Function | File Name | File Location | Last Revised | Status |
|------------------|-----------|--------------|--------------|--------|
| Navigation | navigation-controlling-file-05_09_25.tsx | client/src/components/ | 2025-05-09 | ✓ Standardized |
| Top Navigation | topnav-component-controlling-file-05_09_25.tsx | client/src/components/ | 2025-05-09 | ✓ Standardized |
| Alternative Top Navigation | top-navigation-controlling-file-05_09_25.tsx | client/src/components/ | 2025-05-09 | ✓ Standardized |
| Bubble Chart Component | bubblechart-component-controlling-file-05_09_25.tsx | client/src/components/ | 2025-05-09 | ✓ Standardized |
| Heatmap Component | heatmap-component-controlling-file-05_09_25.tsx | client/src/components/ | 2025-05-09 | ✓ Standardized |
| Population Health Charts | population-health-charts-controlling-file-05_12_25.tsx | client/src/components/ | 2025-05-12 | ✓ Updated |
| HRSN Grid | hrsn-grid-controlling-file-05_13_25.tsx | client/src/components/ | 2025-05-14 | ✓ Updated |
| HRSN Pie Chart | hrsn-pie-chart-05_13_25.tsx | client/src/components/ | 2025-05-13 | ✓ Updated |
| Categorical HRSN Chart | categorical-hrsn-chart-05_13_25.tsx | client/src/components/ | 2025-05-14 | ✓ Updated |
| Standardized HRSN Chart | standardized-hrsn-chart-05_13_25.tsx | client/src/components/ | 2025-05-14 | ✓ Updated |
| ZIP Code Map | zip-code-map-05_13_25.tsx | client/src/components/ | 2025-05-13 | ✓ Updated |
| Theme Selector | ThemeSelector.tsx | client/src/components/ | 2025-05-14 | ✓ Updated |
| Individual Search | search-controlling-file-05_09_25.tsx | client/src/components/ | 2025-05-09 | ✓ Standardized |
| Payment Component | payment-controlling-file-05_09_25.tsx | client/src/components/ | 2025-05-09 | ✓ Standardized |
| Admin Pre-Processing | AdminPreProcessing.tsx | client/src/components/ | 2025-05-10 | ✓ Updated |

## Utility Files
| Feature/Function | File Name | File Location | Last Revised | Status |
|------------------|-----------|--------------|--------------|--------|
| Data Processing | pivotTableUtils.ts | client/src/utils/ | 2025-05-09 | ✓ In Use |
| API Client | api-client-controlling-file-05_09_25.ts | client/src/lib/ | 2025-05-09 | ✓ Standardized |
| Chart Theme Context | ChartThemeContext.tsx | client/src/context/ | 2025-05-14 | ✓ Added |
| Theme Hook | use-theme.ts | client/src/hooks/ | 2025-05-14 | ✓ Added |

## Route Mapping
The following routes are configured in App.tsx:

- /auth → auth-page-controlling-file-05_09_25.tsx
- / & /home → home-page-controlling-file-05_09_25.tsx
- /upload → upload-page-controlling-file-05_09_25.tsx 
- /admin → admin-page-controlling-file-05_09_25.tsx
- /payment → payment-page-controlling-file-05_09_25.tsx
- /billing → billing-page-controlling-file-05_10_25.tsx
- /receipts → receipts-page-controlling-file-05_09_25.tsx
- /receipts/:id → receipt-page-controlling-file-05_09_25.tsx
- /search → search-page-controlling-file-05_09_25.tsx
- /simplified-auto-pivot/:patientId? → simplified-auto-pivot-controlling-file-05_09_25.tsx
- /nivo-scatter-view/:patientId? → nivo-scatter-view-controlling-file-05_09_25.tsx
- /nivo-heatmap-view/:patientId? → nivo-heatmap-view-controlling-file-05_09_25.tsx
- /direct-grid-view/:patientId? → direct-grid-view-controlling-file-05_09_25.tsx
- /heatmap-view/:patientId? → heatmap-view-controlling-file-05_09_25.tsx
- /population-health → population-health-controlling-05_13_25.tsx

## Notes and Exceptions
- **AdminPreProcessing.tsx** is not using the standardized naming convention yet as it's a specialized internal component that's only used in the admin page.
- The search functionality is split across two files: search-page-controlling-file-05_09_25.tsx (page container) and search-controlling-file-05_09_25.tsx (search component).
- The API endpoints for login and logout are handled in server/routes.ts.

## Recent Updates (5/14/25)
- Updated Population Health page with correct patient count (24) and record count (1062)
- Made file information display more compact in Population Health page
- Fixed TopNav "Sign In" link visibility and positioning
- Added Visualization Data Source frame for printing with charts
- Implemented Chart Theme Context system for consistent chart styling
- Added Theme Selector component in the navigation bar
- Added HRSN Grid and supporting chart components for Population Health visualizations
- Fixed prop passing in Standardized HRSN Chart component
- Added missing required props to Categorical HRSN Chart component
- Updated chart components to force rendering even when filters return no data
- Added isPercentage flag to ensure charts display with correct data type
- Fixed Risk Stratification legend disappearing when chart is enlarged