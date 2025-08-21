import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Search, Upload, Database } from 'lucide-react';

export default function HomeSimple() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/database-stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Behavioral Health Analytics Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Advanced healthcare data processing and visualization platform for extracting 
          insights from clinical notes and medical records.
        </p>
      </div>

      {/* Current System Status */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats?.patientCount?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats?.noteCount?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Symptoms Extracted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats?.symptomCount?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-green-600">
              {stats?.processingStatus?.status === 'complete' ? 'Complete' : 'Processing...'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/population-health">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Population Health</h3>
                  <p className="text-gray-600 text-sm">View demographic analytics and population insights</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/heatmaps2">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Database className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Heatmaps</h3>
                  <p className="text-gray-600 text-sm">Interactive symptom heatmaps and visualizations</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/bubble-charts">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Search className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Bubble Charts</h3>
                  <p className="text-gray-600 text-sm">Advanced bubble chart analytics</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/upload">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Upload className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Upload Data</h3>
                  <p className="text-gray-600 text-sm">Upload new clinical data files</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Processing Status */}
      {stats?.processingStatus && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Data Processing</span>
                  <span>{stats.processingStatus.progress || 0}%</span>
                </div>
                <Progress value={stats.processingStatus.progress || 0} className="w-full" />
              </div>
              <p className="text-sm text-gray-600">
                {stats.processingStatus.message || 'System ready'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}