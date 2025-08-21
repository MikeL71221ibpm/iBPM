# Bubble Chart Reference

## Working Implementation
The current working implementation for bubble charts can be found at:
`/simple-bubble-chart-fixed/1`

## Features
- Proper row-based color assignment (each row has its own consistent color)
- Expand/collapse functionality
- SVG download capability
- Consistent positioning of bubbles with axis labels
- Color theme support

## Notes
- Bubble size standardization follows a 10-tier system (5px for value 1, up to 23px for value ≥10)
- Successfully fixed React hooks ordering issues
- Further work needed on precise bubble placement and chart formatting
- Need to test bubble size algorithm in next session

## Implementation Details
This implementation uses direct SVG rendering rather than Nivo components, which provides better control over the visualization details.