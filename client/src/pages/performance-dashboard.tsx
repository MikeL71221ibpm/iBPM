import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, Database, Users, FileText, Activity, 
  TrendingUp, AlertTriangle, CheckCircle, 
  Server, Cpu, MemoryStick, HardDrive 
} from "lucide-react";

// Performance metrics interface based on yesterday's discussion
interface PerformanceMetrics {
  // System Performance
  systemHealth: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    responseTime: number;
  };
  
  // Database Performance
  databaseMetrics: {
    connectionPool: number;
    activeQueries: number;
    queryPerformance: {
      averageResponseTime: number;
      slowQueries: number;
      totalQueries: number;
    };
    dataVolume: {
      totalPatients: number;
      totalNotes: number;
      totalSymptoms: number;
      dataGrowthRate: number;
    };
  };
  
  // Processing Performance
  processingMetrics: {
    uploadPerformance: {
      averageUploadTime: number;
      filesProcessedToday: number;
      totalDataProcessed: number;
      errorRate: number;
    };
    extractionPerformance: {
      averageExtractionTime: number;
      symptomsExtractedPerMinute: number;
      extractionAccuracy: number;
      pendingExtractions: number;
    };
  };
  
  // User Activity
  userMetrics: {
    activeUsers: number;
    totalSearches: number;
    exportRequests: number;
    sessionDuration: number;
  };
  
  // Error Tracking
  errorMetrics: {
    totalErrors: number;
    criticalErrors: number;
    errorRate: number;
    lastErrorTime: string;
  };
}

const PerformanceDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Fetch performance metrics
  const { data: metrics, isLoading, refetch } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/performance-metrics'],
    refetchInterval: isLiveMode ? refreshInterval : false,
  });

  // Status indicator component
  const StatusIndicator = ({ value, threshold, label }: { value: number; threshold: number; label: string }) => {
    const getStatus = () => {
      if (value < threshold * 0.7) return { color: 'bg-green-500', text: 'Optimal' };
      if (value < threshold * 0.9) return { color: 'bg-yellow-500', text: 'Warning' };
      return { color: 'bg-red-500', text: 'Critical' };
    };
    
    const status = getStatus();
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${status.color}`} />
        <span className="text-sm font-medium">{label}: {value}%</span>
        <Badge variant={status.text === 'Optimal' ? 'default' : status.text === 'Warning' ? 'secondary' : 'destructive'}>
          {status.text}
        </Badge>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">Real-time system monitoring and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={isLiveMode ? "default" : "outline"} 
            onClick={() => setIsLiveMode(!isLiveMode)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Live Mode {isLiveMode && '(ON)'}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.systemHealth.uptime || 0}h</div>
            <p className="text-xs text-muted-foreground">Since last restart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.systemHealth.cpuUsage || 0}%</div>
            <Progress value={metrics?.systemHealth.cpuUsage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.systemHealth.memoryUsage || 0}%</div>
            <Progress value={metrics?.systemHealth.memoryUsage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.systemHealth.responseTime || 0}ms</div>
            <p className="text-xs text-muted-foreground">Average API response</p>
          </CardContent>
        </Card>
      </div>

      {/* Database Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Connection Pool</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Active Connections</span>
                  <span className="font-medium">{metrics?.databaseMetrics.connectionPool || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Queries</span>
                  <span className="font-medium">{metrics?.databaseMetrics.activeQueries || 0}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Query Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Avg Response Time</span>
                  <span className="font-medium">{metrics?.databaseMetrics.queryPerformance.averageResponseTime || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Slow Queries</span>
                  <span className="font-medium">{metrics?.databaseMetrics.queryPerformance.slowQueries || 0}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Data Volume</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Patients</span>
                  <span className="font-medium">{metrics?.databaseMetrics.dataVolume.totalPatients?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Notes</span>
                  <span className="font-medium">{metrics?.databaseMetrics.dataVolume.totalNotes?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Average Upload Time</span>
                <span className="font-medium">{metrics?.processingMetrics.uploadPerformance.averageUploadTime || 0}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Files Processed Today</span>
                <span className="font-medium">{metrics?.processingMetrics.uploadPerformance.filesProcessedToday || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Error Rate</span>
                <Badge variant={((metrics?.processingMetrics.uploadPerformance.errorRate || 0) < 5) ? "default" : "destructive"}>
                  {metrics?.processingMetrics.uploadPerformance.errorRate || 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Extraction Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Avg Extraction Time</span>
                <span className="font-medium">{metrics?.processingMetrics.extractionPerformance.averageExtractionTime || 0}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Symptoms/Minute</span>
                <span className="font-medium">{metrics?.processingMetrics.extractionPerformance.symptomsExtractedPerMinute || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Pending Extractions</span>
                <span className="font-medium">{metrics?.processingMetrics.extractionPerformance.pendingExtractions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity & Error Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Active Users</span>
                <span className="font-medium">{metrics?.userMetrics.activeUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Searches</span>
                <span className="font-medium">{metrics?.userMetrics.totalSearches || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Export Requests</span>
                <span className="font-medium">{metrics?.userMetrics.exportRequests || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Errors</span>
                <Badge variant={((metrics?.errorMetrics.totalErrors || 0) === 0) ? "default" : "destructive"}>
                  {metrics?.errorMetrics.totalErrors || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Critical Errors</span>
                <Badge variant={((metrics?.errorMetrics.criticalErrors || 0) === 0) ? "default" : "destructive"}>
                  {metrics?.errorMetrics.criticalErrors || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Error Rate</span>
                <span className="font-medium">{metrics?.errorMetrics.errorRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            System Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusIndicator 
              value={metrics?.systemHealth.cpuUsage || 0} 
              threshold={100} 
              label="CPU" 
            />
            <StatusIndicator 
              value={metrics?.systemHealth.memoryUsage || 0} 
              threshold={100} 
              label="Memory" 
            />
            <StatusIndicator 
              value={metrics?.processingMetrics.uploadPerformance.errorRate || 0} 
              threshold={10} 
              label="Error Rate" 
            />
            <StatusIndicator 
              value={metrics?.systemHealth.responseTime || 0} 
              threshold={1000} 
              label="Response Time" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;