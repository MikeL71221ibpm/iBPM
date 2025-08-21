# CONTROLLING FILES MASTER LIST (Updated 05/27/25 - v3.2.1)

This document provides a comprehensive list of all controlling files in the HRSN + BH Analytics application. **ALWAYS CHECK THESE FILES FIRST** before building new functionality to avoid losing existing features.

## 🔴 CRITICAL: ALWAYS USE EXISTING CONTROLLING FILES
**Before creating any new component or page, reference this list to use existing standardized files.**

---

## PAGE CONTROLLING FILES (client/src/pages/)

### Core Application Pages
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `auth-page-controlling-file-05_09_25.tsx` | Login/Register Page, default landing | 05/09/25 | ✓ Active |
| `home-page-controlling-file-05_09_25.tsx` | Dashboard/Home Page | 05/09/25 | ✓ Active |
| `search-page-controlling-file-05_09_25.tsx` | Patient Search Interface | 05/09/25 | ✓ Active |
| `upload-page-controlling-file-05_24_25.tsx` | File Upload with Start Processing | 05/24/25 | ✓ Updated |
| `admin-page-controlling-file-05_09_25.tsx` | Admin Functions | 05/09/25 | ✓ Active |

### Payment and Billing Pages
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `payment-page-controlling-file-05_09_25.tsx` | Stripe Payment Processing | 05/09/25 | ✓ Active |
| `billing-page-controlling-file-05_10_25.tsx` | Billing History Management | 05/10/25 | ✓ Active |
| `receipts-page-controlling-file-05_09_25.tsx` | All Receipts List View | 05/09/25 | ✓ Active |
| `receipt-page-controlling-file-05_09_25.tsx` | Individual Receipt View | 05/09/25 | ✓ Active |
| `receipt-detail-controlling-file-05_10_25.tsx` | Detailed Receipt Information | 05/10/25 | ✓ Active |

### Visualization Pages
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `bubble-charts-page.tsx` | **NEW v3.2.1** Bubble Charts with 30-row pagination | 05/27/25 | ✓ Current |
| `nivo-scatter-view-controlling-file-05_09_25.tsx` | Scatter Plot Visualization | 05/09/25 | ✓ Active |
| `nivo-heatmap-view-controlling-file-05_09_25.tsx` | Heatmap Visualization | 05/09/25 | ✓ Active |
| `heatmap-page.tsx` | Main Heatmap Interface | Current | ✓ Active |
| `all-pivots-page.tsx` | All Pivot Tables View | Current | ✓ Active |
| `individual-search-page.tsx` | Individual Patient Analysis | Current | ✓ Active |
| `population-health-page.tsx` | Population Health Analytics | Current | ✓ Active |
| `direct-grid-view-controlling-file-05_09_25.tsx` | Grid Data Visualization | 05/09/25 | ✓ Active |
| `simplified-auto-pivot-controlling-file-05_09_25.tsx` | Simplified Pivot Tables | 05/09/25 | ✓ Active |

---

## COMPONENT CONTROLLING FILES (client/src/components/)

### Navigation Components
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `topnav-component-controlling-file-05_09_25.tsx` | **PRIMARY** Top Navigation Bar | 05/09/25 | ✓ Active |
| `navigation-controlling-file-05_09_25.tsx` | Main Navigation Logic | 05/09/25 | ✓ Active |
| `top-navigation-controlling-file-05_09_25.tsx` | Alternative Top Navigation | 05/09/25 | ✓ Backup |
| `SideNavigation.tsx` | Side Navigation Component | Current | ✓ Active |
| `BreadcrumbNavigation.tsx` | Breadcrumb Navigation | Current | ✓ Active |
| `NavigationButton.tsx` | Navigation Button Component | 05/17/25 | ✓ Updated |

### Search and Data Flow Components
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `search-flow-controlling-file-05_17_25.tsx` | **PRIMARY** Search Results Flow | 05/17/25 | ✓ Active |
| `search-controlling-file-05_09_25.tsx` | Search Component Logic | 05/09/25 | ✓ Active |
| `DatabaseStatsWidget.tsx` | **NEW v3.2.1** Database Statistics Display | 05/27/25 | ✓ Current |

### Visualization Components
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `bubblechart-component-controlling-file-05_09_25.tsx` | Bubble Chart Visualization | 05/09/25 | ✓ Active |
| `heatmap-component-controlling-file-05_09_25.tsx` | Heatmap Component | 05/09/25 | ✓ Active |
| `patient-heatmap-collection-controlling-file-05_24_25.tsx` | Patient Heatmaps w/ Fullscreen | 05/24/25 | ✓ Updated |
| `hrsn-heatmap-controlling-file-05_17_25.tsx` | HRSN Specific Heatmap | 05/17/25 | ✓ Active |
| `social-determinants-heatmap-controlling-file-05_17_25.tsx` | Social Determinants Heatmap | 05/17/25 | ✓ Active |
| `HeatmapVisualizer.tsx` | **NEW v3.2.1** Enhanced Heatmap Visualizer | 05/27/25 | ✓ Current |

### Chart and Analytics Components
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `population-health-charts-controlling-file-05_17_25.tsx` | **PRIMARY** Population Health Charts | 05/17/25 | ✓ Active |
| `standardized-hrsn-chart-controlling-file-05_17_25.tsx` | Standardized HRSN Metrics | 05/17/25 | ✓ Active |
| `categorical-hrsn-chart-controlling-file-05_17_25.tsx` | HRSN Categories Chart | 05/17/25 | ✓ Active |
| `hrsn-grid-controlling-file-05_17_25.tsx` | HRSN Grid View | 05/17/25 | ✓ Active |
| `hrsn-pie-chart-controlling-file-05_17_25.tsx` | HRSN Pie Chart | 05/17/25 | ✓ Active |

### Authentication and User Components
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `login-status-indicator-controlling-file-05_25_25.tsx` | Login Status Display | 05/25/25 | ✓ Active |
| `LoginButton.tsx` | Login Button Component | Current | ✓ Active |

---

## UTILITY AND LIBRARY FILES

### Authentication and Security
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `client/src/hooks/use-auth.tsx` | Authentication Hook | Current | ✓ Active |
| `client/src/lib/protected-route.tsx` | Route Protection | Current | ✓ Active |

### Data Processing and Utilities
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `client/src/lib/bubble-size-utils.ts` | **NEW v3.2.1** Bubble Size Calculations | 05/27/25 | ✓ Current |
| `client/src/lib/queryClient.ts` | API Query Management | Current | ✓ Active |

### Styling and Themes
| File Name | Function | Last Updated | Status |
|-----------|----------|--------------|--------|
| `client/src/pages/bubble-chart-styles.css` | **NEW v3.2.1** Bubble Chart Styling | 05/27/25 | ✓ Current |

---

## 🚨 CRITICAL NOTES FOR DEVELOPERS

### v3.2.1 NEW ADDITIONS (05/27/25)
- `bubble-charts-page.tsx` - Smart 30-row pagination system
- `DatabaseStatsWidget.tsx` - Real-time database statistics
- `HeatmapVisualizer.tsx` - Enhanced heatmap functionality
- `bubble-size-utils.ts` - Standardized bubble size calculations
- `bubble-chart-styles.css` - Dedicated bubble chart styling

### ALWAYS CHECK FIRST RULE
1. **Search this list BEFORE creating any new component**
2. **Use existing controlling files instead of rebuilding**
3. **Update this list when adding new controlling files**
4. **Preserve all existing functionality when making changes**

### FILE NAMING CONVENTION
- Components: `[component]-controlling-file-MM_DD_YY.tsx`
- Pages: `[page]-controlling-file-MM_DD_YY.tsx`
- New files: Use current date in MM_DD_YY format

---

**Last Updated:** 05/27/25  
**Version:** v3.2.1  
**Next Update:** When new controlling files are added