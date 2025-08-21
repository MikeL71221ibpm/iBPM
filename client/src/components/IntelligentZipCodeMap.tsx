import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Expand, Download, MapPin, Info, AlertTriangle, Loader2 } from 'lucide-react';
import GeographicChoroplethMap from './GeographicChoroplethMap';

interface Props {
  title: string;
  onExport?: () => void;
  className?: string;
}

interface BoundaryStatus {
  available: number;
  total: number;
  isComplete: boolean;
  isLoading: boolean;
}

export function IntelligentZipCodeMap({ title, onExport, className }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [patientData, setPatientData] = useState<Array<{zipCode: string, count: number}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boundaryStatus, setBoundaryStatus] = useState<BoundaryStatus>({
    available: 0,
    total: 0,
    isComplete: false,
    isLoading: false
  });

  const fetchComprehensiveZipBoundaries = async () => {
    setBoundaryStatus(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch('/api/zip-boundaries/comprehensive');
      if (!response.ok) {
        throw new Error(`Failed to fetch comprehensive boundaries: ${response.status}`);
      }
      const result = await response.json();
      console.log('🗺️ COMPREHENSIVE BOUNDARIES RESULT:', result);

      setBoundaryStatus({
        available: result.boundariesLoaded || 0,
        total: result.totalRequested || 0,
        isComplete: result.success && result.boundariesLoaded > 1000,
        isLoading: false
      });

      return result.success;
    } catch (err) {
      console.error('❌ Error fetching comprehensive boundaries:', err);
      setBoundaryStatus(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const fetchPatientZipData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/zip-codes-summary');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('🗺️ ZIP CODE DATA:', data);

      if (data.success && Array.isArray(data.zipCodes)) {
        setPatientData(data.zipCodes);

        // If we have patient data but boundaries are incomplete, fetch comprehensive boundaries
        if (data.zipCodes.length > 0 && !boundaryStatus.isComplete) {
          await fetchComprehensiveZipBoundaries();
        }
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('❌ Error fetching ZIP code data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ZIP code data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchPatientZipData();
    }
  }, [isExpanded]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1"
          >
            <Expand className="h-4 w-4" />
            Expand
          </Button>
        </div>
      </div>

      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">Geographic ZIP Code Analysis</p>
          <p className="text-xs text-gray-500 mt-1">Click expand to view interactive choropleth map</p>
        </div>
      </div>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {title}
              {boundaryStatus.isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading ZIP code data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-red-600">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Error: {error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchPatientZipData}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Boundary Status Overlay */}
                {!boundaryStatus.isComplete && patientData.length > 0 && (
                  <div className="absolute top-4 right-4 z-10 bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-amber-800">Geographic Coverage Status</p>
                        <p className="text-amber-700 mt-1">
                          {boundaryStatus.isLoading 
                            ? "Loading comprehensive ZIP boundaries..." 
                            : `Boundaries available: ${boundaryStatus.available} of ${patientData.length} patient ZIP codes`
                          }
                        </p>
                        <p className="text-amber-600 mt-1">
                          {boundaryStatus.isLoading 
                            ? "Please wait while we fetch complete US ZIP code boundaries"
                            : "Zoom and pan to explore available regions. Additional boundaries loading automatically."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <GeographicChoroplethMap 
                  data={patientData}
                  title={title}
                  height="100%"
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IntelligentZipCodeMap;