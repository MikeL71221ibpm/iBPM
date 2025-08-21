# Post-Deployment Testing Guide - V3.4.29

## Quick Verification Checklist

### 1. Login Test
- [ ] Navigate to deployment URL
- [ ] Login with your credentials
- [ ] Verify authentication works

### 2. Search Security Test (CRITICAL)
- [ ] Go to Search page
- [ ] Search for "Bob Test1" or any patient
- [ ] **VERIFY**: Should only see YOUR data (not data from other users)
- [ ] Confirm search results match your user ID only

### 3. Upload Page Verification
- [ ] Navigate to Upload Data page
- [ ] **CHECK**: Required columns show underscore format:
  - patient_id (not patientId)
  - patient_name (not patientName)
  - dos_date (not dosDate)
  - note_text (not noteText)
- [ ] Verify HRSN categories section is visible
- [ ] Confirm field flexibility explanation is present

### 4. Visualization Tests
- [ ] Check Population Health Charts
- [ ] Open any bubble chart
- [ ] Click expand/maximize icon
- [ ] **VERIFY**: Export widget appears in expanded view
- [ ] Test CSV/Excel export functionality

### 5. Summary Tab
- [ ] Navigate to Individual Search
- [ ] Select a patient
- [ ] Go to Summary tab
- [ ] **CHECK**: Frequency groupings display (10+, 5-9, 3-4, 2, 1)
- [ ] Verify diagnosis trends section shows

### 6. Admin Interface (if admin)
- [ ] Go to Admin page
- [ ] **VERIFY**: Delete buttons are visible even with long usernames
- [ ] Buttons should be green (#10b981) and clearly visible

## Expected Results
- ✅ All user data properly isolated
- ✅ Upload instructions match database schema
- ✅ Export functionality on all charts
- ✅ Summary displays frequency-based groupings
- ✅ No errors in console

## Report Any Issues
If any test fails, note:
1. Which test failed
2. What you expected vs. what happened
3. Any error messages

**Deployment URL**: [Your Replit deployment URL]
**Version**: V3.4.29
**Deployed**: August 3, 2025