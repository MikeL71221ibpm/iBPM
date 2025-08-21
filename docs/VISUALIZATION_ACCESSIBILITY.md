# Visualization Accessibility Specifications

This document outlines the accessibility specifications implemented in the HRSN + BH Analytics platform to ensure all visualizations are readable, compliant with accessibility standards, and optimized for clinical use.

## WCAG Compliance Standards

All visualizations follow the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards:

1. **Text Contrast Ratio**: Minimum 4.5:1 contrast ratio for all text elements
2. **Minimum Text Size**: 14px for all critical data labels and 16px for full-page views
3. **Meaningful Color Use**: Colors are used to enhance understanding but not as the sole differentiator of information

## Y-Axis Text Readability Specifications

To ensure all Y-axis labels are fully visible and legible regardless of length:

### Font Specifications
- **Font Size**: Minimum 14px in standard view, 16px in full-page view
- **Font Color**: Black (#000) for maximum contrast against white background
- **Font Weight**: Medium (500) for standard view, Semi-bold (600) for full-page view
- **Label Spacing**: Minimum 24px of vertical space per row

### Margin Specifications
- **Left Margin (Standard View)**: 240px for compact mode, 260px for expanded mode
- **Left Margin (Full Page)**: 520px to accommodate the longest labels
- **Label Positioning**: Text aligned right with 18-22px spacing from colored bullet points

### Dynamic Height Calculation
- Base height of 120px plus 24px per row item
- Calculation formula: `baseHeight + (rowCount * minHeightPerRow)`
- Minimum heights enforced by category type:
  - HRSN: 250px
  - Diagnostic Categories: 350px
  - Symptoms: 450px
  - Diagnoses: 450px

## Legend and Indicator Elements

### Color Bullets
- **Size**: 5px radius (10px diameter) for standard view
- **Size**: 6px radius (12px diameter) for full-page view
- **Position**: Left-aligned before each Y-axis label
- **Color**: Unique color per row, consistent across all views

### Color Scheme Options
- Default theme with soft blues, greens, and purples
- Viridis theme option available for colorblind accessibility
- Custom theme options with adjustable saturation/lightness

## Bubble Sizing Specifications
- Size represents occurrences in specific sessions
- 1 occurrence = 4px radius
- 2 occurrences = 7px radius 
- 3 occurrences = 10px radius
- Formula: `Math.max(4, Math.min(16, 4 + (occurrences - 1) * 3))`
- Maximum size capped at 16px radius

## Export Specifications

### PDF Export
- Patient identifier shown as: `Patient: [Name] ID#: [Formatted ID] - [Data Type]`
- Portrait orientation for better content fitting
- A4 size with proper margins

### CSV/Excel Export
- Column headers are dates
- Row labels include symptom/diagnosis name with total occurrence count
- Rows sorted by total occurrences (highest first)

## Testing Standards
All visualizations have been tested to ensure:
1. No text truncation even on labels with high occurrence counts
2. Proper spacing between elements for readability
3. Consistent bubble sizing that represents data accurately
4. Full visibility of all chart elements on screens of various sizes