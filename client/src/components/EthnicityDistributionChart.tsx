import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface EthnicityDistributionChartProps {
  data: any[];
  colorScheme?: string;
  height?: number;
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
}

export default function EthnicityDistributionChart({ 
  data, 
  colorScheme = 'blue',
  height = 200,
  filterBy
}: EthnicityDistributionChartProps) {
  console.log(`🚨 ETHNICITY CHART COMPONENT CALLED! Data length: ${data?.length || 0}`);
  console.log(`🎯 NEW ETHNICITY CHART: Processing ${data?.length || 0} patients`);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No data available for ethnicity distribution
      </div>
    );
  }

  // Process ethnicity data to create heatmap
  const processEthnicityData = () => {
    const ethnicityAgeMatrix = {};
    const ageRanges = ["18-25", "26-35", "36-50", "51-65", "65+"];
    const ethnicities = ["Hispanic or Latino", "Non-Hispanic"];
    
    // Initialize matrix
    ethnicities.forEach(ethnicity => {
      ethnicityAgeMatrix[ethnicity] = {};
      ageRanges.forEach(ageRange => {
        ethnicityAgeMatrix[ethnicity][ageRange] = 0;
      });
    });

    // Process all patients
    const totalPatients = data.length;
    console.log(`🎯 ETHNICITY PROCESSING: ${totalPatients} total patients`);

    // Sample a few patients to debug
    const samplePatients = data.slice(0, 10);
    console.log(`🎯 ETHNICITY SAMPLE DEBUG:`, samplePatients.map(p => ({
      ethnicity: p.ethnicity,
      ageRange: p.age_range || p.ageRange,
      hasEthnicityField: !!p.ethnicity,
      rawPatient: p
    })));

    let hispanicCount = 0;
    let nonHispanicCount = 0;

    data.forEach((patient: any, index) => {
      if (!patient) return;

      // Get ethnicity - check multiple possible field names
      const rawEthnicity = patient.ethnicity || patient.ethncity || patient.additional_fields?.ethnicity;
      let ethnicity = "Non-Hispanic";
      
      if (rawEthnicity && 
          rawEthnicity !== '' && 
          rawEthnicity !== null && 
          rawEthnicity !== undefined &&
          rawEthnicity.toString().toLowerCase() !== 'unknown' &&
          rawEthnicity.toString().toLowerCase() !== 'n/a') {
        
        const ethnicityStr = rawEthnicity.toString().toLowerCase();
        
        if (ethnicityStr.includes('hispanic') || ethnicityStr.includes('latino')) {
          ethnicity = "Hispanic or Latino";
          hispanicCount++;
        } else {
          nonHispanicCount++;
        }
        
        // Log first few Hispanic patients
        if (index < 5 && ethnicity === "Hispanic or Latino") {
          console.log(`🎯 HISPANIC PATIENT ${index}: ethnicity="${rawEthnicity}" -> "${ethnicity}"`);
        }
      } else {
        // If no ethnicity data, still count as Non-Hispanic
        ethnicity = "Non-Hispanic";
        nonHispanicCount++;
      }

      // Get age range
      let ageRange = patient.age_range || patient.ageRange;
      if (!ageRange && patient.age) {
        const age = parseInt(patient.age);
        if (age >= 18 && age <= 25) ageRange = "18-25";
        else if (age >= 26 && age <= 35) ageRange = "26-35";
        else if (age >= 36 && age <= 50) ageRange = "36-50";
        else if (age >= 51 && age <= 65) ageRange = "51-65";
        else if (age > 65) ageRange = "65+";
      }

      if (ageRange && ageRanges.includes(ageRange)) {
        ethnicityAgeMatrix[ethnicity][ageRange]++;
      }
    });

    // Log final counts
    console.log(`🎯 ETHNICITY FINAL COUNTS: Hispanic=${hispanicCount}, Non-Hispanic=${nonHispanicCount}, Total=${totalPatients}`);
    console.log(`🎯 ETHNICITY MATRIX:`, ethnicityAgeMatrix);

    // Convert to heatmap format with correct percentage calculation
    // Each cell should show: (patients in this ethnicity AND age range) / (total patients in this ethnicity) * 100
    const result = ethnicities.map(ethnicity => {
      const totalForEthnicity = ethnicity === "Hispanic or Latino" ? hispanicCount : nonHispanicCount;
      
      return {
        id: ethnicity,
        data: ageRanges.map(ageRange => {
          const count = ethnicityAgeMatrix[ethnicity][ageRange];
          // Calculate percentage within this ethnicity group
          const percentage = totalForEthnicity > 0 ? Math.round((count / totalForEthnicity) * 100) : 0;
          console.log(`🎯 ${ethnicity} - ${ageRange}: ${count}/${totalForEthnicity} = ${percentage}%`);
          return {
            x: ageRange,
            y: percentage
          };
        })
      };
    });

    console.log(`✅ NEW ETHNICITY CHART: Generated data for ${result.length} ethnicities`, result);
    return result;
  };

  const heatmapData = processEthnicityData();

  const exportData = () => {
    const exportableData = heatmapData.map(ethnicity => ({
      Ethnicity: ethnicity.id,
      ...ethnicity.data.reduce((acc, item) => ({
        ...acc,
        [`${item.x} (%))`]: item.y
      }), {})
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      [
        Object.keys(exportableData[0]).join(","),
        ...exportableData.map(row => Object.values(row).join(","))
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ethnicity-distribution.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: "Ethnicity distribution data exported successfully",
    });
  };

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <Button
        onClick={exportData}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm"
        title="Export data"
      >
        <Download className="h-4 w-4" />
      </Button>
      <ResponsiveHeatMap
        data={heatmapData}
        keys={['18-25', '26-35', '36-50', '51-65', '65+']}
        indexBy="id"
        margin={{ top: 5, right: 30, bottom: 80, left: 120 }}
        pixelRatio={2}
        minValue={0}
        maxValue={100}
        colors={{
          type: 'diverging',
          scheme: 'blues',
          divergeAt: 0.5,
          minValue: 0,
          maxValue: 100
        }}
        emptyColor="#e8e8e8"
        borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
        cellOpacity={0.85}
        cellBorderWidth={1}
        cellBorderColor="#ffffff"
        enableGridX={true}
        enableGridY={true}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          orient: 'bottom',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Age Range',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
        axisLeft={{
          orient: 'left',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Ethnicity',
          legendOffset: -65,
          legendPosition: 'middle'
        }}
        hoverTarget="cell"
        cellHoverOthersOpacity={0.25}
        tooltip={({ cell }) => (
          <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
            <strong>{cell.serieId}</strong>
            <br />
            Age Range: {cell.data.x}
            <br />
            Percentage: {cell.data.y}%
          </div>
        )}
      />
    </div>
  );
}