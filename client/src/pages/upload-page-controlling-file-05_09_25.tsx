// Last updated: May 24, 2025 - 11:57 AM
// Controls route: /upload

import React, { useState, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ChevronLeft, Calendar, BarChart2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function UploadPage() {
  const { user } = useAuth();
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileInfo, setFileInfo] = useState({ 
    records: 0, 
    patients: 0, 
    filename: '' 
  });
  const [isAnalysisReady, setIsAnalysisReady] = useState(false);

  // Fetch file info on component mount
  useEffect(() => {
    // This would normally be a fetch to get the current file information
    const mockFileInfo = {
      records: 6280,
      patients: 24,
      filename: '/data/uploads/patient_clinical_notes.json'
    };
    
    // Simulate a small delay for the data to "load"
    const timer = setTimeout(() => {
      setFileInfo(mockFileInfo);
      setIsAnalysisReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleRunAnalysis = () => {
    // This would normally dispatch an analysis request with the date range if selected
    const analysisParams = useDateRange ? { startDate, endDate } : { useAllDates: true };
    
    console.log('Running analysis with parameters:', analysisParams);
    // Simulate a toast notification
    alert('Analysis started with the selected parameters');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Behavioral Health AI Solutions</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.username || 'User'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          <h2 className="text-2xl font-bold ml-4">Upload & Manage Data</h2>
        </div>
        
        {/* File Selection - Compact */}
        <div className="mb-4 bg-white shadow-sm rounded-lg p-3">
          <h3 className="text-md font-medium mb-2">File Selection</h3>
          <FileUpload />
        </div>
        
        {/* Date Range Selection - Compact */}
        <div className="mb-4 bg-white shadow-sm rounded-lg p-3">
          <h3 className="text-md font-medium mb-2">Date Range Selection</h3>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Switch 
                id="date-range-toggle"
                checked={useDateRange}
                onCheckedChange={setUseDateRange}
              />
              <Label htmlFor="date-range-toggle" className="font-medium text-sm">
                Filter by date range
              </Label>
            </div>
            <Button 
              variant={useDateRange ? "outline" : "secondary"}
              size="sm"
              onClick={() => setUseDateRange(false)}
              disabled={!useDateRange}
              className="text-xs py-1 h-8"
            >
              Use all Dates of Service
            </Button>
          </div>
          
          {useDateRange && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2 h-3 w-3 text-gray-500" />
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-7 w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2 h-3 w-3 text-gray-500" />
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-7 w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center">
            <div className="flex-1">
              <div className="text-sm font-medium">Active Records: 
                <span className="ml-1 text-blue-700">📊 {fileInfo.records.toLocaleString()} records • {fileInfo.patients} patients</span>
              </div>
              <div className="text-xs text-gray-500">
                Current Active File: <span className="font-mono text-xs">{fileInfo.filename}</span>
              </div>
            </div>
            <Button 
              onClick={handleRunAnalysis}
              disabled={!isAnalysisReady}
              className="ml-2 h-9 px-3 py-1"
              size="sm"
            >
              <BarChart2 className="mr-1 h-4 w-4" />
              Run Analysis
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
            <div>
              <h4 className="text-md font-medium">Expected Columns (Excel or CSV)</h4>
              <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
                <li><span className="font-medium">patientId</span> - Unique identifier for the patient</li>
                <li><span className="font-medium">patientName</span> - Full name of the patient</li>
                <li><span className="font-medium">dosDate</span> - Date of service in YYYY-MM-DD format</li>
                <li><span className="font-medium">noteText</span> - The clinical note text</li>
                <li><span className="font-medium">providerId</span> (optional) - Unique identifier for the provider</li>
                <li><span className="font-medium">providerName</span> (optional) - Provider's first name</li>
                <li><span className="font-medium">providerLname</span> (optional) - Provider's last name</li>
              </ul>
            </div>

            <div>
              <h4 className="text-md font-medium">Sample Format</h4>
              <div className="mt-2 bg-gray-50 p-3 rounded-md overflow-x-auto">
                <code className="text-xs text-gray-800">
                  patientId,patientName,dosDate,noteText,providerId,providerName,providerLname<br/>
                  P12345,Jane Smith,2023-04-15,"Patient reports feeling anxious and having trouble sleeping.",DR001,John,Doe<br/>
                  P12345,Jane Smith,2023-05-20,"Follow-up visit. Patient shows signs of improvement in anxiety symptoms.",DR001,John,Doe<br/>
                  P67890,Michael Johnson,2023-04-10,"Initial assessment. Patient exhibits symptoms of depression.",DR002,Sarah,Williams
                </code>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium">Processing Details</h4>
              <p className="mt-2 text-sm text-gray-600">
                After upload, the system will:
              </p>
              <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                <li>Extract and store patient records</li>
                <li>Process clinical notes to identify behavioral health symptoms</li>
                <li>Categorize detected symptoms by diagnostic category</li>
                <li>Make the data available for individual and population searches</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}