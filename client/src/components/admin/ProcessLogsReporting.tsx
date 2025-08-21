import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, FileText, Activity, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ProcessLog {
  id: number;
  userId: number;
  category: string;
  processType: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  outcome: string;
  processingTimeMs: number | null;
  processingStage: string | null;
  reasonForFailure: string | null;
  correctiveActions: string | null;
  expectedRecords: number | null;
  actualRecords: number | null;
  patientsExpected: number | null;
  patientsActual: number | null;
  notesExpected: number | null;
  notesActual: number | null;
  extractedSymptoms: number | null;
  memoryUsageMB: number | null;
  cpuUsagePercent: number | null;
  networkLatencyMs: number | null;
  diskUsageMB: number | null;
  clientInfo: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  emailSentTimestamp: Date | null;
  emailDeliveryStatus: string | null;
  emailFailureReason: string | null;
  retryAttempts: number | null;
  systemLoad: number | null;
  databaseQueryTime: number | null;
  apiResponseTime: number | null;
  errorCode: string | null;
  performanceMetrics: unknown;
  additionalMetadata: unknown;
  createdAt: Date | null;
}

interface ProcessLogsSummary {
  totalProcesses: number;
  successRate: number;
  averageProcessingTime: number;
  categoryBreakdown: Record<string, number>;
  outcomeBreakdown: Record<string, number>;
  recentActivity: ProcessLog[];
}

interface EmailLog {
  id: number;
  userId: number;
  emailType: string;
  recipient: string;
  subject: string;
  deliveryStatus: string;
  sentAt: Date;
  deliveredAt: Date | null;
  failureReason: string | null;
  retryAttempts: number;
  emailContent: string | null;
  attachments: unknown;
  metadata: unknown;
}

export default function ProcessLogsReporting() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    category: "",
    outcome: "",
    startDate: "",
    endDate: "",
  });

  const [emailFilters, setEmailFilters] = useState({
    page: 1,
    limit: 50,
    emailType: "",
    deliveryStatus: "",
    startDate: "",
    endDate: "",
  });

  // Process logs query
  const { data: processLogsData, isLoading: processLogsLoading, refetch: refetchProcessLogs } = useQuery({
    queryKey: ["/api/admin/process-logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const response = await fetch(`/api/admin/process-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch process logs");
      return response.json() as Promise<{ logs: ProcessLog[]; total: number }>;
    },
  });

  // Process logs summary query
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/admin/process-logs/summary", filters.startDate, filters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      
      const response = await fetch(`/api/admin/process-logs/summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json() as Promise<ProcessLogsSummary>;
    },
  });

  // Email logs query
  const { data: emailLogsData, isLoading: emailLogsLoading, refetch: refetchEmailLogs } = useQuery({
    queryKey: ["/api/admin/email-logs", emailFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(emailFilters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const response = await fetch(`/api/admin/email-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch email logs");
      return response.json() as Promise<{ logs: EmailLog[]; total: number }>;
    },
  });

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getOutcomeBadgeVariant = (outcome: string) => {
    switch (outcome) {
      case "success": return "default";
      case "failure": return "destructive";
      case "partial_success": return "secondary";
      default: return "outline";
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "success": return <CheckCircle className="h-4 w-4" />;
      case "failure": return <XCircle className="h-4 w-4" />;
      case "partial_success": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Performance Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of upload and processing activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchProcessLogs();
              refetchEmailLogs();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="process-logs">Process Logs</TabsTrigger>
          <TabsTrigger value="email-logs">Email Notifications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {summaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryData?.totalProcesses || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryData?.successRate.toFixed(1) || 0}%</div>
                    <Progress value={summaryData?.successRate || 0} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatDuration(summaryData?.averageProcessingTime || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryData?.recentActivity.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Last 10 processes</p>
                  </CardContent>
                </Card>
              </div>

              {summaryData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Process Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(summaryData.categoryBreakdown).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center">
                            <span className="text-sm capitalize">{category.replace("_", " ")}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Process Outcomes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(summaryData.outcomeBreakdown).map(([outcome, count]) => (
                          <div key={outcome} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {getOutcomeIcon(outcome)}
                              <span className="text-sm capitalize">{outcome.replace("_", " ")}</span>
                            </div>
                            <Badge variant={getOutcomeBadgeVariant(outcome)}>{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="process-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Logs Filters</CardTitle>
              <CardDescription>Filter and search through system process logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                    <SelectItem value="pre_processing">Pre-processing</SelectItem>
                    <SelectItem value="extraction">Extraction</SelectItem>
                    <SelectItem value="search">Search</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.outcome}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, outcome: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Outcomes</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="partial_success">Partial Success</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                />

                <Input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                />

                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    page: 1,
                    limit: 50,
                    category: "",
                    outcome: "",
                    startDate: "",
                    endDate: "",
                  })}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Process Logs</CardTitle>
              <CardDescription>
                {processLogsData?.total || 0} total records found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processLogsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processLogsData?.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="text-sm">
                              {log.createdAt ? format(new Date(log.createdAt), "MMM dd, HH:mm") : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {log.fileName || "N/A"}
                              </div>
                              {log.fileSize && (
                                <div className="text-xs text-muted-foreground">
                                  {formatFileSize(log.fileSize)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getOutcomeBadgeVariant(log.outcome)}>
                              <div className="flex items-center gap-1">
                                {getOutcomeIcon(log.outcome)}
                                {log.outcome}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDuration(log.processingTimeMs)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Expected: {log.expectedRecords || "N/A"}</div>
                              <div>Actual: {log.actualRecords || "N/A"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {log.memoryUsageMB && (
                                <div>Memory: {log.memoryUsageMB}MB</div>
                              )}
                              {log.cpuUsagePercent && (
                                <div>CPU: {log.cpuUsagePercent}%</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Track all email notifications sent by the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Select
                  value={emailFilters.emailType}
                  onValueChange={(value) => setEmailFilters(prev => ({ ...prev, emailType: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Email Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="upload_complete">Upload Complete</SelectItem>
                    <SelectItem value="processing_complete">Processing Complete</SelectItem>
                    <SelectItem value="error_alert">Error Alert</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={emailFilters.deliveryStatus}
                  onValueChange={(value) => setEmailFilters(prev => ({ ...prev, deliveryStatus: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Start Date"
                  value={emailFilters.startDate}
                  onChange={(e) => setEmailFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                />

                <Input
                  type="date"
                  placeholder="End Date"
                  value={emailFilters.endDate}
                  onChange={(e) => setEmailFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                />
              </div>

              {emailLogsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogsData?.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.sentAt), "MMM dd, HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.emailType}</Badge>
                          </TableCell>
                          <TableCell>{log.recipient}</TableCell>
                          <TableCell>{log.subject}</TableCell>
                          <TableCell>
                            <Badge variant={log.deliveryStatus === "delivered" ? "default" : 
                                          log.deliveryStatus === "failed" ? "destructive" : "secondary"}>
                              {log.deliveryStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.deliveredAt ? format(new Date(log.deliveredAt), "MMM dd, HH:mm:ss") : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed analysis of system performance trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Advanced analytics and trend visualization coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}