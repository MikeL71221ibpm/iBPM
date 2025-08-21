import { useState, useEffect } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Database, FileText, Users, ChevronDown, ChevronRight, Activity } from 'lucide-react';

interface DatabaseStats {
  patientCount: number;
  noteCount: number;
  symptomCount: number;
  processedNotesCount: number;
  processingStatus: {
    status: string;
    progress: number;
    message: string;
  };
}

interface FileInfo {
  uploadedFileName: string;
  uploadedFilePath: string;
  activeFileName: string;
  activeFilePath: string;
  uploadDate: string;
  fileSize: number;
}

interface DatabaseStatsWidgetProps {
  patientCount?: number;
  noteCount?: number;
  symptomCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
  showRefreshButton?: boolean;
  compact?: boolean;
  // Props for filtered data display
  filteredRecords?: number;
  filteredPatients?: number;
  currentFile?: string;
  showRunAnalysis?: boolean;
  onRunAnalysis?: () => void;
  isAnalysisLoading?: boolean;
  disabled?: boolean;
}

export default function DatabaseStatsWidget({ 
  patientCount,
  noteCount,
  symptomCount,
  onRefresh = () => {},
  isRefreshing,
  className = "", 
  showRefreshButton = true,
  compact = false 
}: DatabaseStatsWidgetProps) {
  const { toast } = useToast();
  
  // Use props if provided, otherwise use API data
  const [stats, setStats] = useState<DatabaseStats>({
    patientCount: patientCount || 0,
    noteCount: noteCount || 0,
    symptomCount: symptomCount || 0,
    processedNotesCount: noteCount || 0,
    processingStatus: {
      status: "pending",
      progress: 0,
      message: "Loading real-time data..."
    }
  });
  
  // Update stats when props change
  useEffect(() => {
    if (patientCount !== undefined || noteCount !== undefined || symptomCount !== undefined) {
      setStats(prev => ({
        ...prev,
        patientCount: patientCount || prev.patientCount,
        noteCount: noteCount || prev.noteCount,
        symptomCount: symptomCount || prev.symptomCount,
        processedNotesCount: noteCount || prev.processedNotesCount
      }));
    }
  }, [patientCount, noteCount, symptomCount]);
  
  const [fileInfo, setFileInfo] = useState<FileInfo>({
    uploadedFileName: "Loading...",
    uploadedFilePath: "/uploads/...",
    activeFileName: "Loading...",
    activeFilePath: "/data/...",
    uploadDate: "Loading...",
    fileSize: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFileInfoExpanded, setIsFileInfoExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [lastProcessingStatus, setLastProcessingStatus] = useState<string>('');

  const fetchStats = async (isManualRefresh = false) => {
    setError(null);
    
    try {
      // Fetch database stats using same approach as upload page (working)
      const response = await fetch('/api/database-stats', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch database statistics');
      }
      
      const data = await response.json();
      
      const newProcessingStatus = data.processingStatus || {
        status: "pending",
        progress: 0,
        message: "Ready for new extraction"
      };

      // Monitor for extraction failures and show persistent toast notification
      if (newProcessingStatus.status === "failed" && lastProcessingStatus !== "failed") {
        toast({
          title: "⚠️ Extraction Failed",
          description: newProcessingStatus.message || "Symptom extraction encountered an error",
          variant: "destructive",
          duration: Infinity, // Stays until user dismisses
        });
      }

      // Update the tracking state
      setLastProcessingStatus(newProcessingStatus.status);

      setStats({
        patientCount: data.patientCount ?? 0,
        noteCount: data.noteCount ?? 0,
        symptomCount: data.symptomCount ?? 0,
        processedNotesCount: data.processedNotesCount ?? 0,
        processingStatus: newProcessingStatus
      });
      
      // Don't control spinner here - it's handled by the button click with timeout

      // Fetch real file information using same approach as database stats
      try {
        const fileResponse = await fetch('/api/file-info', {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!fileResponse.ok) {
          console.log('⚠️ File info API not available, using database stats for file info');
          throw new Error('File info API unavailable');
        }
        
        const fileData = await fileResponse.json();
        
        // Always prefer API data if available, otherwise use database stats
        setFileInfo({
          uploadedFileName: fileData.originalFilename || (data.lastFile?.filename ? data.lastFile.filename : "Data loaded from system"),
          uploadedFilePath: fileData.uploadedFilePath || "/uploads/",
          activeFileName: fileData.filename || (data.lastFile?.filename ? data.lastFile.filename.replace('.csv', '.json') : "System data file"),
          activeFilePath: fileData.activeFilePath || "/data/",
          uploadDate: fileData.uploadTimestamp ? new Date(fileData.uploadTimestamp).toLocaleString() : 
                     (data.lastFile?.uploadedAt ? new Date(data.lastFile.uploadedAt).toLocaleDateString() + ' at ' + new Date(data.lastFile.uploadedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                      new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})),
          fileSize: fileData.records || data.noteCount || 0
        });
      } catch (fileErr) {
        console.log('📋 File API unavailable, using database stats for file information');
        // Use database stats to populate file information (same as upload page)
        if (data.patientCount > 0 || data.noteCount > 0) {
          const csvFilename = data.lastFile?.filename || "System Data File";
          const jsonFilename = csvFilename !== "System Data File" ? csvFilename.replace('.csv', '.json') : "Processed Data";
          setFileInfo({
            uploadedFileName: csvFilename,
            uploadedFilePath: "/uploads/",
            activeFileName: jsonFilename,
            activeFilePath: "/data/",
            uploadDate: data.lastFile?.uploadedAt ? 
                        new Date(data.lastFile.uploadedAt).toLocaleDateString() + ' at ' + new Date(data.lastFile.uploadedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                        new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            fileSize: data.noteCount || 0
          });
        } else {
          setFileInfo({
            uploadedFileName: "No data available",
            uploadedFilePath: "/uploads/",
            activeFileName: "No data available", 
            activeFilePath: "/data/",
            uploadDate: "Not available",
            fileSize: 0
          });
        }
      }

      setLastUpdated(new Date().toLocaleTimeString());
      console.log('✅ Database stats updated:', data);
      
    } catch (err) {
      console.error('Error fetching database stats:', err);
      setError('Failed to load database statistics');
    } finally {
      // Always stop loading spinner after fetching
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we don't have props data
    if (!patientCount && !noteCount && !symptomCount) {
      fetchStats(false); // Initial load only if no props provided
    }
    
    // Listen for refresh-stats event (triggered by Emergency Reset)
    const handleRefreshStats = () => {
      console.log('📊 Refresh stats event received - fetching latest data');
      fetchStats(false); // Event-triggered, not manual
    };
    
    window.addEventListener('refresh-stats', handleRefreshStats);
    
    // Don't auto-refresh if parent is providing data
    let interval: NodeJS.Timeout | null = null;
    if (!patientCount && !noteCount && !symptomCount) {
      // Only auto-refresh if we're fetching our own data
      interval = setInterval(() => {
        fetchStats(false); // Auto-refresh, not manual
      }, 120000); // 2 minutes
    }
    
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('refresh-stats', handleRefreshStats);
    };
  }, [patientCount, noteCount, symptomCount]);

  if (compact) {
    return (
      <div className={`bg-blue-50 rounded-lg px-2 py-1 flex items-center space-x-3 ${className}`}>
        <div className="bg-blue-100 rounded-lg p-1">
          <div className="flex items-center">
            <Database className="h-3 w-3 text-blue-500 mr-1" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Records</p>
              <p className="text-sm font-bold text-blue-900">
                {stats.noteCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-100 rounded-lg p-1">
          <div className="flex items-center">
            <Users className="h-3 w-3 text-green-500 mr-1" />
            <div>
              <p className="text-xs text-green-600 font-medium">Patients</p>
              <p className="text-sm font-bold text-green-900">
                {stats.patientCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-100 rounded-lg p-1">
          <div className="flex items-center">
            <FileText className="h-3 w-3 text-purple-500 mr-1" />
            <div>
              <p className="text-xs text-purple-600 font-medium">Indicators</p>
              <p className="text-sm font-bold text-purple-900">
                {stats.symptomCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-teal-100 rounded-lg p-1">
          <div className="flex items-center">
            <Activity className="h-3 w-3 text-teal-500 mr-1" />
            <div>
              <p className="text-xs text-teal-600 font-medium">Processed</p>
              <p className="text-sm font-bold text-teal-900">
                {stats.processedNotesCount.toLocaleString()}
                <span className="text-xs font-normal ml-1">
                  ({Math.round((stats.processedNotesCount / stats.noteCount) * 100)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded border shadow-sm min-w-[600px] ${className}`}>
      <div className="p-1">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-xs font-medium text-gray-900 flex items-center">
            <Database className="h-3 w-3 text-blue-500 mr-1" />
            Database Statistics
          </h3>
          {showRefreshButton && (
            <button
              onClick={() => {
                // If parent provided onRefresh, use it; otherwise use internal fetchStats
                if (onRefresh) {
                  onRefresh();
                } else {
                  setIsLoading(true);
                  fetchStats(true);
                  // Stop spinner after 3 seconds
                  setTimeout(() => setIsLoading(false), 3000);
                }
              }}
              disabled={isRefreshing !== undefined ? isRefreshing : isLoading}
              className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-800 transition-colors rounded hover:bg-gray-50 text-xs font-medium"
              title="Refresh Statistics"
            >
              {(isRefreshing !== undefined ? isRefreshing : isLoading) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing Data</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-1 p-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Statistics and File Info - Same Row */}
        <div className="flex items-center justify-between mb-0.5">
          {/* Statistics */}
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 rounded p-0.5">
              <div className="flex items-center">
                <Database className="h-3 w-3 text-blue-500 mr-0.5" />
                <div>
                  <p className="text-xs text-blue-600 font-medium">Records</p>
                  <p className="text-sm font-bold text-blue-900">
                    {stats.noteCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-100 rounded p-0.5">
              <div className="flex items-center">
                <Users className="h-3 w-3 text-green-500 mr-0.5" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Patients</p>
                  <p className="text-sm font-bold text-green-900">
                    {stats.patientCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-100 rounded p-0.5">
              <div className="flex items-center">
                <FileText className="h-3 w-3 text-purple-500 mr-0.5" />
                <div>
                  <p className="text-xs text-purple-600 font-medium">Indicators</p>
                  <p className="text-sm font-bold text-purple-900">
                    {stats.symptomCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-teal-100 rounded p-0.5">
              <div className="flex items-center">
                <Activity className="h-3 w-3 text-teal-500 mr-0.5" />
                <div>
                  <p className="text-xs text-teal-600 font-medium">Processed</p>
                  <p className="text-sm font-bold text-teal-900">
                    {stats.processedNotesCount.toLocaleString()} <span className="text-xs">({stats.noteCount > 0 ? Math.round((stats.processedNotesCount / stats.noteCount) * 100) : 0}%)</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-100 rounded p-0.5">
              <div className="flex items-center">
                <FileText className="h-3 w-3 text-orange-500 mr-0.5" />
                <div>
                  <p className="text-xs text-orange-600 font-medium">Records/Patient</p>
                  <p className="text-sm font-bold text-orange-900">
                    {(stats.noteCount / stats.patientCount).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded p-0.5">
              <div>
                <p className="text-xs text-gray-600 font-medium">Updated</p>
                <p className="text-xs font-bold text-gray-900">
                  {lastUpdated || 'Loading...'}
                </p>
              </div>
            </div>
          </div>

          {/* File Information - Inline */}
          <div className="flex items-center">
            <div 
              className="flex items-center cursor-pointer hover:bg-gray-50 rounded p-0.5"
              onClick={() => setIsFileInfoExpanded(!isFileInfoExpanded)}
            >
              {isFileInfoExpanded ? (
                <ChevronDown className="h-3 w-3 text-gray-500 mr-0.5" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-500 mr-0.5" />
              )}
              <h4 className="text-xs font-medium text-gray-900">File Information</h4>
            </div>
          </div>
        </div>
          
        {/* Expandable File Details */}
        {isFileInfoExpanded && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-gray-50 rounded p-1">
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700">Uploaded File</p>
                  <p className="text-xs text-gray-900 font-mono truncate">{fileInfo.uploadedFileName}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded ml-1 shrink-0">
                  {fileInfo.uploadDate}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded p-1">
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700">Active File</p>
                  <p className="text-xs text-gray-900 font-mono truncate">{fileInfo.activeFileName}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded ml-1 shrink-0">
                  In Use
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex items-center text-green-600">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
            <span>System Ready • Data Loaded</span>
          </div>
          <span className="text-gray-500">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}