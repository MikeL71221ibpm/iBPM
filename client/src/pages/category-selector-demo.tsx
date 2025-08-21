// Category Selector Demo Page
// This shows the category selector functionality without the complex chart implementation

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CategorySelector from '@/components/category-selector';
import { useQuery } from '@tanstack/react-query';

export default function CategorySelectorDemo() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [maxCategories, setMaxCategories] = useState(10);
  
  // Fetch visualization data for population health charts
  const { data, isLoading } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 60000, // 1 minute
  });
  
  // Get all unique categories from the data
  useEffect(() => {
    if (data) {
      // Extract all unique categories from various data sources
      const categories = new Set<string>();
      
      // HRSN Indicators
      if (data.hrsnIndicatorData) {
        data.hrsnIndicatorData.forEach((item: any) => {
          categories.add(item.id);
        });
      }
      
      // Symptom Segments
      if (data.symptomSegmentData) {
        data.symptomSegmentData.forEach((item: any) => {
          categories.add(item.id);
        });
      }
      
      // Diagnoses
      if (data.diagnosisData) {
        data.diagnosisData.forEach((item: any) => {
          categories.add(item.id);
        });
      }
      
      // Convert to array and sort
      const categoryArray = Array.from(categories).sort();
      setAllCategories(categoryArray);
      
      // Initialize selected categories with the first maxCategories items
      setSelectedCategories(categoryArray.slice(0, maxCategories));
    }
  }, [data, maxCategories]);

  return (
    <div className="container p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Category Selector Demo</h1>
      <p className="text-muted-foreground mb-6">
        This page demonstrates the category selector component that will be used across all charts.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle>Category Selector</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <CategorySelector 
                allCategories={allCategories}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                maxHeight={400}
              />
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle>Selected Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="bg-muted/50 p-4 rounded-md max-h-[400px] overflow-auto">
              <h3 className="font-medium mb-2">Currently Selected ({selectedCategories.length} categories):</h3>
              <ul className="space-y-1 list-disc pl-4">
                {selectedCategories.map((category) => (
                  <li key={category} className="text-sm">{category}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}