import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface DateRangeFilterProps {
  onFilterApplied?: (data: { 
    noteCount: number; 
    patientCount: number;
    startDate: string;
    endDate: string;
  }) => void;
  className?: string;
}

export default function DateRangeFilter({ onFilterApplied, className }: DateRangeFilterProps) {
  const [enableFilter, setEnableFilter] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [filterResult, setFilterResult] = useState<{
    status: 'idle' | 'success' | 'error';
    noteCount?: number;
    patientCount?: number;
    message?: string;
  }>({ status: 'idle' });

  // Reset dates when filter is disabled
  useEffect(() => {
    if (!enableFilter) {
      setStartDate(undefined);
      setEndDate(undefined);
      setFilterResult({ status: 'idle' });
    }
  }, [enableFilter]);

  const handleApplyFilter = async () => {
    if (!startDate || !endDate) return;
    
    try {
      setIsLoading(true);
      setFilterResult({ status: 'idle' });
      
      // Format dates for the API (YYYY-MM-DD)
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Make the API request
      const response = await fetch('/api/filter-by-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate: formattedStartDate, 
          endDate: formattedEndDate 
        })
      });
      
      const data = await response.json();
      console.log("Date filter response:", data);
      
      if (response.ok) {
        // Success path
        setFilterResult({
          status: 'success',
          noteCount: data.noteCount || 0,
          patientCount: data.patientCount || 0
        });
        
        // Call the callback if provided
        if (onFilterApplied) {
          onFilterApplied({
            noteCount: data.noteCount || 0,
            patientCount: data.patientCount || 0,
            startDate: formattedStartDate,
            endDate: formattedEndDate
          });
        }
      } else {
        // Error path
        setFilterResult({
          status: 'error',
          message: data.error || 'Failed to filter records by date range'
        });
      }
    } catch (error) {
      console.error("Error filtering by date:", error);
      setFilterResult({
        status: 'error',
        message: 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="date-range-selection">
        <div className="flex items-center space-x-2 mb-4">
          <Switch 
            id="filter-by-date"
            checked={enableFilter} 
            onCheckedChange={setEnableFilter}
          />
          <Label htmlFor="filter-by-date">Switch to: Custom Date Range</Label>
        </div>
        
        {enableFilter && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MM/dd/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MM/dd/yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="col-span-2">
              <Button 
                onClick={handleApplyFilter}
                disabled={!startDate || !endDate || isLoading}
                className="w-full"
              >
                {isLoading ? "Applying..." : "Apply Date Filter"}
              </Button>
            </div>
            
            {/* Success message */}
            {filterResult.status === 'success' && (
              <div className="col-span-2">
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Filter applied successfully</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Found {filterResult.noteCount} records from {filterResult.patientCount} patients in the selected date range.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Error message */}
            {filterResult.status === 'error' && (
              <div className="col-span-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error applying filter</AlertTitle>
                  <AlertDescription>
                    {filterResult.message}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}