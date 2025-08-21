# HRSN Data Sources Analysis - June 23, 2025

## Executive Summary

**CRITICAL FINDING**: The system has TWO distinct data sources for HRSN charts:

1. **Customer Data (📊)**: ALL NULL - Customer uploaded data contains no HRSN information
2. **Algorithm Extracted Data (🔍)**: EXTENSIVE - 23,075 HRSN records extracted from clinical notes for 4,921 patients (97% coverage)

## Data Source Breakdown

### Customer Data (Patients Table)
- **Housing Insecurity**: 5,262 patients with NULL values (100% empty)
- **Food Insecurity**: 5,262 patients with NULL values (100% empty) 
- **Financial Status**: 5,262 patients with NULL values (100% empty)

**CONCLUSION**: Customer did not provide any HRSN data in their uploaded file.

### Algorithm Extracted Data (Column BD: symp_prob = "Problem")
- **Total HRSN Records**: 23,075 occurrences
- **Patients with HRSN Issues**: 4,921 unique patients (97% of total)
- **Data Source Identifier**: `symp_prob = "Problem"` in extracted_symptoms table

## Detailed HRSN Categories Extracted by Algorithm

### 1. Financial Issues
**Category**: Financial Strain + Finances/Financial Stress
- **Financial Strain**: 586 occurrences, 575 unique patients
  - "very hard to pay for heating": 60 patients
  - "very hard to pay for housing": 36 patients
  - "very hard to pay for food": 36 patients
  - "very hard to pay for medical care": 34 patients
- **Finances/Financial Stress**: 249 occurrences, 235 unique patients
  - "Problems Related to Housing": 152 patients
  - "Problems Related to Economic Circumstances": 68 patients

### 2. Housing Issues
**Category**: Housing/Housing Instability/Insecurity
- **Total**: 548 occurrences, 520 unique patients
- Key Issues:
  - "Homelessness": 116 patients
  - "Inadequate housing": 75 patients
  - "worry about losing residence": 61 patients
  - "behind on their mortgage": 39 patients
  - "pay too much for housing": 37 patients

### 3. Food Security
**Category**: Food Insecurity
- **Total**: 302 occurrences, 292 unique patients
- Key Issues:
  - "there is never a lack of adequate food": 86 patients (positive indicator)
  - "often there is a lack of adequate food": 38 patients
  - "often worried food will run out": 38 patients
  - "food didn't last and could not buy more": 37 patients

### 4. Transportation Issues
**Category**: Transportation Insecurity
- **Total**: 576 occurrences, 564 unique patients
- Key Issues:
  - "unsafe transportation environment": 60 patients
  - "travel time is too great": 40 patients
  - "lack of transportation prevented medical appointments": 36 patients
  - "no access to a vehicle": 34 patients
  - "does not have a driver's license": 33 patients

### 5. Utility Security
**Category**: Utility Insecurity
- **Total**: 1,062 occurrences, 1,019 unique patients
- Key Issues:
  - "Lack of adequate food and safe drinking water": 160 patients
  - "very hard to cool the house due to limited financial resources": 93 patients
  - "very hard to obtain heat due to limited financial resources": 68 patients
  - "water company threatened to shut off services": 64 patients

### 6. Healthcare Access
**Category**: Access to health care
- **Total**: 534 occurrences, 523 unique patients
- Key Issues:
  - "problems related to social environment": 170 patients
  - "Problems Related to Housing and Economic Circumstances": 85 patients
  - "Insufficient Social Insurance": 70 patients
  - "difficulties obtaining healthcare": 47 patients

### 7. Employment Issues
**Category**: Employment
- **Total**: 1,119 occurrences, 1,098 unique patients
- Key Issues:
  - "problems related to primary support group": 157 patients
  - "life management difficulty": 157 patients
  - "mental strain related to work": 114 patients
  - "problems related to employment": 113 patients

### 8. Social Connections
**Category**: Social connections / isolation
- **Total**: 1,013 occurrences, 993 unique patients
- Key Issues:
  - "rarely feels isolated from others": 105 patients (positive indicator)
  - "Social Exclusion and Rejection": 69 patients
  - "sometimes feels isolated from others": 55 patients
  - "feels lonely sometimes": 43 patients

### 9. Safety Issues
**Category**: Safety/Child abuse
- **Total**: 2,381 occurrences, 2,168 unique patients
- Key Issues:
  - "Sexual abuse": 661 patients (613 unique)
  - "Physical abuse": 661 patients (618 unique)
  - "abandonment": 169 patients (166 unique)
  - "Child psychological abuse": 71 patients

## Technical Implementation for Charts

### Current Issue Resolution
✅ **Pie Chart Fix**: Applied empty data validation to prevent 100% red circles when customer data is NULL
✅ **Bar Chart Fix**: Fixed aggregation logic to show "No Data Available" when appropriate

### Data Source Integration Strategy

**For Each HRSN Chart Category:**

1. **Check Customer Data First** (patients table):
   - housing_insecurity, food_insecurity, financial_status fields
   - Currently ALL NULL for all 5,262 patients

2. **Check Algorithm Data Second** (extracted_symptoms table):
   - Filter by `symp_prob = "Problem"`
   - Map diagnosis categories to HRSN fields:
     - Financial: "Financial Strain" + "Finances/Financial Stress"
     - Housing: "Housing/Housing Instability/Insecurity"
     - Food: "Food Insecurity"
     - Transportation: "Transportation Insecurity"
     - Utilities: "Utility Insecurity"
     - Healthcare: "Access to health care"
     - Employment: "Employment"
     - Social: "Social connections / isolation"
     - Safety: "Safety/Child abuse"

3. **Display Logic**:
   - 📊 Customer Data: When patients table has non-null values
   - 🔍 Algorithm Insights: When extracted_symptoms has symp_prob = "Problem"
   - 🎯 Dual Sources: When both exist (shows intensity confirmation)
   - "No Data Available": When neither source has data

## Recommendations

### Immediate Action Items
1. **Update HRSN Chart Logic**: Implement dual-source data detection
2. **Visual Indicators**: Add data source badges (📊 🔍 🎯)
3. **Chart Titles**: Update to reflect data source transparency
4. **Data Validation**: Ensure proper empty state handling

### Future Enhancements
1. **Customer Education**: Inform customers that HRSN data can be provided in uploads
2. **Field Mapping**: Support various HRSN field name variations in customer data
3. **Data Integration**: When both sources exist, show comparative analysis
4. **Intensity Scoring**: Use dual-source confirmation as problem severity indicator

## Technical Notes

- **Database Fields**: 70+ HRSN-related columns in extracted_symptoms table
- **Coverage**: Algorithm extracted HRSN data for 97% of patients
- **Quality**: Rich, detailed HRSN categories with specific symptom segments
- **Authenticity**: All data from clinical note analysis, no synthetic data

This comprehensive HRSN extraction demonstrates the power of the V3.3.5 algorithm in identifying social determinants of health from unstructured clinical text.