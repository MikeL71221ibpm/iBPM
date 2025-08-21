import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Search, User, FileUp, LineChart } from "lucide-react";

/**
 * This is a completely new component to test if our changes are being picked up.
 * It should appear in place of the regular IndividualSearch component.
 */
const FixedIndividualSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  console.log("FixedIndividualSearch rendering at", new Date().toLocaleTimeString());
  
  return (
    <div className="space-y-6">
      {/* Debug indicator - always visible */}
      <div className="bg-purple-100 border-2 border-purple-500 text-purple-800 p-3 rounded-lg mb-4 animate-pulse">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="font-bold">NEW COMPONENT RENDER v2: {new Date().toLocaleTimeString()}</span>
        </div>
        <p className="text-xs mt-1">
          This is an entirely new component file created to bypass caching issues.
          The component now includes file information display and Run Analysis button.
        </p>
      </div>
      
      {/* FILE INFORMATION DISPLAY CARD */}
      <Card className="bg-blue-50 shadow-lg border-2 border-blue-300">
        <CardHeader className="bg-blue-100">
          <CardTitle className="flex items-center text-blue-800">
            <FileUp className="h-5 w-5 mr-2" />
            File Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-blue-200 border-2 border-blue-500 rounded-md shadow-md mb-4">
            <div className="text-center font-bold text-blue-800 mb-2 text-sm">FILE INFORMATION - ADDED TO FIXEDINDIVIDUALSEARCH</div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              {/* Records count with larger, more visible styling */}
              <div className="inline-flex items-center bg-blue-100 text-blue-800 text-sm rounded-md px-3 py-2 border border-blue-400 shadow-sm">
                <div className="w-5 h-5 mr-2 text-blue-600 font-bold">📊</div>
                <span className="font-semibold">6,280 records • 24 patients</span>
              </div>
              
              {/* File name and path with larger, more visible styling */}
              <div className="text-sm bg-blue-50 px-3 py-2 rounded-md border border-blue-300">
                <span className="font-semibold mr-1">File:</span>
                <span className="text-blue-700">Symptom_Segments_asof_4_30_25_MASTER.csv</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* RUN ANALYSIS BUTTON CARD */}
      <Card className="bg-green-50 shadow-lg border-2 border-green-300">
        <CardHeader className="bg-green-100">
          <CardTitle className="flex items-center text-green-800">
            <LineChart className="h-5 w-5 mr-2" />
            Run Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-green-200 border-2 border-green-500 rounded-md shadow-md mb-4">
            <div className="text-center font-bold text-green-800 mb-2 text-sm">RUN ANALYSIS BUTTON - ADDED TO FIXEDINDIVIDUALSEARCH</div>
            
            <div className="flex justify-center">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-5 text-lg font-bold shadow-lg transform transition hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
                RUN ANALYSIS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* INDIVIDUAL SEARCH CARD */}
      <Card className="shadow-lg border-2 border-purple-300">
        <CardHeader className="bg-purple-50">
          <CardTitle className="flex items-center text-purple-800">
            <Search className="h-5 w-5 mr-2" />
            Individual Search Component
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="searchTerm">Patient Name or ID</Label>
              <Input
                id="searchTerm"
                placeholder="Enter patient name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-4">
              <Button className="flex-1">Search</Button>
              <Button variant="outline" className="flex-1">Reset</Button>
            </div>
            
            {/* Placeholder results */}
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Sample Patient</span>
                <span className="text-xs text-gray-500">ID: 123456</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FixedIndividualSearch;