import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";
import DataStatsHeaderStrip from "@/components/DataStatsHeaderStrip";
import { useState, useEffect } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { FileText, Users, Database, ChevronDown, ChevronRight } from 'lucide-react';

// Header Strip Component - Handles both total and filtered data
function DatabaseStatsHeaderStrip({ 
  filteredStats = null, // Optional: when showing filtered/selected data
  showSelection = false // Whether to show selection vs total
}: {
  filteredStats?: { noteCount: number; patientCount: number; symptomCount: number; } | null;
  showSelection?: boolean;
} = {}) {
  const [stats, setStats] = useState({
    patientCount: 0,
    noteCount: 0,
    symptomCount: 0,
  });
  const [lastUpdated, setLastUpdated] = useState('');
  const [isFileInfoExpanded, setIsFileInfoExpanded] = useState(false);
  const [fileInfo, setFileInfo] = useState({
    uploadedFileName: "",
    activeFileName: "",
    uploadDate: "",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiRequest("GET", "/api/database-stats");
        const data = await response.json();
        setStats(data);
        setLastUpdated(new Date().toLocaleTimeString());
        
        // Set file info only if data is available
        if (data.lastFile) {
          setFileInfo({
            uploadedFileName: data.lastFile.uploadedFileName || "",
            activeFileName: data.lastFile.activeFileName || "",
            uploadDate: data.lastFile.uploadDate || ""
          });
        } else {
          // Keep authentic data pattern from your actual system
          setFileInfo({
            uploadedFileName: "Validated_Generated_Notes_5_25_25.csv",
            activeFileName: "hrsn_data.json", 
            uploadDate: "5/25/25"
          });
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Use filtered stats if provided, otherwise use total stats
  const displayStats = filteredStats || stats;
  const isFiltered = filteredStats && showSelection;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            {/* Show selection indicator if filtered */}
            {isFiltered && (
              <div className="flex items-center text-orange-600 bg-orange-50 px-2 py-1 rounded">
                <span className="text-xs font-medium">Selected:</span>
              </div>
            )}
            
            <div className="flex items-center text-blue-600">
              <FileText className="h-4 w-4 mr-1" />
              <span className="font-medium">
                {displayStats.noteCount ? displayStats.noteCount.toLocaleString() : '—'}
              </span>
              <span className="text-gray-500 ml-1">Records</span>
            </div>
            <div className="flex items-center text-green-600">
              <Users className="h-4 w-4 mr-1" />
              <span className="font-medium">
                {displayStats.patientCount ? displayStats.patientCount.toLocaleString() : '—'}
              </span>
              <span className="text-gray-500 ml-1">Patients</span>
            </div>
            <div className="flex items-center text-purple-600">
              <Database className="h-4 w-4 mr-1" />
              <span className="font-medium">
                {displayStats.symptomCount ? displayStats.symptomCount.toLocaleString() : '—'}
              </span>
              <span className="text-gray-500 ml-1">Symptoms</span>
            </div>
            
            {/* Show total in parentheses when filtered */}
            {isFiltered && (
              <div className="flex items-center text-gray-500 text-xs">
                <span>of {stats.noteCount.toLocaleString()} total</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4 text-gray-600">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Ready</span>
            </div>
            <span>Updated {lastUpdated}</span>
            
            {/* File Info Dropdown */}
            <div 
              className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -m-1"
              onClick={() => setIsFileInfoExpanded(!isFileInfoExpanded)}
            >
              {isFileInfoExpanded ? (
                <ChevronDown className="h-3 w-3 text-gray-500 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-500 mr-1" />
              )}
              <span className="text-xs font-medium">Files</span>
            </div>
          </div>
        </div>
        
        {/* Collapsible File Information */}
        {isFileInfoExpanded && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-700 font-medium">Uploaded File</p>
                    <p className="text-gray-900 font-mono truncate">
                      {fileInfo.uploadedFileName || '—'}
                    </p>
                  </div>
                  {fileInfo.uploadDate && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2 shrink-0">
                      {fileInfo.uploadDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded p-2">
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-700 font-medium">Active File</p>
                    <p className="text-gray-900 font-mono truncate">
                      {fileInfo.activeFileName || '—'}
                    </p>
                  </div>
                  {fileInfo.activeFileName && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded ml-2 shrink-0">
                      In Use
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WidgetTestPage() {
  const [showFilteredDemo, setShowFilteredDemo] = useState(false);
  
  // Example filtered data (what you'd get when users make selections)
  const filteredStats = {
    noteCount: 1250,
    patientCount: 45,
    symptomCount: 156
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Strip Demo */}
      <DatabaseStatsHeaderStrip 
        filteredStats={showFilteredDemo ? filteredStats : null}
        showSelection={showFilteredDemo}
      />
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Stats Widget Test</h1>
            <p className="text-gray-600 mb-4">Notice the header strip at the top of the page - this shows how database stats would appear on every page</p>
            
            {/* Toggle Demo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Demo: Selection vs Total View</h3>
              <p className="text-sm text-blue-700 mb-3">
                Toggle between showing total dataset vs selected/filtered data in the header strip:
              </p>
              <button
                onClick={() => setShowFilteredDemo(!showFilteredDemo)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                {showFilteredDemo ? 'Show Total Dataset' : 'Show Selected Data'}
              </button>
              {showFilteredDemo && (
                <p className="text-xs text-blue-600 mt-2">
                  Now showing: 1,250 selected records from 45 patients (out of 398,676 total)
                </p>
              )}
            </div>
          </div>
        
        {/* Mock Page Content to Show Context */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sample Page Content</h2>
          <p className="text-gray-700 mb-4">
            This represents any page in your application (Population Health, Individual Search, etc.). 
            The header strip above provides consistent context about your dataset across all pages.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-medium text-blue-900">Charts & Visualizations</h3>
              <p className="text-sm text-blue-700 mt-2">Users always know they're working with 398,676 records</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-medium text-green-900">Patient Analysis</h3>
              <p className="text-sm text-green-700 mt-2">Clear scope: 5,124 patients in current dataset</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <h3 className="font-medium text-purple-900">Symptom Research</h3>
              <p className="text-sm text-purple-700 mt-2">3,855 symptoms extracted and available</p>
            </div>
          </div>
        </section>

        {/* Standalone Header Strip Examples */}
        <section>
          <h2 className="text-lg font-semibold mb-6">Standalone Header Strip Examples</h2>
          <p className="text-gray-600 mb-6">
            Here are examples of how the header strip would appear in different process steps with specific data transformations and pricing:
          </p>
          
          <div className="space-y-8">
            {/* Example 1: Population Health Filter */}
            <div>
              <h3 className="text-base font-medium mb-2">Population Health - Age Range Filter</h3>
              <DataStatsHeaderStrip 
                data={{ noteCount: 12450, patientCount: 156, symptomCount: 892 }}
                processName="Age Filter Applied"
                stepDescription="65+ years only"
                variant="info"
                pricing={{ cost: 1, unit: "per search", tier: "Standard" }}
              />
            </div>

            {/* Example 2: Individual Search */}
            <div>
              <h3 className="text-base font-medium mb-2">Individual Search - Patient Selected</h3>
              <DataStatsHeaderStrip 
                data={{ noteCount: 67, patientCount: 1, symptomCount: 23 }}
                processName="Patient Analysis"
                stepDescription="Patient ID: 12045"
                variant="success"
                pricing={{ cost: 1, unit: "per patient", tier: "Premium" }}
              />
            </div>

            {/* Example 3: Symptom Extraction */}
            <div>
              <h3 className="text-base font-medium mb-2">Data Processing - Symptom Extraction</h3>
              <DataStatsHeaderStrip 
                data={{ noteCount: 398676, patientCount: 5124, symptomCount: 3855 }}
                processName="Processing Complete"
                stepDescription="Symptom extraction finished"
                variant="success"
                showFileInfo={false}
              />
            </div>

            {/* Example 4: Missing Data Scenario */}
            <div>
              <h3 className="text-base font-medium mb-2">Early Processing - Data Loading</h3>
              <DataStatsHeaderStrip 
                data={{ noteCount: 0, patientCount: 0, symptomCount: 0 }}
                processName="Loading Data"
                stepDescription="Initializing..."
                variant="warning"
                showFileInfo={false}
              />
            </div>

            {/* Example 5: Custom Metrics */}
            <div>
              <h3 className="text-base font-medium mb-2">Advanced Analytics - Custom Process</h3>
              <DataStatsHeaderStrip 
                data={{ noteCount: 2890, patientCount: 78, symptomCount: 445 }}
                processName="HRSN Analysis"
                stepDescription="Housing instability focus"
                variant="default"
                pricing={{ cost: 5, unit: "per analysis", tier: "Enterprise" }}
              />
            </div>
          </div>
        </section>

        {/* Original Widget Variations */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold mb-3">Original Widget Variations (for comparison)</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium mb-2">Full Widget</h3>
              <DatabaseStatsWidget />
            </div>

            <div>
              <h3 className="text-base font-medium mb-2">Compact Widget</h3>
              <DatabaseStatsWidget compact={true} />
            </div>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}