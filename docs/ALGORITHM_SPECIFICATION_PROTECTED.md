# HRSN Behavioral Health Analytics - Algorithm Specification
## Version: 3.3.4 | Created: June 4, 2025
## Status: PROTECTED - NO MODIFICATIONS ALLOWED WITHOUT WRITTEN AUTHORIZATION

⚠️ **THIS DOCUMENT IS PROTECTED AND CANNOT BE MODIFIED WITHOUT EXPLICIT AUTHORIZATION**

---

## CORE ALGORITHM SPECIFICATION

### Symptom Extraction Algorithm Rules

**PRIMARY RULE**: If a symptom/problem appears in a note more than once at different positions, each occurrence should be counted and added to the database.

**DEDUPLICATION METHOD**: Position-based deduplication using the key format:
```
positionKey = `${symptomKey}-${matchPosition}`
```

**BATCH SIZE**: Approximately 400 records per batch (tested and optimized)

---

## DETAILED ALGORITHM IMPLEMENTATION

### 1. Position-Based Multi-Occurrence Detection
```
For each note:
  For each symptom pattern match:
    Create position key: symptom_text + "-" + position_in_text
    If position key not already recorded for this note:
      Add symptom occurrence to database
      Mark position key as recorded for this note
```

### 2. Multi-Symptom Per Note Expectation
- Medical notes containing 3,805 available symptom patterns (3,159 symptoms + 650 problems)
- Expected extraction ratio: Multiple symptoms per note (significantly higher than 0.99)
- Each legitimate symptom occurrence at different positions must be counted separately

### 3. Symptom Master File Integration
- Single source of truth: `Symptom_Segments_asof_4_30_25_MASTER.csv`
- All symptom segments and diagnoses must reference this file exclusively
- No alternative symptom sources permitted

---

## ALGORITHM VALIDATION REQUIREMENTS

### Expected Performance Metrics
- **Extraction Ratio**: > 2.0 symptoms per note minimum
- **Processing Speed**: ~400 notes per batch optimal
- **Data Integrity**: 100% position-based deduplication accuracy
- **Coverage**: All symptom patterns from master file must be searchable

### Validation Test Cases
1. **Multi-Occurrence Test**: Note with same symptom at different positions
2. **Multi-Symptom Test**: Note with multiple different symptoms
3. **Position Tracking Test**: Verify exact position recording
4. **Batch Processing Test**: Verify 400-note batch performance
5. **Master File Integrity Test**: Verify all patterns loaded correctly

---

## PROHIBITED MODIFICATIONS

### NEVER ALLOWED WITHOUT AUTHORIZATION:
- Changing position-based deduplication logic
- Modifying batch size from ~400 optimized value
- Altering multi-occurrence counting behavior
- Switching from master file as source of truth
- Adding excessive deduplication that prevents legitimate symptom counting
- Implementing single-symptom-per-note restrictions

### ALGORITHM PROTECTION ENFORCEMENT:
- Any modification to extraction logic requires written approval
- All changes must be validated against test cases before implementation
- Version control must track all algorithm modifications
- Rollback procedures must be available for unauthorized changes

---

## IMPLEMENTATION FILES COVERED BY THIS SPECIFICATION

### Primary Algorithm Files:
- `server/utils/symptomExtractor.ts`
- `server/utils/optimizedExtractor.ts`

### Data Source Files:
- `server/data/Symptom_Segments_asof_4_30_25_MASTER.csv`

### Related Processing Files:
- `server/routes.ts` (extraction endpoints)
- `server/database-storage.ts` (storage methods)

---

## COMPLIANCE VERIFICATION

This specification ensures:
1. Medical notes extract multiple symptoms as clinically expected
2. Each symptom occurrence at different positions is properly counted
3. No data loss due to over-aggressive deduplication
4. Consistent extraction performance across all datasets
5. Maintainable and predictable algorithm behavior

**VIOLATION OF THIS SPECIFICATION WILL RESULT IN DATA CORRUPTION AND SYSTEM FAILURE**

---

## AUTHORIZATION REQUIREMENT

Any changes to this specification or the covered algorithm files require:
1. Written request describing proposed changes
2. Justification for the modification
3. Impact analysis on existing data
4. Explicit written approval before implementation
5. Post-implementation validation testing

**NO EXCEPTIONS TO THIS AUTHORIZATION REQUIREMENT**