# Controlling File Sync Protocol - Enforcement Guide

## MANDATORY CHECKLIST - Before ANY Controlling File Changes

### Pre-Change Validation ✅
- [ ] Current controlling file identified: `population-health-charts-controlling-file-05_23_25.tsx`
- [ ] Bulletproof backup located: `v3.3.7-bulletproof-backup-06_18_25/client/src/components/PopulationHealthCharts.tsx`
- [ ] Change reason documented in replit.md
- [ ] Performance baseline confirmed: 70ms API response target

### Change Implementation Process ✅
1. **NEVER edit controlling file directly without backup**
2. **Create dated backup first**: `population-health-charts-controlling-file-MM_DD_YY_backup.tsx`
3. **Reference bulletproof backup** for proven implementations
4. **Test immediately** after each change
5. **Document in replit.md** with specific technical details

### Post-Change Validation ✅
- [ ] Risk Stratification shows dynamic ranges (not hardcoded)
- [ ] Dropdown counts display correctly (no duplicates)
- [ ] All four charts render authentic database data
- [ ] Performance maintained: API calls under 500ms
- [ ] No console errors related to chart components
- [ ] Real-time statistics working (5,262 patients, 47,984 notes, 149,949 symptoms)

### Emergency Rollback Procedure 🚨
If ANY validation fails:
1. **STOP IMMEDIATELY** - Do not proceed with further changes
2. **Restore from bulletproof backup** using proven components
3. **Document the failure** in replit.md
4. **Identify root cause** before attempting changes again

## Component-Specific Enforcement

### Risk Stratification Function
**Golden Standard**: Uses dynamic ranges based on symptom distribution
- Small datasets (≤10): 4-tier adaptive system
- Medium datasets (≤50): 5-tier system  
- Large datasets (>50): 6-tier with percentage-based thresholds
- **NEVER hardcode** ranges like "100+ symptoms"

### Dropdown System
**Golden Standard**: Backend pre-formats labels with counts
- Labels come from API as "Category Name (count)"
- Frontend uses labels directly without modification
- **NEVER duplicate** count calculation in frontend

### Performance Requirements
**Golden Standard**: Sub-500ms response times
- API caching: 15-minute staleTime, 30-minute gcTime
- Database queries optimized with LIMIT clauses
- **NEVER disable** caching without performance testing

## Automation Safeguards

### File Watching Script
```bash
# Monitor controlling file for unauthorized changes
watch -n 5 'ls -la client/src/components/population-health-charts-controlling-file-*.tsx | tail -1'
```

### Validation Script Location
Run after ANY controlling file change:
```bash
npm run validate-controlling-file
```

### Git Protection
```bash
# Protect against accidental commits of broken controlling files
git add .github/workflows/controlling-file-validation.yml
```

## Enforcement Authority

**WHO CAN MODIFY**: Only senior developers after following full protocol
**APPROVAL REQUIRED**: Document in replit.md before changes
**TESTING MANDATORY**: All validation checkboxes must be completed
**ROLLBACK TRIGGER**: Any single validation failure requires immediate rollback

## Success Metrics

- Zero performance regressions (maintain 70ms target)
- Zero chart data connection breaks
- Zero dropdown duplicate display
- 100% dynamic Risk Stratification functionality
- Complete audit trail in replit.md

---

**REMEMBER**: The bulletproof backup is your source of truth. When in doubt, restore from proven implementations rather than experimenting with fixes.