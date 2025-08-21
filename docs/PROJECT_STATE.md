# HRSN + BH Analytics Project State

## Last Updated: May 7, 2025

## Current Project State
- Successfully implemented standardized bubble sizing across all visualization components
- Fixed bubble sizing implementation with correct frequency values
- Cleaned up navigation by removing HD Viz tab and consolidating Heatmaps

## Recent Changes
- **May 7, 2025**: 
  - Removed HD Viz tab from top navigation
  - Renamed "Heatmaps V2" to "Heatmaps"
  - Removed original "Heatmaps" tab (pointing to /enhanced-heatmap/1)
  - Set up structured backup system

## Critical Components
- **Bubble Size Utility**: `client/src/lib/bubble-size-utils.ts` - Standardizes bubble sizing across visualizations
- **Navigation**: `client/src/components/MainNav.tsx` - Main navigation bar component
- **Visualization Components**:
  - `client/src/pages/nivo-scatter-view-themed-new-colors-fixed.tsx`
  - `client/src/pages/nivo-themed-row-colors-fixed.tsx`

## Design Standards
- **Bubble Sizing**: Using 10-tier standardized system (5px to 23px)
- **UI Layout**: Patient info above color scheme and export controls
- **Color Themes**: Iridis, Viridis, High Contrast, Red-Blue across all visualizations

## Next Steps
- ✓ Copy Heatmaps tab functionality to replace the Pivot Tables tab
- ✓ Update labels in Pivot Tables to reflect the right tab name
- ✓ Create PAGE_MAP.md to track active routes and their functionality
- Verify data consistency across visualizations
- Ensure uniform styling across all visualization components
- Continue optimizing bubble sizing for better visual distinction
- Implement additional export features

## Backup Locations
- Latest backup: `backups_05_07_2025/nav_update_05_07_2025_19_16_56/`
- Previous backups in dated folders (backups_05_06_2025, etc.)
## Latest Backup
- backups_05_07_2025/nav_updates_complete_19_17_42 - Wed 07 May 2025 07:17:42 PM UTC

## Latest Backup
- backups_05_07_2025/demo_backup_for_user_21_04_12 - Wed 07 May 2025 09:04:13 PM UTC

## Latest Backup
- backups_05_07_2025/page_map_added_21_19_32 - Wed 07 May 2025 09:19:32 PM UTC

## Latest Backup
- backups_05_07_2025/page_map_notes_updated_21_20_20 - Wed 07 May 2025 09:20:20 PM UTC
