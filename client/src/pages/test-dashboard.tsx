import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTestLogs, clearTestLogs } from '@/lib/testLogger';
import { getPerformanceSummary, getCompletedTimings, clearCompletedTimings, downloadPerformanceSummary } from '@/lib/performanceTracker';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle, Download, RefreshCw } from 'lucide-react';

export default function TestDashboard() {
  const [activeTab, setActiveTab] = useState('testcases');
  
  // Client-side logs
  const clientLogs = getTestLogs();
  const clientTimings = getCompletedTimings();
  const clientPerformanceSummary = getPerformanceSummary();
  
  // Server-side logs
  const { data: serverLogs, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/test-logs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/test-logs');
      return await res.json();
    }
  });
  
  const { data: serverSummary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['/api/test-summary'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/test-summary');
      return await res.json();
    }
  });
  
  // Combined logs (client + server)
  const [combinedTestResults, setCombinedTestResults] = useState<any[]>([]);
  
  useEffect(() => {
    const combined = [
      ...(clientLogs || []).map(log => ({ ...log, source: 'client' })),
      ...(serverLogs || []).map(log => ({ ...log, source: 'server' }))
    ];
    
    // Sort by timestamp (most recent first)
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setCombinedTestResults(combined);
  }, [clientLogs, serverLogs]);
  
  // Handle clearing logs
  const handleClearLogs = async () => {
    // Clear client logs
    clearTestLogs();
    clearCompletedTimings();
    
    // Clear server logs
    await apiRequest('POST', '/api/clear-test-logs');
    
    // Refresh data
    refetchLogs();
    refetchSummary();
  };
  
  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  };
  
  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1000) return ms.toFixed(1) + 'ms';
    return (ms / 1000).toFixed(2) + 's';
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Test & Performance Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              refetchLogs();
              refetchSummary();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleClearLogs}
            className="flex items-center gap-2"
          >
            <XCircle size={16} /> Clear Logs
          </Button>
          <Button 
            variant="outline" 
            onClick={downloadPerformanceSummary}
            className="flex items-center gap-2"
          >
            <Download size={16} /> Export Data
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="testcases">Test Results</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="testcases">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Showing {combinedTestResults.length} test events from client and server
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : combinedTestResults.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No test results available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-2 text-left">ID</th>
                          <th className="px-4 py-2 text-left">Component</th>
                          <th className="px-4 py-2 text-left">Action</th>
                          <th className="px-4 py-2 text-left">Result</th>
                          <th className="px-4 py-2 text-left">Time</th>
                          <th className="px-4 py-2 text-left">Duration</th>
                          <th className="px-4 py-2 text-left">Source</th>
                          <th className="px-4 py-2 text-left">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {combinedTestResults.map((test, index) => (
                          <tr key={index} className={test.result ? 'bg-green-50' : 'bg-red-50'}>
                            <td className="px-4 py-2">{test.id}</td>
                            <td className="px-4 py-2">{test.component}</td>
                            <td className="px-4 py-2">{test.action}</td>
                            <td className="px-4 py-2">
                              {test.result ? (
                                <span className="inline-flex items-center text-green-600">
                                  <CheckCircle size={16} className="mr-1" /> Pass
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-red-600">
                                  <XCircle size={16} className="mr-1" /> Fail
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs">{formatTime(test.timestamp)}</td>
                            <td className="px-4 py-2">
                              {test.duration ? (
                                <span className="inline-flex items-center">
                                  <Clock size={16} className="mr-1" /> {formatDuration(test.duration)}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${test.source === 'client' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {test.source}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs">
                              {test.details ? (
                                <pre className="max-w-xs truncate">
                                  {JSON.stringify(test.details)}
                                </pre>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance measurements for key operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientTimings.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No performance metrics available yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-left">Operation</th>
                          <th className="px-4 py-2 text-left">Duration</th>
                          <th className="px-4 py-2 text-left">Time</th>
                          <th className="px-4 py-2 text-left">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {clientTimings.map((timing, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="px-4 py-2">{timing.category}</td>
                            <td className="px-4 py-2">{timing.name}</td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center">
                                <Clock size={16} className="mr-1" /> {formatDuration(timing.duration)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs">{formatTime(timing.timestamp)}</td>
                            <td className="px-4 py-2 text-xs">
                              {timing.details ? (
                                <pre className="max-w-xs truncate">
                                  {JSON.stringify(timing.details)}
                                </pre>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary by Category</CardTitle>
                <CardDescription>
                  Aggregated performance statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(clientPerformanceSummary).length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No performance summary available yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(clientPerformanceSummary).map(([category, stats]: [string, any]) => (
                      <Card key={category} className="overflow-hidden">
                        <CardHeader className="bg-muted/50">
                          <CardTitle className="text-lg">{category}</CardTitle>
                          <CardDescription>
                            {stats.operations} operations · {formatDuration(stats.totalDuration)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-sm">
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>Avg Duration:</div>
                              <div className="font-medium">{formatDuration(stats.avgDuration)}</div>
                              <div>Min Duration:</div>
                              <div className="font-medium">{formatDuration(stats.minDuration)}</div>
                              <div>Max Duration:</div>
                              <div className="font-medium">{formatDuration(stats.maxDuration)}</div>
                            </div>
                            
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">Operations</h4>
                              <div className="space-y-1">
                                {Object.entries(stats.operationBreakdown).map(([op, opStats]: [string, any]) => (
                                  <div key={op} className="text-xs grid grid-cols-[1fr,auto] gap-2">
                                    <div className="truncate">{op}</div>
                                    <div className="font-medium">{formatDuration(opStats.avgDuration)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Test Summary</CardTitle>
                <CardDescription>
                  Overall test results from the server
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !serverSummary ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No test summary available
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Total Tests</div>
                        <div className="text-3xl font-bold">{serverSummary.totalTests}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Passed Tests</div>
                        <div className="text-3xl font-bold text-green-600">{serverSummary.passedTests}</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Failed Tests</div>
                        <div className="text-3xl font-bold text-red-600">{serverSummary.failedTests}</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-muted-foreground">Pass Rate</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {serverSummary.totalTests === 0 ? '0%' : 
                            Math.round((serverSummary.passedTests / serverSummary.totalTests) * 100) + '%'}
                        </div>
                      </div>
                    </div>
                    
                    {serverSummary.testsByComponent && Object.keys(serverSummary.testsByComponent).length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">Results by Component</h3>
                        <div className="space-y-2">
                          {Object.entries(serverSummary.testsByComponent).map(([component, stats]: [string, any]) => (
                            <div key={component} className="bg-muted/30 p-3 rounded-md">
                              <div className="flex justify-between items-center">
                                <div className="font-medium">{component}</div>
                                <div className="text-sm">
                                  <span className="text-green-600 font-medium">{stats.passed}</span>
                                  <span className="mx-1">/</span>
                                  <span className="text-muted-foreground">{stats.total}</span>
                                  <span className="ml-2 text-blue-600">
                                    ({Math.round((stats.passed / Math.max(1, stats.total)) * 100)}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Client Test Summary</CardTitle>
                <CardDescription>
                  Performance and test metrics from the browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Total Tests</div>
                      <div className="text-3xl font-bold">{clientLogs.length}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Passed Tests</div>
                      <div className="text-3xl font-bold text-green-600">
                        {clientLogs.filter(log => log.result).length}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Failed Tests</div>
                      <div className="text-3xl font-bold text-red-600">
                        {clientLogs.filter(log => !log.result).length}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Pass Rate</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {clientLogs.length === 0 ? '0%' : 
                          Math.round((clientLogs.filter(log => log.result).length / clientLogs.length) * 100) + '%'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Performance Overview</h3>
                    <div className="space-y-2">
                      {Object.keys(clientPerformanceSummary).length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No performance data available
                        </div>
                      ) : (
                        Object.entries(clientPerformanceSummary).map(([category, stats]: [string, any]) => (
                          <div key={category} className="bg-muted/30 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">{category}</div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">{stats.operations} operations</span>
                                <span className="ml-2">{formatDuration(stats.avgDuration)} avg</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}