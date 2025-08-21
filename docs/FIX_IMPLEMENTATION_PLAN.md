# Fix Implementation Plan for v3.5.10

## Issues to Fix (6 of 8, excluding Progress Bar and Processing Notification)

### 1. ✅ Export Bug - ALREADY FIXED
- Download now provides full patient data with proper CSV formatting

### 2. ❌ AND/OR Boolean Toggle Not Visible
**Current State**: No visible AND/OR toggle in Population Health page
**Fix Required**: Add a toggle button to switch between AND/OR logic
**Location**: Population_Health_Page_v2_05_23_25_3x2_Grid.tsx around line 2536

### 3. ❌ Search Synopsis Missing Logic Display  
**Current State**: Search results don't show which Boolean logic was used
**Fix Required**: Add "Using AND logic" or "Using OR logic" to synopsis
**Location**: Population_Health_Page_v2_05_23_25_3x2_Grid.tsx in findRecords function

### 4. ❌ HRSN Search Returns 0 Records
**Current State**: HRSN searches use client-side filtering but may not be configured correctly
**Fix Required**: Fix HRSN filtering logic to properly query the Problem fields
**Location**: Population_Health_Page_v2_05_23_25_3x2_Grid.tsx lines 796-835

### 5. ✅ Session Timeout - ALREADY SUFFICIENT
**Current State**: Session is set to 30 days with rolling refresh
**No Fix Needed**: This is already very generous

### 6. ❌ Database Widget Not Refreshing
**Current State**: Database stats don't update after operations
**Fix Required**: Add refresh calls after extraction/upload completes
**Location**: Need to trigger database stats refresh in extraction completion

### 7. ❌ Upload Button Too Prominent  
**Current State**: Upload button size needs reduction per user feedback
**Fix Required**: Reduce button size (was approved August 4, 2025)
**Location**: upload-page-controlling-file-05_24_25.tsx

## Implementation Order
1. Add AND/OR toggle button
2. Add logic display to search synopsis
3. Fix HRSN search filtering
4. Add database widget refresh
5. Reduce upload button size