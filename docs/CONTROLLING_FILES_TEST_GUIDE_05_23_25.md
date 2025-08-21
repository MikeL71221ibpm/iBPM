# HRSN Analytics - Testing Guide: Controlling Files (05/23/25)

This document provides a comprehensive testing sequence with all current controlling files, organized by application flow. Use this as your guide for systematic testing from login through payment.

## 1. Authentication Flow

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/pages/auth-page-controlling-file-05_09_25.tsx` | 05/09/25 | Login/Register Page | User authentication, login form validation, registration flow |
| `client/src/hooks/use-auth.tsx` | 05/09/25 | Auth Provider | Authentication context, session persistence |
| `client/src/lib/protected-route.tsx` | 05/09/25 | Route Protection | Protected route access, unauthorized redirects |

## 2. Navigation System

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/components/topnav-reorganized-final-05_23_25.tsx` | 05/23/25 | Top Navigation Bar | Navigation links, responsive behavior, active state indicators |
| `client/src/components/SideNavigation.tsx` | 05/17/25 | Side Navigation | Menu expansion, category navigation, responsive behavior |
| `client/src/components/BreadcrumbNavigation.tsx` | 05/09/25 | Breadcrumb Navigation | Path tracking, navigation hierarchy, state preservation |
| `client/src/components/NavigationButton.tsx` | 05/17/25 | Navigation Buttons | Button functionality, visual states, size variations |

## 3. Data Upload & Search Flow

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/pages/upload-page-controlling-file-05_09_25.tsx` | 05/09/25 | Data Upload Page | File uploads (CSV/XLSX), validation, error handling |
| `client/src/pages/search-page-controlling-file-05_09_25.tsx` | 05/09/25 | Search Interface | Search query execution, filtering options, results display |
| `client/src/components/search-flow-controlling-file-05_17_25.tsx` | 05/17/25 | Search Process Flow | Multi-step search process, state management between steps |

## 4. Population Health Charts (Primary Visualization)

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/components/population-health-charts-controlling-file-05_23_25.tsx` | 05/23/25 | Population Health Charts | All 36 HRSN charts, display toggle (count/percentage), legend |
| `client/src/components/categorical-hrsn-chart-05_13_25.tsx` | 05/13/25 | Categorical HRSN Charts | Categorical data visualization, filtering, interactions |
| `client/src/components/standardized-hrsn-chart-05_13_25.tsx` | 05/13/25 | Standardized HRSN Charts | Standard chart templates, consistency across visualizations |

## 5. Patient-Specific Visualizations

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/components/patient-heatmap-collection-controlling-file-05_17_25.tsx` | 05/17/25 | Patient Heatmap Collection | Multiple heatmap rendering, data integrity across views |
| `client/src/components/hrsn-heatmap-controlling-file-05_17_25.tsx` | 05/17/25 | HRSN Heatmap | HRSN-specific heatmap visualization, data mapping |
| `client/src/components/social-determinants-heatmap-controlling-file-05_17_25.tsx` | 05/17/25 | Social Determinants Heatmap | Social determinants visualization, data interpretation |
| `client/src/pages/nivo-scatter-view-controlling-file-05_09_25.tsx` | 05/09/25 | Bubble Chart View | Interactive bubble chart, data point interactions |
| `client/src/pages/nivo-heatmap-view-controlling-file-05_09_25.tsx` | 05/09/25 | Heatmap View | Heatmap visualization, cell highlighting, tooltips |

## 6. Export & Print System

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/components/chart-export-widget.tsx` | 05/23/25 | Export Widget | Export menu, all export options functionality |
| `client/src/components/chart-export-buttons.tsx` | 05/23/25 | Export Buttons | Individual export buttons, action triggers |
| `client/src/lib/chart-export-functions.ts` | 05/23/25 | Export Functions | Data extraction, file generation (CSV, Excel, JSON) |
| `client/src/components/chart-printer-demo.tsx` | 05/23/25 | Print Component | Print preview, print execution, output quality |

## 7. Payment & Billing System

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/pages/payment-page-controlling-file-05_09_25.tsx` | 05/09/25 | Payment Page | Payment form, Stripe integration, transaction processing |
| `client/src/pages/receipt-page-controlling-file-05_09_25.tsx` | 05/09/25 | Receipt Page | Transaction receipt display, itemized charges |
| `client/src/pages/receipts-page-controlling-file-05_09_25.tsx` | 05/09/25 | Receipts List | Historical receipts listing, filtering options |
| `client/src/pages/receipt-detail-controlling-file-05_10_25.tsx` | 05/10/25 | Receipt Detail | Detailed transaction information, downloadable receipt |
| `client/src/pages/billing-page-controlling-file-05_10_25.tsx` | 05/10/25 | Billing Management | Billing history, payment methods, subscription status |

## 8. Administration

| Controlling File | Last Updated | Page/Component | Testing Focus |
|------------------|--------------|----------------|--------------|
| `client/src/pages/admin-page-controlling-file-05_09_25.tsx` | 05/09/25 | Admin Dashboard | Administrative overview, system metrics |
| `client/src/pages/admin-direct.tsx` | 05/09/25 | Direct Admin Access | Direct data manipulation, administrative functions |
| `client/src/pages/admin-setup.tsx` | 05/09/25 | System Configuration | System settings, configuration parameters |

## Testing Flow Sequence

For thorough end-to-end testing, follow this sequence:

1. **Authentication**: Login/registration functionality
2. **Navigation**: Verify all navigation components and routes
3. **Data Management**: Test upload functionality and search processes
4. **Visualization Review**: Test all population health charts
5. **Patient-Specific Views**: Test individual patient visualizations
6. **Export & Print Testing**: Verify all export formats and print functionality
7. **Payment Processing**: Test the complete payment workflow
8. **Administration**: Test administrative functions if applicable

## Important Testing Notes

- Each controlling file contains the authoritative implementation for its respective feature
- When encountering issues, reference the controlling file first before checking other files
- After testing each component, document any issues with specific reference to the controlling file
- Focus first on critical user flows: authentication → visualization → export → payment