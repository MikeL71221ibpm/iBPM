import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RiskThreshold, defaultRiskThresholds, getOrganizationRiskThresholds } from "@/config/riskStratification";

interface RiskStratificationConfigProps {
  organizationId?: string;
  onSave?: (thresholds: RiskThreshold[]) => void;
  readOnly?: boolean;
}

export default function RiskStratificationConfig({
  organizationId,
  onSave,
  readOnly = false
}: RiskStratificationConfigProps) {
  const { toast } = useToast();
  const [thresholds, setThresholds] = useState<RiskThreshold[]>([]);
  const [activeTab, setActiveTab] = useState<string>('current');
  
  // Load appropriate thresholds on initial load
  useEffect(() => {
    const orgThresholds = getOrganizationRiskThresholds(organizationId);
    setThresholds([...orgThresholds]);
  }, [organizationId]);
  
  // Add a new threshold category
  const addThreshold = () => {
    const newThreshold: RiskThreshold = {
      name: `Risk level ${thresholds.length + 1}`,
      minValue: 0,
      maxValue: 10,
      color: "#" + Math.floor(Math.random()*16777215).toString(16), // Random color
      description: "New risk level category"
    };
    
    setThresholds([...thresholds, newThreshold]);
  };
  
  // Remove a threshold by index
  const removeThreshold = (index: number) => {
    const updatedThresholds = [...thresholds];
    updatedThresholds.splice(index, 1);
    setThresholds(updatedThresholds);
  };
  
  // Update a specific field of a threshold
  const updateThreshold = (index: number, field: keyof RiskThreshold, value: any) => {
    const updatedThresholds = [...thresholds];
    
    // Handle special cases for numeric fields
    if (field === 'minValue' || field === 'maxValue') {
      value = field === 'maxValue' && value === "null" ? null : Number(value);
    }
    
    // Update the specific field
    updatedThresholds[index] = {
      ...updatedThresholds[index],
      [field]: value
    };
    
    setThresholds(updatedThresholds);
  };
  
  // Reset to default thresholds
  const resetToDefaults = () => {
    setThresholds([...defaultRiskThresholds]);
    toast({
      title: "Reset successful",
      description: "Risk thresholds have been reset to default values",
    });
  };
  
  // Save current thresholds
  const saveThresholds = () => {
    // Validate thresholds before saving
    const isValid = validateThresholds();
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the overlapping or invalid thresholds before saving",
        variant: "destructive"
      });
      return;
    }
    
    // Call the onSave callback if provided
    if (onSave) {
      onSave(thresholds);
    }
    
    // Show success toast
    toast({
      title: "Changes saved",
      description: "Risk stratification thresholds have been updated",
    });
  };
  
  // Validate that thresholds don't overlap and are valid
  const validateThresholds = (): boolean => {
    // Sort thresholds by minValue (descending)
    const sortedThresholds = [...thresholds].sort((a, b) => b.minValue - a.minValue);
    
    for (let i = 0; i < sortedThresholds.length - 1; i++) {
      const current = sortedThresholds[i];
      const next = sortedThresholds[i + 1];
      
      // Check if the current minimum overlaps with the next maximum
      if (current.maxValue !== null && next.minValue >= current.minValue && next.minValue <= current.maxValue) {
        return false;
      }
      
      // Check if the current minimum is greater than or equal to its maximum
      if (current.maxValue !== null && current.minValue >= current.maxValue) {
        return false;
      }
    }
    
    return true;
  };
  
  // Render a preview of patient risk distribution
  const renderPreview = () => {
    // Sample data points for the preview
    const exampleSymptomCounts = [0, 5, 15, 25, 40, 60, 75, 95, 120, 150, 200];
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Risk Distribution Preview</h3>
        <p className="text-sm text-muted-foreground">
          This preview shows how patients with different symptom counts will be classified according to your current settings.
        </p>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symptom Count</TableHead>
              <TableHead>Risk Classification</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exampleSymptomCounts.map(count => {
              // Find the matching threshold
              const matchingThreshold = thresholds.find(t => 
                count >= t.minValue && 
                (t.maxValue === null || count <= t.maxValue)
              ) || thresholds[thresholds.length - 1];
              
              return (
                <TableRow key={count}>
                  <TableCell>{count}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: matchingThreshold.color }}
                      />
                      {matchingThreshold.name}
                    </div>
                  </TableCell>
                  <TableCell>{matchingThreshold.description}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle>Risk Stratification Configuration</CardTitle>
        <CardDescription>
          Define how patients are categorized into risk levels based on their symptom and HRSN indicator counts
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            {!validateThresholds() && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Your current thresholds have overlapping ranges. Please adjust them to ensure each symptom count falls into exactly one category.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Risk Threshold Categories</h3>
                {!readOnly && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={addThreshold}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Category
                  </Button>
                )}
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Min Value</TableHead>
                    <TableHead>Max Value</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Description</TableHead>
                    {!readOnly && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.map((threshold, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {readOnly ? (
                          threshold.name
                        ) : (
                          <Input
                            value={threshold.name}
                            onChange={(e) => updateThreshold(index, 'name', e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {readOnly ? (
                          threshold.minValue
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            value={threshold.minValue}
                            onChange={(e) => updateThreshold(index, 'minValue', e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {readOnly ? (
                          threshold.maxValue === null ? "∞" : threshold.maxValue
                        ) : (
                          <Input
                            type={threshold.maxValue === null ? "text" : "number"}
                            min={threshold.minValue + 1}
                            value={threshold.maxValue === null ? "null" : threshold.maxValue}
                            onChange={(e) => updateThreshold(index, 'maxValue', e.target.value)}
                            placeholder="null for no limit"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full" 
                            style={{ backgroundColor: threshold.color }}
                          />
                          {!readOnly && (
                            <Input
                              type="color"
                              value={threshold.color}
                              onChange={(e) => updateThreshold(index, 'color', e.target.value)}
                              className="w-12 h-8"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {readOnly ? (
                          threshold.description
                        ) : (
                          <Input
                            value={threshold.description}
                            onChange={(e) => updateThreshold(index, 'description', e.target.value)}
                          />
                        )}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeThreshold(index)}
                            disabled={thresholds.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="preview">
            {renderPreview()}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {!readOnly && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" /> Reset to Defaults
          </Button>
          <Button onClick={saveThresholds}>
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}