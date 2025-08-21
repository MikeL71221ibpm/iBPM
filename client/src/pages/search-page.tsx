import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, LineChart } from "lucide-react";
import DataStatsHeaderStrip from "@/components/DataStatsHeaderStrip";
import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    // Simulate search results
    setTimeout(() => {
      const mockResults = [
        { id: 1, patientId: "P001", patientName: "Test Patient 1" },
        { id: 2, patientId: "P002", patientName: "Test Patient 2" },
        { id: 3, patientId: "P003", patientName: "Bob Johnson" }
      ];
      setSearchResults(mockResults);
      setIsLoading(false);
    }, 1000);
  };

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Database Stats Widget */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Individual Patient Search</h1>
        <DatabaseStatsWidget className="ml-4" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search for a patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Location 1: After Search Results - Data Stats Header Strip */}
          {searchResults.length > 0 && (
            <div className="mt-6">
              <DataStatsHeaderStrip 
                data={{ 
                  noteCount: searchResults.length * 5, 
                  patientCount: searchResults.length, 
                  symptomCount: 0 
                }}
                processName="Search Results"
                stepDescription={`Found ${searchResults.length} patients`}
                variant="info"
                pricing={undefined}
                showFileInfo={false}
              />
              
              <h3 className="text-sm font-medium mb-3 mt-4">Search Results ({searchResults.length})</h3>
              <div className="space-y-2">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-3 rounded-md border cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedPatient?.id === patient.id ? "border-primary bg-primary-50" : "border-gray-200"
                    }`}
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="font-medium">ID: {patient.patientId}</span>
                      <span className="mx-2">•</span>
                      <span>{patient.patientName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location 2: Before Run Analysis - Data Stats Header Strip */}
          {selectedPatient && (
            <div className="mt-6">
              <DataStatsHeaderStrip 
                data={{ 
                  noteCount: 12, // Sample note count
                  patientCount: 1, 
                  symptomCount: 0 
                }}
                processName="Patient Analysis"
                stepDescription={`Ready to analyze ${selectedPatient.patientName} (ID: ${selectedPatient.patientId})`}
                variant="success"
                pricing={undefined}
                showFileInfo={false}
              />

              <Card className="bg-green-50 border-green-200 mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <LineChart className="h-5 w-5 mr-2" />
                    Run Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Start Patient Analysis
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchPage;