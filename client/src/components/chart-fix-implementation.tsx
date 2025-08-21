// This file contains all the completed fixes for the charts with percentage display issues

// 1. Complete Fix for Symptom ID Chart
// When integrating, replace the entire ResponsiveBar component for the Symptom ID chart with this one
/*
<ResponsiveBar
  data={(() => {
    // Get the raw data
    const rawData = getSymptomIDData();
    
    // Calculate percentage based on total patients
    const totalPatients = data?.patients?.length || 24;
    
    // Return mapped data with proper percentages
    return rawData.map(item => {
      // Get original value from item
      const itemValue = item.value || 0;
      
      // Calculate percentage based on total patient count
      const itemPercentage = totalPatients > 0 ? Math.round((itemValue / totalPatients) * 100) : 0;
      
      return {
        id: item.id,
        // This will control the actual bar height
        value: displayMode === "percentage" ? itemPercentage : itemValue,
        // Keep original value for reference
        originalValue: itemValue,
        // Add percentage fields for consistency
        percentage: itemPercentage,
        chartPercentage: itemPercentage,
        // For label display
        displayValue: displayMode === "percentage" ? `${itemPercentage}%` : `${itemValue}`
      };
    });
  })()}
  keys={['value']}
  indexBy="id"
  margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
  padding={0.3}
  layout="vertical"
  colors={getChartColors()}
  colorBy="indexValue" // Use each category (bar) name for coloring
  valueScale={{ type: 'linear' }}
  indexScale={{ type: 'band', round: true }}
  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
  maxValue={displayMode === "percentage" ? 30 : undefined}
  axisBottom={{
    tickSize: 5,
    tickPadding: 10,
    tickRotation: -45,
    legendPosition: 'middle',
    legendOffset: 50,
    truncateTickAt: 0
  }}
  axisLeft={{
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
    legendPosition: 'middle',
    legendOffset: -50
  }}
  enableGridY={true}
  labelSkipWidth={12}
  labelSkipHeight={12}
  enableLabel={true}
  label={d => { if (displayMode === "percentage") { return `${d.data.chartPercentage || 0}%`; } else { return `${d.value || 0}`; } }}
  labelTextColor={"#000000"}
  labelPosition="outside"
  labelOffset={-3}
  theme={{
    labels: {
      text: {
        fontSize: 11,
        fontWeight: 700,
        textAnchor: 'middle',
        dominantBaseline: 'auto'
      }
    }
  }}
  animate={true}
  motionConfig="gentle"
/>
*/

// 2. Complete Fix for Symptom Segment Chart
// When integrating, replace the entire ResponsiveBar component for the Symptom Segment chart with this one
/*
<ResponsiveBar
  data={(() => {
    // Get the raw data
    const rawData = getSymptomSegmentData();
    
    // Calculate percentage based on total patients
    const totalPatients = data?.patients?.length || 24;
    
    // Return mapped data with proper percentages
    return rawData.map(item => {
      // Get original value from item
      const itemValue = item.value || 0;
      
      // Calculate percentage based on total patient count
      const itemPercentage = totalPatients > 0 ? Math.round((itemValue / totalPatients) * 100) : 0;
      
      return {
        id: item.id,
        // This will control the actual bar height
        value: displayMode === "percentage" ? itemPercentage : itemValue,
        // Keep original value for reference
        originalValue: itemValue,
        // Add percentage fields for consistency
        percentage: itemPercentage,
        chartPercentage: itemPercentage,
        // For label display
        displayValue: displayMode === "percentage" ? `${itemPercentage}%` : `${itemValue}`
      };
    });
  })()}
  keys={['value']}
  indexBy="id"
  margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
  padding={0.3}
  layout="vertical"
  colors={getChartColors()}
  colorBy="indexValue"
  valueScale={{ type: 'linear' }}
  indexScale={{ type: 'band', round: true }}
  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
  maxValue={displayMode === "percentage" ? 30 : undefined}
  axisBottom={{
    tickSize: 5,
    tickPadding: 10,
    tickRotation: -45,
    legendPosition: 'middle',
    legendOffset: 50,
    truncateTickAt: 0
  }}
  axisLeft={{
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
    legendPosition: 'middle',
    legendOffset: -50
  }}
  enableGridY={true}
  labelSkipWidth={12}
  labelSkipHeight={12}
  enableLabel={true}
  label={d => { if (displayMode === "percentage") { return `${d.data.chartPercentage || 0}%`; } else { return `${d.value || 0}`; } }}
  labelTextColor={"#000000"}
  labelPosition="outside"
  labelOffset={-3}
  theme={{
    labels: {
      text: {
        fontSize: 11,
        fontWeight: 700,
        textAnchor: 'middle',
        dominantBaseline: 'auto'
      }
    }
  }}
  animate={true}
  motionConfig="gentle"
/>
*/

// 3. Complete Fix for Diagnostic Category Chart
// When integrating, replace the entire ResponsiveBar component for the Diagnostic Category chart with this one
/*
<ResponsiveBar
  data={(() => {
    // Get the raw data
    const rawData = getDiagnosticCategoryData();
    
    // Calculate percentage based on total patients
    const totalPatients = data?.patients?.length || 24;
    
    // Return mapped data with proper percentages
    return rawData.map(item => {
      // Get original value from item
      const itemValue = item.value || 0;
      
      // Calculate percentage based on total patient count
      const itemPercentage = totalPatients > 0 ? Math.round((itemValue / totalPatients) * 100) : 0;
      
      return {
        id: item.id,
        // This will control the actual bar height
        value: displayMode === "percentage" ? itemPercentage : itemValue,
        // Keep original value for reference
        originalValue: itemValue,
        // Add percentage fields for consistency
        percentage: itemPercentage,
        chartPercentage: itemPercentage,
        // For label display
        displayValue: displayMode === "percentage" ? `${itemPercentage}%` : `${itemValue}`
      };
    });
  })()}
  keys={['value']}
  indexBy="id"
  margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
  padding={0.3}
  layout="vertical"
  colors={getChartColors()}
  colorBy="indexValue"
  valueScale={{ type: 'linear' }}
  indexScale={{ type: 'band', round: true }}
  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
  maxValue={displayMode === "percentage" ? 30 : undefined}
  axisBottom={{
    tickSize: 5,
    tickPadding: 5,
    tickRotation: -35,
    legendPosition: 'middle',
    legendOffset: 80,
    truncateTickAt: 0
  }}
  axisLeft={{
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
    legendPosition: 'middle',
    legendOffset: -60
  }}
  enableGridY={true}
  labelSkipWidth={12}
  labelSkipHeight={12}
  enableLabel={true}
  label={d => { if (displayMode === "percentage") { return `${d.data.chartPercentage || 0}%`; } else { return `${d.value || 0}`; } }}
  labelTextColor={"#000000"}
  labelPosition="outside"
  labelOffset={-3}
  theme={{
    labels: {
      text: {
        fontSize: 11,
        fontWeight: 700,
        textAnchor: 'middle',
        dominantBaseline: 'auto'
      }
    }
  }}
  animate={true}
  motionConfig="gentle"
/>
*/

// 4. HRSN Indicators Chart is already fixed in the main file