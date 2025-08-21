# HRSN Enhancement Implementation Plan - FLEXIBLE MAPPING APPROACH
## Adding Complete Health-Related Social Needs Categories

### Overview
This plan implements a flexible HRSN mapping system that can handle all social determinant fields including Housing, Food, Financial, Transportation, Utilities, Childcare, Elder Care, Employment, Education, Legal, and Social Isolation needs. The system uses a flexible "HRSN Mapping" column approach for maximum scalability.

### Implementation Components - COMPLETED ✅

#### 1. Database Updates - COMPLETED ✅
- ✅ Added `hrsn_mapping` column to `symptom_master` table
- ✅ Added all HRSN fields to `extracted_symptoms` table:
  - housing_status, food_status, financial_status
  - transportation_needs, has_a_car, utility_insecurity
  - childcare_needs, elder_care_needs, employment_status
  - education_needs, legal_needs, social_isolation
- ✅ Updated extraction algorithms to use flexible HRSN mapping

#### 2. Master List Enhancement Strategy - READY FOR IMPLEMENTATION

**NEW: Flexible CSV Structure with HRSN Mapping Column:**
```csv
diagnostic_category,diagnosis_icd10_code,diagnosis,dsm_symptom_criteria,symptom_id,symptom_segment,zcode_hrsn,symp_prob,hrsn_mapping
Social Determinants,Z59.0,Housing Problems,Inadequate housing,Z59.001,Housing instability,Yes,Problem,housing_status
Social Determinants,Z59.0,Housing Problems,Homelessness,Z59.002,Homelessness,Yes,Problem,housing_status
Social Determinants,Z59.4,Food Insecurity,Food insecurity,Z59.4001,Food insecurity,Yes,Problem,food_status
Social Determinants,Z60.2,Financial Problems,Financial strain,Z60.001,Financial difficulties,Yes,Problem,financial_status
Social Determinants,Z65.0,Transportation Problems,Lack of transportation,Z65.001,Transportation barriers,Yes,Problem,transportation_needs
Social Determinants,Z65.1,Car Access,No reliable vehicle,Z65.101,Lacks personal vehicle,Yes,Problem,has_a_car
Social Determinants,Z59.8,Utility Issues,Utility shut-off,Z59.801,Utility insecurity,Yes,Problem,utility_insecurity
Social Determinants,Z63.6,Childcare Problems,Inadequate childcare,Z63.601,Childcare barriers,Yes,Problem,childcare_needs
Social Determinants,Z63.7,Elder Care Issues,Elder care burden,Z63.701,Elder care needs,Yes,Problem,elder_care_needs
Social Determinants,Z56.0,Employment Problems,Unemployment,Z56.001,Job insecurity,Yes,Problem,employment_status
Social Determinants,Z55.0,Education Barriers,Educational needs,Z55.001,Education access issues,Yes,Problem,education_needs
Social Determinants,Z65.3,Legal Problems,Legal issues,Z65.301,Legal assistance needed,Yes,Problem,legal_needs
Social Determinants,Z63.5,Social Isolation,Social disconnection,Z63.501,Social isolation,Yes,Problem,social_isolation
```

#### 3. Algorithm Updates - COMPLETED ✅
- ✅ Updated `symptomExtractor.ts` to use flexible hrsn_mapping approach
- ✅ Updated `optimizedExtractor.ts` for parallel processing
- ✅ Both extractors now populate appropriate HRSN fields based on hrsn_mapping value
- ✅ System sets "Problem Identified" when HRSN problems are detected

#### 4. Demographic Data Collection - COMPLETED ✅
- ✅ Enhanced `patients` table schema with demographic fields:
  - age_range (calculated or provided)
  - date_of_birth (optional, auto-calculates age_range)
  - gender, race, ethnicity, zip_code
- ✅ Created age calculation utility (`ageCalculator.ts`)
- ✅ Updated upload interface with demographic requirements
- ✅ Added transparent messaging about HRSN analysis requirements

#### 5. Revised Master List Integration - COMPLETED ✅
- ✅ Processed revised Symptom_Segments Master List with hrsn_mappings column
- ✅ Loaded 3,796 symptom segments with 296 unique HRSN mapping categories
- ✅ Updated database with flexible HRSN mapping structure
- ✅ Created demographic processor (`demographicProcessor.ts`)
- ✅ Enhanced upload workflow to handle demographic data processing

#### 3. Example HRSN Problem Patterns for Master List

