import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CategoricalHrsnChart from "@/components/categorical-hrsn-chart-05_13_25";
import HrsnPieChart from "@/components/hrsn-pie-chart-05_13_25";


export default function SimpleHrsnChartsDemo() {
  const [colorScheme, setColorScheme] = useState("blue");
  
  // Sample data for development
  const sampleData = {
    housingInsecurity: [
      { id: 1, housing_insecurity: "Yes", age_range: "25-34" },
      { id: 2, housing_insecurity: "Yes", age_range: "35-44" },
      { id: 3, housing_insecurity: "No", age_range: "25-34" },
      { id: 4, housing_insecurity: "No", age_range: "45-54" },
      { id: 5, housing_insecurity: "No", age_range: "18-24" },
      { id: 6, housing_insecurity: "Yes", age_range: "55-64" },
      { id: 7, housing_insecurity: "No", age_range: "25-34" },
      { id: 8, housing_insecurity: "No", age_range: "25-34" },
      { id: 9, housing_insecurity: "No", age_range: "35-44" },
      { id: 10, housing_insecurity: "No", age_range: "35-44" },
      { id: 11, housing_insecurity: "Yes", age_range: "45-54" },
      { id: 12, housing_insecurity: "No", age_range: "55-64" },
    ],
    educationLevel: [
      { id: 1, education_level: "High School", age_range: "25-34" },
      { id: 2, education_level: "Some College", age_range: "35-44" },
      { id: 3, education_level: "Bachelor's Degree", age_range: "25-34" },
      { id: 4, education_level: "High School", age_range: "45-54" },
      { id: 5, education_level: "High School", age_range: "18-24" },
      { id: 6, education_level: "Some College", age_range: "55-64" },
      { id: 7, education_level: "Bachelor's Degree", age_range: "25-34" },
      { id: 8, education_level: "Some College", age_range: "25-34" },
      { id: 9, education_level: "Some College", age_range: "35-44" },
      { id: 10, education_level: "High School", age_range: "35-44" },
      { id: 11, education_level: "Some College", age_range: "45-54" },
      { id: 12, education_level: "High School", age_range: "55-64" },
    ]
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">HRSN Charts Demo</h1>
        <p className="text-muted-foreground mb-4">
          This page demonstrates the various chart types available for HRSN data visualization.
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-medium">Color Scheme:</span>
          <div className="flex gap-2">
            {["blue", "green", "purple", "orange"].map((scheme) => (
              <Button 
                key={scheme}
                variant={colorScheme === scheme ? "default" : "outline"}
                size="sm"
                onClick={() => setColorScheme(scheme)}
                className="capitalize"
              >
                {scheme}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Housing Insecurity Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Housing Insecurity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Count</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                data={sampleData.housingInsecurity}
                title=""
                categoryField="housing_insecurity"
                valueField="count"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Percentage</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <HrsnPieChart
                data={sampleData.housingInsecurity}
                title=""
                categoryField="housing_insecurity"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                patientData={sampleData.housingInsecurity}
                title="Distribution"
                categoryName="housing_insecurity"
                colorScheme={colorScheme}
                height={220}
                filterBy={{}}
                isLoading={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Education Level Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Education Level</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Count</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                data={sampleData.educationLevel}
                title=""
                categoryField="education_level"
                valueField="count"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Percentage</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <HrsnPieChart
                data={sampleData.educationLevel}
                title=""
                categoryField="education_level"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                patientData={sampleData.educationLevel}
                title="Distribution"
                categoryName="education_level"
                colorScheme={colorScheme}
                height={220}
                filterBy={{}}
                isLoading={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Food Insecurity Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Food Insecurity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Count</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                data={sampleData.housingInsecurity} 
                title=""
                categoryField="housing_insecurity"
                valueField="count"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Percentage</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <HrsnPieChart
                data={sampleData.housingInsecurity} 
                title=""
                categoryField="housing_insecurity"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                patientData={sampleData.housingInsecurity}
                title="Distribution"
                categoryName="housing_insecurity"
                colorScheme={colorScheme}
                height={220}
                filterBy={{}}
                isLoading={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Transportation Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Transportation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Count</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                data={sampleData.educationLevel} 
                title=""
                categoryField="education_level"
                valueField="count"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Percentage</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <HrsnPieChart
                data={sampleData.educationLevel} 
                title=""
                categoryField="education_level"
                colorScheme={colorScheme}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-md font-medium">Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-60 pt-0">
              <CategoricalHrsnChart
                patientData={sampleData.educationLevel}
                title="Distribution"
                categoryName="education_level"
                colorScheme={colorScheme}
                height={220}
                filterBy={{}}
                isLoading={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}