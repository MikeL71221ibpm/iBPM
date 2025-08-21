import React from 'react';
import { BackendHeatmap } from './BackendHeatmap';
import CategoricalHrsnChart from './categorical-hrsn-chart-05_13_25';

interface DemographicOverrideProps {
  categoryField: string;
  title: string;
  patientData?: any[];
  extractedSymptoms?: any[];
  colorScheme?: string;
  isLoading?: boolean;
  isExpanded?: boolean;
  height?: number;
  chartType?: 'bar' | 'pie' | 'heatmap' | 'distribution';
  compactMode?: boolean;
  chartId?: string;
  isSelected?: boolean;
  onToggleSelection?: (chartId: string) => void;
  yAxisCategory?: string;
  filterBy?: {
    symptom?: string;
    diagnosticCategory?: string;
    diagnosis?: string;
    icd10Code?: string;
  };
}

export default function DemographicOverride(props: DemographicOverrideProps) {
  const { categoryField, title, height = 400, isExpanded = false } = props;

  console.log(`🎯 DEMOGRAPHIC OVERRIDE: ${categoryField} - ${title}`);

  // TEMPORARILY DISABLED - Force demographic fields to use backend heatmap for distribution charts
  // const isDemographicField = ['age_range', 'gender', 'race', 'ethnicity'].includes(categoryField);
  // const isDistributionChart = title.includes('Distribution');

  // if (isDemographicField && isDistributionChart) {
  //   console.log(`📊 FORCING BACKEND HEATMAP for ${categoryField} distribution`);
  //   return <BackendHeatmap categoryField={categoryField} height={height} isExpanded={isExpanded} />;
  // }

  // For all other cases, use the regular chart component
  return <CategoricalHrsnChart {...props} />;
}