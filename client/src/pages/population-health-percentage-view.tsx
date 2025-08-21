import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import FixedPercentageDisplayBar from "@/components/fixed-percentage-display-bar";
import { Loader2 } from "lucide-react";

export default function PopulationHealthPercentageView() {
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  const [selectedChart, setSelectedChart] = useState("risk");
  const [colorScheme, setColorScheme] = useState("nivo");

  // Fetch the health data
  const { data, isLoading } = useQuery({
    queryKey: ["/api/population-health-data"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Map the data to the format needed by the chart component
  const getChartData = () => {
    if (!data) return [];

    switch (selectedChart) {
      case "risk":
        return (data.riskStratificationData || []).map((item: any) => ({
          id: item.category || item.id || "",
          value: item.count || item.value || 0,
        }));
      case "symptoms":
        return (data.symptomIDData || []).map((item: any) => ({
          id: item.category || item.id || "",
          value: item.count || item.value || 0,
        }));
      case "diagnoses":
        return (data.diagnosticCategoryData || []).map((item: any) => ({
          id: item.category || item.id || "",
          value: item.count || item.value || 0,
        }));
      case "hrsn":
        return (data.hrsnIndicatorData || []).map((item: any) => ({
          id: item.category || item.id || "",
          value: item.count || item.value || 0,
        }));
      default:
        return [];
    }
  };

  const getChartTitle = () => {
    switch (selectedChart) {
      case "risk": return "Risk Stratification";
      case "symptoms": return "Symptoms";
      case "diagnoses": return "Diagnoses";
      case "hrsn": return "HRSN Indicators";
      default: return "Chart";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Population Health Dashboard</h1>
      
      <div className="mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Switch 
            id="display-mode"
            checked={displayMode === "percentage"}
            onCheckedChange={(checked) => setDisplayMode(checked ? "percentage" : "count")}
          />
          <Label htmlFor="display-mode">
            Display as {displayMode === "percentage" ? "Percentages" : "Counts"}
          </Label>
        </div>
        
        <Select
          value={selectedChart}
          onValueChange={setSelectedChart}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Chart" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk">Risk Stratification</SelectItem>
            <SelectItem value="symptoms">Symptoms</SelectItem>
            <SelectItem value="diagnoses">Diagnoses</SelectItem>
            <SelectItem value="hrsn">HRSN Indicators</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={colorScheme}
          onValueChange={setColorScheme}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Color Scheme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nivo">Nivo</SelectItem>
            <SelectItem value="category10">Category 10</SelectItem>
            <SelectItem value="accent">Accent</SelectItem>
            <SelectItem value="dark2">Dark 2</SelectItem>
            <SelectItem value="paired">Paired</SelectItem>
            <SelectItem value="pastel1">Pastel 1</SelectItem>
            <SelectItem value="set1">Set 1</SelectItem>
            <SelectItem value="set2">Set 2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{getChartTitle()} ({displayMode === "percentage" ? "Percentage" : "Count"})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <FixedPercentageDisplayBar 
              data={getChartData()}
              displayMode={displayMode}
              colors={{ scheme: colorScheme }}
              margin={{ top: 50, right: 130, bottom: 130, left: 80 }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Category',
                legendPosition: 'middle',
                legendOffset: 110
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -60
              }}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 20,
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground text-center">
        <p>Note: All percentages are calculated based on each chart's total.</p>
      </div>
    </div>
  );
}