# Summary Tab Algorithm Specification V3.4.27
## Created: August 3, 2025

## Overview
This document specifies the complete Summary tab algorithm changes implemented in V3.4.27. The Summary tab provides a narrative format for users who prefer text-based summaries over graphical representations.

## Core Requirements
1. Only show frequency lines where data exists (space-saving measure)
2. Pull diagnosis data from three new patient fields (diagnosis1, diagnosis2, diagnosis3)
3. Use frequency-based groupings from 10 down to 1
4. Include comprehensive trend analysis across multiple dimensions

## Summary Tab Structure

### 1. Contact and Staff Information
```
The person has had [X] contacts with [X] number of staff submitting notes from [first date of note for this timeperiod] through [last date of note for this timeperiod].
```
- Count unique provider IDs to determine number of staff
- Use actual date range from patient notes

### 2. Diagnosis Information
```
The diagnosis on the record is: [diagnosis1]; [diagnosis2]; [diagnosis3].
```
- Pull from new patient table fields: diagnosis1, diagnosis2, diagnosis3
- These fields are populated from customer upload files
- Show "[No diagnosis on record]" if all fields are empty

### 3. Symptom Trends
```
The person has expressed

Symptom Trends:
- this symptom 10 times or more over the timeperiod [symptom1, symptom2, symptom3, symptom4];
- this symptom 9 times over the timeperiod [symptom1, symptom2, symptom3, symptom4];
- this symptom 8 times over the timeperiod [symptom1, symptom2, symptom3, symptom4];
[... continues down to 1 time]
```
- Group symptoms by exact frequency counts
- Only display frequency lines that have symptoms
- Sort symptoms alphabetically within each frequency group
- Use semicolon at end of each line

### 4. Diagnosis Trends
```
Diagnosis Trends:
- this diagnosis had 10 symptoms or more associated with it over the timeperiod [diagnosis1, diagnosis2, diagnosis3, diagnosis4]
- this diagnosis had 9 symptoms associated with it over the timeperiod [diagnosis1, diagnosis2, diagnosis3, diagnosis4]
[... continues down to 1 symptom]
```
- Count symptoms associated with each diagnosis
- Group diagnoses by symptom count
- Only show lines where diagnoses exist
- Sort diagnoses alphabetically within each group

### 5. Diagnostic Category Trends
```
Diagnostic Category Trends:
- this diagnostic category had 10 diagnosis or more associated with it over the timeperiod [category1, category2, category3, category4]
- this diagnostic category had 9 diagnosis associated with it over the timeperiod [category1, category2, category3, category4]
[... continues down to 1 diagnosis]
```
- Count unique diagnoses per diagnostic category
- Group categories by diagnosis count
- Only display lines with data
- Sort categories alphabetically within each group

### 6. Last Two Sessions Summary
```
Over the last two sessions they have expressed these symptoms: [symptom1 (3), symptom2 (2), symptom3 (1)]
```
- Get symptoms from the two most recent sessions by date
- Show frequency count in parentheses
- Sort by frequency (descending) then alphabetically
- Show "none documented" if no symptoms found

### 7. HRSN Trends
```
HRSN Trends
During this timeperiod they have expressed the following Health Related Social Needs (HRSNs): HRSN1, HRSN2, HRSN3, HRSN4.
```
- Filter symptoms where symp_prob = "Problem"
- List all HRSN problems found in the timeperiod
- Sort by frequency (descending) then alphabetically
- Show "none documented" if no HRSNs found

## Database Schema Changes
Added three new fields to the patients table:
- diagnosis1: text
- diagnosis2: text  
- diagnosis3: text

These fields are populated from customer upload files and appear at the end of the file with other clinic-specific data.

## Implementation Notes
1. All data must come from actual database records - no mock data
2. Frequency groupings optimize space by only showing populated levels
3. Sorting within groups is always alphabetical for consistency
4. Empty states show appropriate messages (e.g., "none documented", "[No diagnosis on record]")
5. The Summary tab automatically updates when patient selection or date filters change

## Version History
- V3.4.27: Initial implementation of new Summary algorithm with frequency-based groupings
- Previous versions used different grouping logic (more than 5, 4 or less, etc.)