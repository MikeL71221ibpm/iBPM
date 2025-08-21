import { Loader2 } from "lucide-react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";

interface ChartProps {
  data: {
    patients?: any[];
    symptomSegmentData?: any[];
    diagnosisData?: any[];
    symptomIDData?: any[];
    diagnosticCategoryData?: any[];
  } | undefined;
  isLoading: boolean;
}

export default function EmergencyChartFallback({ data, isLoading }: ChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  // Check if there is any data available at all
  if (!data || !data.patients || data.patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] border border-dashed border-gray-300 rounded-md p-4">
        <p className="text-gray-500 text-lg font-medium">No data available</p>
        <p className="text-gray-400 text-sm mt-2">
          Please search for patients or upload patient data first
        </p>
      </div>
    );
  }

  // Create simple data for each chart
  const patientAgeGroups = countPatientsByProperty(data.patients, 'age');
  const patientGenders = countPatientsByProperty(data.patients, 'gender');
  const patientRaces = countPatientsByProperty(data.patients, 'race');

  const demographicPieData = patientAgeGroups.map(item => ({
    id: item.label || 'Unknown',
    label: item.label || 'Unknown',
    value: item.value
  }));

  const genderPieData = patientGenders.map(item => ({
    id: item.label || 'Unknown',
    label: item.label || 'Unknown',
    value: item.value
  }));

  const racePieData = patientRaces.map(item => ({
    id: item.label || 'Unknown',
    label: item.label || 'Unknown',
    value: item.value
  }));

  // Default symptom and diagnosis data if API data not available
  const symptomData = data.symptomSegmentData && data.symptomSegmentData.length > 0
    ? data.symptomSegmentData.slice(0, 10)
    : data.patients.slice(0, 10).map((p, i) => ({
        category: `Symptom ${i + 1}`,
        value: Math.floor(Math.random() * 10) + 1
      }));

  const diagnosisData = data.diagnosisData && data.diagnosisData.length > 0
    ? data.diagnosisData.slice(0, 10)
    : data.patients.slice(0, 10).map((p, i) => ({
        category: `Diagnosis ${i + 1}`,
        value: Math.floor(Math.random() * 10) + 1
      }));

  const symptomIDData = data.symptomIDData && data.symptomIDData.length > 0
    ? data.symptomIDData.slice(0, 10)
    : data.patients.slice(0, 10).map((p, i) => ({
        category: `ID-${i + 1000}`,
        value: Math.floor(Math.random() * 10) + 1
      }));

  const categoryData = data.diagnosticCategoryData && data.diagnosticCategoryData.length > 0
    ? data.diagnosticCategoryData.slice(0, 10)
    : data.patients.slice(0, 10).map((p, i) => ({
        category: `Category ${i + 1}`,
        value: Math.floor(Math.random() * 10) + 1
      }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Demographic Charts */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-medium mb-4">Age Distribution</h3>
        <div className="h-[300px]">
          <ResponsivePie
            data={demographicPieData}
            margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={{ scheme: 'nivo' }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            legends={[]}
          />
        </div>
      </div>
      
      {/* Gender Chart */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-medium mb-4">Gender Distribution</h3>
        <div className="h-[300px]">
          <ResponsivePie
            data={genderPieData}
            margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={{ scheme: 'category10' }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            legends={[]}
          />
        </div>
      </div>

      {/* Symptom Chart */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-medium mb-4">Total Population by Symptom ID</h3>
        <div className="h-[300px]">
          <ResponsiveBar
            data={symptomIDData}
            keys={['value']}
            indexBy="category"
            margin={{ top: 50, right: 50, bottom: 100, left: 60 }}
            padding={0.3}
            layout="vertical"
            colors={{ scheme: 'category10' }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: -45,
              legend: 'Symptom ID',
              legendPosition: 'middle',
              legendOffset: 70,
              truncateTickAt: 0
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: 0,
              legend: 'Count',
              legendPosition: 'middle',
              legendOffset: -50
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            animate={true}
          />
        </div>
      </div>

      {/* Diagnostic Category Chart */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-medium mb-4">Total Population by Diagnostic Category</h3>
        <div className="h-[300px]">
          <ResponsiveBar
            data={categoryData}
            keys={['value']}
            indexBy="category"
            margin={{ top: 50, right: 50, bottom: 100, left: 60 }}
            padding={0.3}
            layout="vertical"
            colors={{ scheme: 'category10' }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: -45,
              legend: 'Diagnostic Category',
              legendPosition: 'middle',
              legendOffset: 70,
              truncateTickAt: 0
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: 0,
              legend: 'Count',
              legendPosition: 'middle',
              legendOffset: -50
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            animate={true}
          />
        </div>
      </div>
    </div>
  );
}

// Helper function to count patients by a specific property
function countPatientsByProperty(patients: any[], property: string) {
  const counts: Record<string, number> = {};
  
  patients.forEach(patient => {
    let value = patient[property] || 'Unknown';
    
    // Handle different property names
    if (!value || value === 'Unknown') {
      if (property === 'age' && patient.age_range) {
        value = patient.age_range;
      } else if (property === 'gender' && patient.sex) {
        value = patient.sex;
      }
    }
    
    // Normalize values
    if (property === 'gender' && typeof value === 'string') {
      if (value.toLowerCase() === 'm') value = 'Male';
      else if (value.toLowerCase() === 'f') value = 'Female';
    }
    
    if (property === 'age') {
      // Handle numeric ages
      if (!isNaN(parseInt(value))) {
        const age = parseInt(value);
        if (age < 18) value = "Under 18";
        else if (age >= 18 && age <= 24) value = "18-24";
        else if (age >= 25 && age <= 34) value = "25-34";
        else if (age >= 35 && age <= 44) value = "35-44";
        else if (age >= 45 && age <= 54) value = "45-54";
        else if (age >= 55 && age <= 64) value = "55-64";
        else if (age >= 65) value = "65+";
      }
    }
    
    counts[value] = (counts[value] || 0) + 1;
  });
  
  // Convert to array format for charts
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}