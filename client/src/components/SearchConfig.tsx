import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/context/AppContext";

interface SearchConfigProps {
  onSearchTypeChange: (type: "individual" | "population") => void;
}

const SearchConfig = ({ onSearchTypeChange }: SearchConfigProps) => {
  const [searchType, setSearchType] = useState<"individual" | "population">("individual");
  const [useAllDates, setUseAllDates] = useState(false);
  const [useCachedData, setUseCachedData] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const { updateSearchConfig } = useAppContext();
  
  const handleSearchTypeChange = (type: string) => {
    const searchType = type as "individual" | "population";
    
    // If changing search type, update and also notify parent
    setSearchType(searchType);
    
    // Clear current data when switching search types
    updateSearchConfig({
      searchType,
      useAllDates,
      useCachedData,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined
    });
    
    // Notify parent for component change
    onSearchTypeChange(searchType);
  };
  
  const handleConfigUpdate = () => {
    updateSearchConfig({
      searchType,
      useAllDates,
      useCachedData,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Search Type</Label>
            <RadioGroup 
              defaultValue="individual" 
              className="flex flex-row space-x-4"
              onValueChange={handleSearchTypeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual">Individual Search</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="population" id="population" />
                <Label htmlFor="population">Population Health/Group Search</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Search Options</Label>
            <div className="space-y-2">
              <div className="flex items-center">
                <Checkbox 
                  id="useAllDates" 
                  checked={useAllDates} 
                  onCheckedChange={(checked) => {
                    setUseAllDates(checked === true);
                    handleConfigUpdate();
                  }}
                />
                <Label htmlFor="useAllDates" className="ml-2 text-sm text-neutral-600">
                  Use all Dates of Service
                </Label>
              </div>
              
              <div className="flex items-center">
                <Checkbox 
                  id="useCachedData" 
                  checked={useCachedData} 
                  onCheckedChange={(checked) => {
                    setUseCachedData(checked === true);
                    handleConfigUpdate();
                  }}
                />
                <Label htmlFor="useCachedData" className="ml-2 text-sm text-neutral-600">
                  Use Pre-processed Data <span className="text-green-600 text-xs">(faster)</span>
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="block text-xs text-neutral-500 mb-1">
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                      disabled={useAllDates}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        handleConfigUpdate();
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="endDate" className="block text-xs text-neutral-500 mb-1">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                      disabled={useAllDates}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        handleConfigUpdate();
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-green-800 mb-1">
              <Zap className="h-3 w-3 mr-1" />
              <span className="text-xs font-medium">Performance Optimization</span>
            </div>
            <div className="text-xs text-green-700">
              Pre-processed data dramatically improves response time from 1-2 minutes to just seconds.
              The system processes all 3,800 symptoms against each note in advance for faster results.
              If pre-processed data isn't available, the system will automatically fall back to real-time processing.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchConfig;
