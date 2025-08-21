import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Activity, Database } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface DatabaseStats {
  patientCount: number;
  noteCount: number;
  symptomCount: number;
  processingStatus?: string;
}

export default function InstantHome() {
  const { data: stats } = useQuery<DatabaseStats>({ 
    queryKey: ['/api/database-stats'],
    refetchInterval: 3000
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Healthcare Analytics Platform
          </h1>
          <p className="text-lg text-gray-600">
            Advanced behavioral health data processing and visualization
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.patientCount?.toLocaleString() || "0"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clinical Notes</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.noteCount?.toLocaleString() || "0"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Symptoms Extracted</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.symptomCount?.toLocaleString() || "0"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
              <Database className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.noteCount > 0 ? 
                  `${Math.round((stats.symptomCount / stats.noteCount) * 100) / 100}` : "0"
                }
              </div>
              <p className="text-xs text-muted-foreground">symptoms per note</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Upload clinical notes for symptom extraction and analysis
              </p>
              <Link href="/upload">
                <Button className="w-full">Upload Files</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>View Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Explore population health trends and visualizations
              </p>
              <Link href="/population-health">
                <Button className="w-full" variant="outline">View Charts</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Search patients, symptoms, and clinical indicators
              </p>
              <Link href="/bubble-charts">
                <Button className="w-full" variant="outline">Search & Analyze</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Status Indicator */}
        {stats?.processingStatus && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
              <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full mr-2"></div>
              Processing: {stats.processingStatus.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}