# HRSN Chart Dimensions Reference Standard
## Established July 19, 2025 - PRODUCTION READY

This document defines the **exact dimensions and configuration parameters** for all HRSN charts (excluding Financial Strain) to serve as the **reference standard** for future demographic charts development (Age Range, Gender, Race, Ethnicity, Zip Code).

---

## ✅ UNIVERSAL CHART CONTAINER SPECIFICATIONS

### Chart Height Configuration
```typescript
height: '250px' // Fixed height for all distribution heatmaps
```

### Card Component Configuration
```typescript
compactMode: true // For HRSN grid display
className: 'p-0 border-0 shadow-none' // When compactMode enabled
```

---

## ✅ BAR CHART DIMENSIONS (Count Charts)

### Margins Configuration
```typescript
// COMPACT MODE (HRSN Grid Display)
margin: { 
  top: 5, 
  right: 5, 
  bottom: 70,  // Sufficient space for rotated labels
  left: 30     // Compact Y-axis space
}

// EXPANDED MODE (Dialog Display)  
margin: { 
  top: 5, 
  right: 10, 
  bottom: 60,  // Standard expanded space
  left: 50     // Full Y-axis legend space
}
```

### Axis Configuration
```typescript
axisBottom: {
  tickSize: 5,
  tickPadding: 8,
  tickRotation: -45,           // Angled labels to prevent overlap
  legendOffset: compactMode ? 35 : 45,
  legend: "Category Label"     // Dynamic based on field type
}

axisLeft: {
  tickSize: 5,
  tickPadding: 8,
  tickRotation: 0,
  legendPosition: "middle",
  legendOffset: -45,
  legend: "Count"
}
```

---

## ✅ PIE CHART DIMENSIONS (Percentage Charts)

### Margins Configuration
```typescript
// COMPACT MODE (HRSN Grid Display)
margin: { 
  top: 5, 
  right: 5, 
  bottom: 20,  // Minimal bottom space
  left: 5      // Minimal left space
}

// EXPANDED MODE (Dialog Display)
margin: { 
  top: 40,     // Space for external labels
  right: 80,   // Space for external labels
  bottom: 80,  // Space for external labels
  left: 80     // Space for external labels
}
```

### Visual Properties
```typescript
innerRadius: 0.5,              // Donut style
padAngle: 0.7,                 // Spacing between slices
cornerRadius: 3,               // Rounded corners
activeOuterRadiusOffset: 8,    // Hover expansion
borderWidth: 1,
arcLinkLabelsSkipAngle: 10,    // Skip small slice labels
arcLabelsSkipAngle: 10         // Skip small slice labels
```

---

## ✅ HEATMAP DIMENSIONS (Distribution Charts) - CRITICAL REFERENCE

### Container Height
```typescript
height: '250px' // Fixed container height for all distribution heatmaps
```

### Margins Configuration ⭐ **MASTER REFERENCE**
```typescript
margin: { 
  top: 40,     // Space for age range labels
  right: 30,   // Minimal right space
  bottom: 180, // Extended space for X-axis legend "Age Range"
  left: 90     // Extended space for Y-axis category legend
}
```

### Critical Alignment Configuration
```typescript
// X-AXIS (Age Range Labels) - PERFECTLY ALIGNED ✅
axisBottom: {
  tickSize: 5,
  tickPadding: 20,
  tickRotation: 0,
  legend: 'Age Range',
  legendPosition: 'middle',
  legendOffset: 50,
  renderTick: (tick) => ({
    textAnchor: "middle",
    dominantBaseline: "central",
    fontSize: "12px",
    fontWeight: "bold",
    dy: 8
  })
}

// Y-AXIS (Category Labels) - PERFECTLY ALIGNED ✅
axisLeft: {
  tickSize: 5,
  tickPadding: 15,
  tickRotation: 0,
  legendPosition: 'middle',
  legendOffset: -75,
  renderTick: (tick) => ({
    textAnchor: "end",
    dominantBaseline: "central",
    fontSize: "11px",
    fontWeight: "bold",
    dx: -15
  })
}
```

### Cell Configuration - CRITICAL FOR ALIGNMENT ⭐
```typescript
cellComponent: ({ cell }) => {
  // CENTER CELLS WITH AXIS LABELS - THIS IS THE KEY FIX
  const adjustedX = cell.x - (cell.width * 0.5);   // Horizontal centering
  const adjustedY = cell.y - (cell.height * 0.5);  // Vertical centering
  
  return (
    <g transform={`translate(${adjustedX},${adjustedY})`}>
      <rect width={cell.width} height={cell.height} fill={cell.color} />
      <text x={cell.width/2} y={cell.height/2} 
            textAnchor="middle" dominantBaseline="central">
        {cell.value}%
      </text>
    </g>
  );
}

// Visual Properties
cellPadding: 8,
cellBorderRadius: 2,
forceSquare: false,
sizeVariation: 0,
borderWidth: 1,
borderColor: "#ffffff"
```

---

## ✅ COLOR SCHEME SPECIFICATIONS

### Standard HRSN Colors
```typescript
// Yes/No Binary Categories
Yes: '#22c55e' // Green
No:  '#3b82f6' // Blue

// Empty Cells
emptyColor: '#f8fafc' // Light gray

// Border Colors
borderColor: { from: 'color', modifiers: [['darker', 0.4]] }
```

### Multi-Category Color Schemes
```typescript
colorSchemes: {
  blue: 'blues',
  green: 'greens', 
  purple: 'purples',
  orange: 'oranges',
  red: 'reds'
}
```

---

## ✅ RESPONSIVE BEHAVIOR

### Compact vs Expanded Mode
```typescript
// Grid Display (compactMode: true)
- Reduced margins for space efficiency
- Simplified legends and labels  
- Height: 250px fixed
- Minimal padding and borders removed

// Dialog Display (compactMode: false)
- Full margins for complete visibility
- Full legends and axis labels
- Height: 800px for expanded dialogs
- Professional styling with borders/shadows
```

---

## ✅ FIELD MAPPING STANDARD

### Supported HRSN Fields (Excluding Financial Strain)
```typescript
supportedFields: [
  'housing_insecurity',      // → 'Housing Status'
  'food_insecurity',         // → 'Food Status'  
  'access_to_transportation', // → 'Transportation Access'
  'has_a_car',              // → 'Car Ownership'
  'veteran_status',          // → 'Veteran Status'
  'education_level',         // → 'Education Level'
  'utility_insecurity'       // → 'Utilities Status'
]
```

---

## ⚠️ FINANCIAL STRAIN EXCEPTION

**Financial Strain charts use different dimensions** - this reference standard applies to **ALL OTHER HRSN categories only**.

---

## ✅ USAGE FOR DEMOGRAPHIC CHARTS

When developing **Age Range, Gender, Race, Ethnicity, and Zip Code** charts, use these **exact dimensions** as the foundation:

1. **Copy heatmap margins exactly**: `{ top: 40, right: 30, bottom: 180, left: 90 }`
2. **Copy cell alignment logic exactly**: Both X and Y axis centering adjustments
3. **Copy axis configuration exactly**: renderTick functions and offsets
4. **Copy container height exactly**: `250px` for distribution charts
5. **Copy compact mode margins exactly** for bar and pie charts

This ensures **consistent visual alignment** across all chart types in the platform.

---

**Document Status**: ✅ PRODUCTION READY  
**Last Updated**: July 19, 2025  
**Scope**: Universal HRSN dimensions excluding Financial Strain  
**Purpose**: Reference standard for demographic chart development