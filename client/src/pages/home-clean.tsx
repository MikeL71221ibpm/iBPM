import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Upload, 
  Users, 
  FileText, 
  Activity,
  Search,
  ChevronRight,
  Database,
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import DatabaseStatsWidget from '@/components/DatabaseStatsWidget';
import PopulationSearch from "@/components/population-search-controlling-file-05_12_25";

export default function HomeClean() {
  const { user } = useAuth();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Behavioral Health Analytics Platform
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform complex clinical data into actionable insights through advanced visualization 
              and risk stratification technologies
            </p>
          </div>

          {/* Quick Stats */}
          <div className="mb-12">
            <DatabaseStatsWidget 
              patientCount={0}
              noteCount={0}
              symptomCount={0}
              onRefresh={() => {}}
              isRefreshing={false}
            />
          </div>

          {/* Main Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            
            {/* Population Health Analytics */}
            <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  <CardTitle className="text-lg">Population Analytics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm">
                  Comprehensive population-level analysis with interactive charts and risk stratification
                </p>
                <Link href="/population-health">
                  <Button className="w-full" size="sm">
                    View Analytics
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Patient Search */}
            <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-green-500 lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Search className="h-6 w-6 text-green-600" />
                  <CardTitle className="text-lg">Patient Search</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Individual Search */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Individual Search</h4>
                    <p className="text-gray-600 mb-3 text-sm">
                      Search and analyze individual patient records with detailed symptom extraction
                    </p>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        placeholder="Search by Patient ID or Name..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <Button size="sm" variant="outline">
                        Search
                      </Button>
                    </div>
                  </div>

                  {/* Population Health/Group Search and Date Range */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Population Health/Group Search</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Search Type Selection */}
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">Search Type</h5>
                        <p className="text-gray-600 mb-3 text-sm">
                          Analyze population-level trends and patterns
                        </p>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              name="searchType" 
                              value="population"
                              className="text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">Population Analysis</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              name="searchType" 
                              value="group"
                              className="text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">Group Comparison</span>
                          </label>
                        </div>
                      </div>

                      {/* Date Range Selection */}
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">Date Range Selection</h5>
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              defaultChecked
                              className="text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm">Use all available dates</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                              <input 
                                type="date"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">End Date</label>
                              <input 
                                type="date"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Upload */}
            <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Upload className="h-6 w-6 text-purple-600" />
                  <CardTitle className="text-lg">Upload Data</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm">
                  Upload clinical notes and EHR data for automated processing and analysis
                </p>
                <Link href="/upload">
                  <Button variant="outline" className="w-full" size="sm">
                    Upload Files
                    <Upload className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            
            {/* Visualization Options */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base">Heatmaps</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Enhanced symptom correlation heatmaps
                </p>
                <Link href="/heatmaps2">
                  <Button variant="ghost" size="sm" className="w-full">
                    View Heatmaps
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-base">Bubble Charts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Interactive bubble visualizations
                </p>
                <Link href="/bubble-charts">
                  <Button variant="ghost" size="sm" className="w-full">
                    View Bubbles
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-base">Pivot Tables</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Dynamic data pivot analysis
                </p>
                <Link href="/pivot-tables">
                  <Button variant="ghost" size="sm" className="w-full">
                    View Tables
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base">Admin Panel</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  System administration tools
                </p>
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="w-full">
                    Admin Area
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Key Features Section */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Platform Capabilities
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Multi-User Support</h3>
                <p className="text-sm text-gray-600">
                  Secure data isolation with enterprise-grade user management
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Real-Time Processing</h3>
                <p className="text-sm text-gray-600">
                  Automated symptom extraction and risk stratification
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Advanced Analytics</h3>
                <p className="text-sm text-gray-600">
                  Interactive visualizations with export capabilities
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Welcome back, <span className="font-medium text-gray-700">{user.username}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}