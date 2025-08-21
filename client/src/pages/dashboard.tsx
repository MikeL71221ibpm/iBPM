import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UploadCloud, FileUp, Search, Users, Download, ArrowLeft, LogOut, Settings, AlertCircle } from "lucide-react";
import SearchFlow from "@/components/search-flow-controlling-file-05_17_25";
import { useAppContext } from "@/context/AppContext";
import AdminPreProcessing from "@/components/AdminPreProcessing";
import SuperFixed from "@/components/SuperFixed"; // Original component
import InlineFileInfo from "@/components/InlineFileInfo"; // New high-visibility component

// Add a console log to confirm this file is loaded
console.log("Dashboard component loaded at", new Date().toLocaleTimeString());

// Add a console log to confirm this file is loaded
console.log("Dashboard component loaded at", new Date().toLocaleTimeString());

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { downloadCurrentData, updateSearchConfig } = useAppContext();
  
  // Get 'mode' query parameter
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const defaultMode = searchParams.get("mode") || "actions";
  
  const [activeTab, setActiveTab] = useState(defaultMode);
  const [activeSearchType, setActiveSearchType] = useState<"individual" | "population">("individual");
  
  useEffect(() => {
    // Update active tab if URL changes
    const mode = searchParams.get("mode");
    if (mode) {
      setActiveTab(mode);
    }
  }, [location]);
  
  // Handle search type change
  const handleSearchTypeChange = (type: "individual" | "population") => {
    setActiveSearchType(type);
    // Clear any previous search results when switching types
    updateSearchConfig({
      searchType: type,
      useAllDates: false,
      useCachedData: false
    });
  };
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Behavioral Health AI Solutions
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              UPDATED {new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: '2-digit'})}
            </span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.username || 'User'}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="actions">Dashboard</TabsTrigger>
              <TabsTrigger value="individual">Individual Search</TabsTrigger>
              <TabsTrigger value="population">Population Analysis</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              {activeTab !== "actions" && (
                <Button variant="outline" size="sm" onClick={() => setActiveTab("actions")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={downloadCurrentData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
          
          <TabsContent value="actions" className="mt-6">
            <h2 className="text-3xl font-bold text-center mb-8">Select an Action</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Upload Card */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileUp className="h-5 w-5 mr-2 text-blue-500" />
                    Upload Patient Data
                  </CardTitle>
                  <CardDescription>
                    Import patient records from Excel or CSV files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Upload your patient behavioral health data files for processing and analysis. 
                    The system will extract relevant symptoms and diagnostic information.
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href="/upload" className="w-full">
                    <Button className="w-full">
                      Upload Files
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Search Card */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="h-5 w-5 mr-2 text-green-500" />
                    Search Patients
                  </CardTitle>
                  <CardDescription>
                    Find specific patients or filter by criteria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Search for individual patients by name or ID, or search across your entire patient population 
                    using advanced filters and date ranges.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => setActiveTab("individual")}
                  >
                    Search Records
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Subscription Status */}
            <div className="mt-10 p-6 bg-white shadow rounded-lg max-w-4xl mx-auto">
              <h3 className="text-lg font-medium text-gray-900">Subscription Status</h3>
              <div className="mt-2 flex items-center">
                <div className="flex-shrink-0">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user?.subscriptionStatus === 'premium' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user?.subscriptionStatus === 'premium' ? 'Premium' : 'Free'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-500">
                    {user?.subscriptionStatus === 'premium' 
                      ? 'You have access to all premium features.'
                      : 'Upgrade to premium for full access to all features.'}
                  </p>
                </div>
                {user?.subscriptionStatus !== 'premium' && (
                  <div className="ml-auto">
                    <Link href="/subscription">
                      <Button variant="outline" size="sm">
                        Upgrade Plan
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            

          </TabsContent>
          
          <TabsContent value="individual">
            {/* Consolidated search interface with inline file information and run analysis */}
            <div className="space-y-6">
              {/* Add InlineFileInfo component at the top of this tab */}
              <h2 className="text-2xl font-bold text-center mb-4">Individual Patient Search</h2>
              
              {/* This is our new component with File Info and Run Analysis button */}
              <InlineFileInfo />
              
              {/* Regular SearchFlow below */}
              <SearchFlow 
                initialType="individual"
                onSearchTypeChange={handleSearchTypeChange}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="population">
            {/* Consolidated search interface that defaults to population analysis */}
            <div className="space-y-6">
              <SearchFlow 
                initialType="population"
                onSearchTypeChange={handleSearchTypeChange}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Admin Tools Section - Always visible for debugging */}
        <div className="mt-10 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-purple-500" />
            Admin Tools {user?.id && `(User ID: ${user.id})`}
          </h3>
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-lg font-medium mb-4">Performance Optimization</h4>
            <div className="mb-2 text-sm text-gray-600">
              Pre-process symptom data to dramatically improve search performance. 
              This creates an optimized cache that allows for near-instant results.
            </div>
            
            {/* Admin Pre-Processing Component */}
            <AdminPreProcessing />
            
            <div className="mt-4 text-xs text-gray-500">
              Note: Pre-processing runs in the background and may take several minutes to complete.
              Once complete, all searches will automatically use the pre-processed data for faster results.
            </div>
          </div>
        </div>
      </main>

      {/* Kill Processes Button - Fixed Position Lower Right */}
      <div 
        className="fixed bottom-4 right-4 z-[9999]" 
        style={{ 
          position: 'fixed', 
          bottom: '16px', 
          right: '16px', 
          zIndex: 9999,
          pointerEvents: 'auto'
        }}
      >
        <button
          onClick={() => window.open('/emergency-kill.html', '_blank')}
          className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded shadow-lg border-2 border-red-800"
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '2px solid #991b1b',
            cursor: 'pointer'
          }}
        >
          Kill Processes
        </button>
      </div>
    </div>
  );
}