**Housing_Status Problems:**
- "Housing instability"
- "Homelessness" 
- "Unsafe housing conditions"
- "Inadequate housing"
- "Housing insecurity"
- "Unstable living situation"
- "Risk of eviction"
- "Overcrowded housing"

**Food_Status Problems:**
- "Food insecurity"
- "Limited food access"
- "Food shortage"
- "Hunger"
- "Inadequate nutrition"
- "Food assistance needed"
- "Cannot afford food"

**Financial_Status Problems:**
- "Financial difficulties"
- "Economic hardship"
- "Unemployment"
- "Financial strain"
- "Cannot afford bills"
- "Income inadequacy"
- "Poverty"
- "Financial stress"

#### 4. Extraction Algorithm Updates (COMPLETED)
✅ Updated `symptomExtractor.ts` to populate housing_status, food_status, financial_status fields
✅ Updated `optimizedExtractor.ts` for parallel processing
✅ Added schema support for `hrsn_category` field
✅ Extraction now sets "Problem Identified" when HRSN problems are found

#### 5. Visualization Enhancements Needed

**New Chart Categories:**
- Housing Status Distribution
- Food Security Status 
- Financial Status Distribution
- Combined HRSN Risk Assessment

**Chart Data Sources:**
The system will query extracted_symptoms table for:
```sql
-- Housing Status Data
SELECT housing_status, COUNT(*) as count
FROM extracted_symptoms 
WHERE housing_status IS NOT NULL 
GROUP BY housing_status

-- Food Status Data  
SELECT food_status, COUNT(*) as count
FROM extracted_symptoms 
WHERE food_status IS NOT NULL
GROUP BY food_status

-- Financial Status Data
SELECT financial_status, COUNT(*) as count  
FROM extracted_symptoms
WHERE financial_status IS NOT NULL
GROUP BY financial_status
```

#### 6. Hybrid User Data Approach

**Option A: User Upload Enhancement**
- Allow users to upload their own HRSN data mapping
- Merge with system HRSN detection
- User data takes precedence when conflicts occur

**Option B: Manual HRSN Override**
- Add UI controls for manual HRSN status updates
- Track user-entered vs system-detected HRSN indicators
- Maintain audit trail of changes

#### 7. Implementation Steps

**Step 1: Database Setup**
1. Run the SQL migration to add `hrsn_category` column
2. Update existing records with appropriate HRSN categories

**Step 2: Master List Updates**  
1. Add HRSN problem definitions to Symptom_Segments Master file
2. Set `symp_prob = "Problem"` for all HRSN entries
3. Set `zcode_hrsn = "Yes"` for HRSN entries
4. Populate `hrsn_category` field with Housing_Status, Food_Status, or Financial_Status

**Step 3: Re-process Existing Data**
1. Re-run extraction on existing notes to populate new HRSN fields
2. Validate that HRSN problems are properly categorized

**Step 4: Update Visualizations**
1. Add HRSN charts to Population Health dashboard
2. Include HRSN filters in existing charts
3. Add HRSN-specific exports and reports

#### 8. Expected Outcomes

**Patient Identification:**
- Patients with housing problems will show `housing_status = "Problem Identified"`
- Patients with food insecurity will show `food_status = "Problem Identified"`  
- Patients with financial issues will show `financial_status = "Problem Identified"`

**Analytics Benefits:**
- Population-level HRSN problem tracking
- Risk stratification including social determinants
- Care coordination targeting for high-risk patients
- Resource allocation guidance based on HRSN data

#### 9. Quality Assurance

**Validation Steps:**
1. Test extraction with sample HRSN problem text
2. Verify chart data shows proper HRSN categorization
3. Confirm export includes HRSN status fields
4. Validate user data integration (if implemented)

#### 10. Deployment Considerations

**Data Migration:**
- Backup existing data before implementing changes
- Test on subset of data first
- Monitor performance impact of additional fields

**User Training:**
- Document new HRSN categories for users
- Provide examples of HRSN problem identification
- Train users on interpreting HRSN analytics

### Technical Notes

The extraction algorithms are already prepared to handle HRSN categories. Once you update the Master List with HRSN problem definitions and run the database migration, the system will automatically start identifying and categorizing HRSN problems in patient notes.

The hybrid approach allows flexibility - the system can automatically detect HRSN problems from clinical notes while also accepting user-provided HRSN data for more comprehensive analysis.