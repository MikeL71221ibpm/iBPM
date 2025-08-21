import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Define types for chart data
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface SimplePopulationHealthProps {
  data?: any;
  isLoading?: boolean;
}

export default function SimplePopulationHealthMay12({ 
  data, 
  isLoading = false 
}: SimplePopulationHealthProps) {
  // State for health-related social needs filters
  const [housingFilter, setHousingFilter] = useState<string>("all");
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [financialFilter, setFinancialFilter] = useState<string>("all");
  
  // State for diagnosis filter
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>("all");
  
  // Filter data based on HRSN filters
  const filterDataByHrsn = useCallback((dataItems: any[]) => {
    if (!dataItems) return [];
    
    return dataItems.filter(item => {
      // Apply housing filter
      if (housingFilter !== 'all' && item.housingStatus !== housingFilter) {
        return false;
      }
      
      // Apply food filter
      if (foodFilter !== 'all' && item.foodStatus !== foodFilter) {
        return false;
      }
      
      // Apply financial filter
      if (financialFilter !== 'all' && item.financialStatus !== financialFilter) {
        return false;
      }
      
      return true;
    });
  }, [housingFilter, foodFilter, financialFilter]);

  // Generate some mock health data
  const generateMockData = useCallback(() => {
    // Create mock data for visualization if real data is missing
    const mockData: ChartDataItem[] = [
      { id: "Age 0-17", value: 120, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
      { id: "Age 18-24", value: 240, housingStatus: "Unstable", foodStatus: "Insecure", financialStatus: "Unstable" },
      { id: "Age 25-34", value: 180, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
      { id: "Age 35-44", value: 220, housingStatus: "Unstable", foodStatus: "Insecure", financialStatus: "Unstable" },
      { id: "Age 45-54", value: 130, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
      { id: "Age 55-64", value: 90, housingStatus: "Unstable", foodStatus: "Insecure", financialStatus: "Unstable" },
      { id: "Age 65+", value: 60, housingStatus: "Stable", foodStatus: "Secure", financialStatus: "Stable" },
    ];
    
    return mockData;
  }, []);

  // Process and filter the data
  const getFilteredData = useCallback(() => {
    // First try to use real data if available
    if (data?.patients && data.patients.length > 0) {
      console.log("Using real patient data:", data.patients.length, "patients");
      return filterDataByHrsn(data.patients);
    }
    
    // Otherwise use mock data
    console.log("Using generated mock data");
    return filterDataByHrsn(generateMockData());
  }, [data, filterDataByHrsn, generateMockData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Population Health - May 12th Test Version</CardTitle>
          <CardDescription>
            This is a test component to evaluate the May 12th filtering functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Housing Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Housing Status</label>
              <Select
                value={housingFilter}
                onValueChange={setHousingFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Housing Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Housing Status</SelectItem>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Unstable">Unstable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Food Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Food Status</label>
              <Select
                value={foodFilter}
                onValueChange={setFoodFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Food Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Food Status</SelectItem>
                  <SelectItem value="Secure">Secure</SelectItem>
                  <SelectItem value="Insecure">Insecure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Financial Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Financial Status</label>
              <Select
                value={financialFilter}
                onValueChange={setFinancialFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Financial Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Financial Status</SelectItem>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Unstable">Unstable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Diagnosis Filter */}
            <div>
              <label className="text-sm font-medium mb-1 block">Diagnosis</label>
              <Select
                value={diagnosisFilter}
                onValueChange={setDiagnosisFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Diagnoses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Diagnoses</SelectItem>
                  <SelectItem value="MDD">Major Depressive Disorder</SelectItem>
                  <SelectItem value="HUD">Hallucinogen Use Disorder</SelectItem>
                  <SelectItem value="PTSD">Post-Traumatic Stress Disorder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Display Results */}
          <div className="mt-8 border p-4 rounded-md">
            <h3 className="text-lg font-medium mb-4">Filtered Results</h3>
            <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              {JSON.stringify(getFilteredData(), null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}