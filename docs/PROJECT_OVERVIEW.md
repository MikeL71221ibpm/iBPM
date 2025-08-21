# HRSN + BH Analytics Platform Overview

## Project Description
The HRSN (Health-Related Social Needs) + BH (Behavioral Health) Analytics Platform is a sophisticated web application designed to transform complex healthcare data into actionable insights. The platform enables healthcare providers to analyze patient data, focusing on symptoms, diagnoses, and social determinants of health through advanced visualizations.

## Core Functionality
The application provides:
1. **Data Visualization**: Multiple synchronized visualization types (bubble charts, heatmaps, and pivot tables)
2. **Patient Analysis**: Tools to track patient health over time and identify patterns
3. **Payment Processing**: Stripe integration for $1 per search and $1 per unique patient
4. **File Upload**: Support for CSV and XLSX files from various EHR systems
5. **User Authentication**: Secure login and user management system

## Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Visualization**: Nivo charts (bar, circle-packing, heatmap, pie, scatterplot)
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with Passport.js
- **Payment**: Stripe integration for subscription and one-time payments

## Key Features Implemented
- Bubble chart visualization with consistent row-based coloring
- Theme selector with various color schemes (Iridis, Viridis, High Contrast, Red-Blue)
- Data deduplication and standardization
- Expandable chart views with download capability
- User authentication and session management

## Implementation Status
1. **Visualization Components**:
   - Bubble charts ✓ (Available at `/simple-bubble-chart-fixed/1`)
   - Heatmaps ✓
   - Pivot tables ✓

2. **Core Features**:
   - Authentication system ✓
   - Data processing pipeline ✓
   - API endpoints for data retrieval ✓
   - Stripe integration ✓
   - Theme selector ✓

3. **In Progress/Planned**:
   - Improving bubble placement precision
   - Refining chart formatting
   - Testing bubble size algorithm
   - Implementing universal theme selector
   - Adding user dashboard for analytics

## Development Philosophy
- **Simple Approach First**: Always start with the simplest solution that meets requirements
- **Focused Changes**: When fixing issues, make targeted changes that directly address problems
- **Avoid Over-engineering**: Complex solutions often introduce new problems and are harder to maintain
- **Pragmatic Refactoring**: Improve code when needed, but don't refactor for its own sake

### Best Practices
- When fixing UI layout issues, aim for the minimum change needed (e.g., adjusting padding or font size)
- Use existing UI components and CSS utility classes before creating custom solutions
- Test solutions on various screen sizes to ensure consistent behavior
- Document effective approaches for reuse across the application (like the Patient Details layout fix)

## Development Guidelines
- All visualizations follow a consistent model for implementing theme selection
- Color theme selectors positioned to the right of patient name/ID on the same line
- Card headers use text-base font-bold, patient ID uses text-xs, description text uses text-xs
- Theme colors are assigned consistently across visualization types
- SVG export functionality available for all chart types

### Controlling Files Concept
The application uses a "controlling files" approach to manage functionality. A controlling file is the authoritative file that determines a specific application behavior. These files:

- Must be explicitly defined in PAGE_MAP.md
- Require approval before modification
- Serve as the "golden guide" for application functionality
- Help prevent duplicate implementations
- Provide a single source of truth for each feature

The key benefits of this approach:
1. Eliminates ambiguity about where functionality is implemented
2. Reduces risk of unintentional changes
3. Improves maintainability and onboarding
4. Provides a clear structure for the application

### File Management
- **Always consult `PAGE_MAP.md` before editing files**: The application contains multiple versions of similar components
- **When making changes**:
  - Verify you're editing the correct active file listed in PAGE_MAP.md
  - Always specify exact file paths when discussing code changes
  - Update file modification tracking in PAGE_MAP.md
- **Communication protocol**:
  - Always provide exact file paths when discussing changes
  - Include links to specific files when requesting reviews
  - Specify active file versions in all communication

## Reference Documentation
- **File mapping**: See `PAGE_MAP.md` - CRITICAL reference for active file paths
- Bubble charts: See `BUBBLE_CHART_REFERENCE.md`
- Visualization accessibility: See `VISUALIZATION_ACCESSIBILITY.md`
- Project state: See `PROJECT_STATE.md`
- Session notes: See `SESSION_NOTES.md`
- Session summaries: See `SESSION_SUMMARY_*.md` files

## Key URLs
- Bubble Chart: `/simple-bubble-chart-fixed/1`
- Heatmap: `/enhanced-heatmap-view-fixed/1`
- Scatter Plot: `/nivo-scatter-view-themed-new-colors-fixed/1`
- Pivot Table: `/simplified-auto-pivot/1`

## Future Development
- Implement more sophisticated AI-powered analytics
- Add customizable dashboards for different healthcare roles
- Enhance reporting capabilities
- Improve data export options
- Add comparative analysis tools