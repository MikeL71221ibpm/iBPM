import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Search, 
  BarChart3, 
  Upload, 
  Settings, 
  FileText, 
  TrendingUp,
  Users,
  Activity,
  Clock
} from "lucide-react";
import DatabaseStatsWidget from '@/components/DatabaseStatsWidget';
import { useQuery } from "@tanstack/react-query";

export default function HomePageRedesigned() {
  const { user } = useAuth();
  
  // Get database stats
  const { data: databaseStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/database-stats"],
    refetchInterval: 2000,
  });

  const stats = databaseStats || { patientCount: 0, noteCount: 0, symptomCount: 0 };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            HRSN Behavioral Health Analytics
          </h1>
          <p className="text-xl text-white/90 font-medium">
            Advanced Clinical Data Analysis Platform
          </p>
        </div>

        {/* Stats Bar */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="stat-item">
              <h3 className="text-3xl font-bold text-blue-600 mb-2">
                {stats.patientCount?.toLocaleString() || '0'}
              </h3>
              <p className="text-gray-600 font-medium">Active Patients</p>
            </div>
            <div className="stat-item">
              <h3 className="text-3xl font-bold text-blue-600 mb-2">
                {stats.noteCount?.toLocaleString() || '0'}
              </h3>
              <p className="text-gray-600 font-medium">Clinical Notes</p>
            </div>
            <div className="stat-item">
              <h3 className="text-3xl font-bold text-blue-600 mb-2">
                {stats.noteCount > 0 ? 'Ready' : 'Processing'}
              </h3>
              <p className="text-gray-600 font-medium">Upload Status</p>
            </div>
            <div className="stat-item">
              <h3 className="text-3xl font-bold text-green-600 mb-2">Ready</h3>
              <p className="text-gray-600 font-medium">System Status</p>
            </div>
          </div>
        </div>

        {/* Main Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Individual Patient Search */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Individual Patient Search
                  </h2>
                  <p className="text-gray-600 font-medium">
                    Search specific patient records and analyze symptoms
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Search for individual patients by ID, name, or provider. View detailed clinical notes, 
                extracted symptoms, and generate comprehensive patient analysis reports.
              </p>
              
              <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-800 rounded-full text-sm font-semibold mb-6">
                <Activity className="w-4 h-4 mr-2" />
                {stats.patientCount?.toLocaleString() || '0'} patients available for search
              </div>
              
              <div className="space-y-3">
                <Link href="/search">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-lg">
                    Start Individual Search
                  </Button>
                </Link>
                <Link href="/search?demo=true">
                  <Button variant="outline" className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-3">
                    View Sample Patient
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Population Health Analytics */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Population Health Analytics
                  </h2>
                  <p className="text-gray-600 font-medium">
                    Analyze trends across patient populations
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Generate population-level insights with interactive charts for HRSN indicators, 
                diagnostic categories, symptom segments, and demographic analysis.
              </p>
              
              <div className="inline-flex items-center px-4 py-2 bg-yellow-50 text-yellow-800 rounded-full text-sm font-semibold mb-6">
                <Clock className="w-4 h-4 mr-2" />
                {stats.noteCount > 0 ? 'Analytics ready' : 'Processing clinical notes for full analytics'}
              </div>
              
              <div className="space-y-3">
                <Link href="/population-health">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-lg">
                    View Population Analytics
                  </Button>
                </Link>
                <Link href="/population-health?demo=true">
                  <Button variant="outline" className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-3">
                    See Demo Charts
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Tools Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Data Upload */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Data Upload</h3>
                  <p className="text-gray-600 text-sm">Upload new clinical data files</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 mb-4">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Drag & drop CSV files here</p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports: CSV files with clinical notes and patient data
                </p>
              </div>
              
              <div className="space-y-2 mb-4 text-sm">
                <label className="flex items-center text-gray-700">
                  <input type="checkbox" className="mr-2 rounded" defaultChecked />
                  Extract symptoms automatically
                </label>
                <label className="flex items-center text-gray-700">
                  <input type="checkbox" className="mr-2 rounded" defaultChecked />
                  Generate analytics reports
                </label>
              </div>
              
              <Link href="/upload">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold">
                  Upload New File
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Analysis Tools */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Analysis Tools</h3>
                  <p className="text-gray-600 text-sm">Advanced search and export options</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm mb-2"
                  />
                  <input 
                    type="date" 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Search Type</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                    <option>Exact Match</option>
                    <option>Partial Match</option>
                    <option>Fuzzy Search</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold">
                  Configure Search
                </Button>
                <Button variant="outline" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
                  <p className="text-gray-600 text-sm">Common tasks and shortcuts</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  View Recent Searches
                </Button>
                <Button variant="outline" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Download Reports
                </Button>
                <Button variant="outline" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 justify-start">
                  <Activity className="w-4 h-4 mr-2" />
                  System Status
                </Button>
                <Button variant="outline" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Help & Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}