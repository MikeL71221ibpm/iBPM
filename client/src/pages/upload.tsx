import React from 'react';
import FileUpload from '@/components/FileUpload';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';

export default function UploadPage() {
  const { user } = useAuth();

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          <h2 className="text-2xl font-bold ml-4">Upload Patient Data</h2>
        </div>
        
        {/* Search Type */}
        <div className="mb-6 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Step 1: Search Type</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select how you want to analyze your patient data.
          </p>
          <div className="flex space-x-4 mb-2">
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="individual-type" 
                name="search-type" 
                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                defaultChecked={true}
              />
              <label htmlFor="individual-type" className="text-sm font-medium text-gray-700">Individual Search</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="population-type" 
                name="search-type" 
                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
              />
              <label htmlFor="population-type" className="text-sm font-medium text-gray-700">Population Health</label>
            </div>
          </div>
        </div>
        
        {/* File Selection */}
        <div className="mb-6 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Step 2: File Selection</h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload your Excel or CSV file containing patient data.
          </p>
        </div>

        <FileUpload />

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">File Format Requirements</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-medium">Required Columns (Excel or CSV)</h4>
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

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-md font-medium text-blue-900 mb-2">Demographic Fields for HRSN Analysis</h4>
              <p className="text-sm text-blue-800 mb-3">
                These fields are required for Health-Related Social Needs (HRSN) analysis. If not provided, HRSN functionality will be disabled.
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                <li><span className="font-medium">age_range</span> OR <span className="font-medium">date_of_birth</span> - Age category (18-24, 25-34, etc.) or birth date (YYYY-MM-DD)</li>
                <li><span className="font-medium">gender</span> - Patient gender</li>
                <li><span className="font-medium">race</span> - Patient race</li>
                <li><span className="font-medium">ethnicity</span> - Patient ethnicity</li>
                <li><span className="font-medium">zip_code</span> - Patient zip code</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                <strong>Note:</strong> Without these demographic fields, the system can still process clinical notes but cannot perform HRSN demographic analysis or generate age-stratified reports.
              </p>
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