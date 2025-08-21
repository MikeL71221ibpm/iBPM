# Pie Chart Connecting Titles Fix Pattern

## Problem
Pie charts not displaying connecting titles (arc link labels) that show category names like "Yes/No" or "Hispanic/Non-Hispanic" with connecting lines.

## Universal Fix Pattern

### Step 1: Component Change
Change from `CategoricalHrsnChart` to `StandardizedHrsnChart`

### Step 2: Chart Type Change  
Change `chartType` prop from `"pie"` to `"percentage"`

### Step 3: Keep Everything Else
Keep all other props identical (data, categoryName, colorScheme, etc.)

## Example Implementation

### Before (Missing Connecting Titles)
```tsx
<CategoricalHrsnChart
  data={filteredData}
  title="Financial Strain Percentage" 
  categoryName="financial_strain"
  chartType="pie"
  colorScheme={colorScheme}
  isPercentage={true}
  filterBy={filterConfig}
  dualSourceHrsnData={dualSourceHrsnData}
  compactMode={true}
/>
```

### After (Connecting Titles Working)
```tsx
<StandardizedHrsnChart
  data={filteredData}
  title="Financial Strain Percentage" 
  categoryName="financial_strain"
  chartType="percentage"
  colorScheme={colorScheme}
  filterBy={filterConfig}
  dualSourceHrsnData={dualSourceHrsnData}
  compactMode={true}
/>
```

## Why This Works

1. **StandardizedHrsnChart** routes percentage charts to **HrsnPieChart** component
2. **HrsnPieChart** uses **ResponsivePie** with `arcLinkLabelsSkipAngle={0}` configuration
3. This forces ALL connecting titles to display regardless of slice size
4. **Demographic Data Path**: Categories like financial_strain use simple demographic data processing

## Component Flow
```
StandardizedHrsnChart (chartType="percentage")
    ↓
HrsnPieChart (with arcLinkLabelsSkipAngle={0})
    ↓  
ResponsivePie (connecting titles forced to show)
```

## Successfully Applied To
- Ethnicity Percentage chart ✓
- Financial Strain Percentage chart ✓

## Future Applications
Any pie chart missing connecting titles can use this exact pattern:
1. Race Percentage chart
2. Gender Percentage chart  
3. Age Range Percentage chart
4. Any other categorical pie chart

## Key Configuration
The magic happens in `HrsnPieChart` component:
- `arcLinkLabelsSkipAngle={0}` forces external connecting titles
- `arcLabelsSkipAngle={0}` forces internal percentage labels
- Both settings ensure complete label visibility

## Developer Notes
- No complex initialization logic needed
- No data path modifications required
- Simple component and prop changes only
- Immediate results expected