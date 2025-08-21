import { useState, useEffect } from 'react';

interface PivotTableData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

interface PivotResponse {
  success: boolean;
  pivotTable: PivotTableData;
  heatmapData: any[];
  ageRanges: string[];
  categories: string[];
  maxValue: number;
}

export function usePivotData(categoryField: string) {
  const [pivotData, setPivotData] = useState<PivotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPivotData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📡 Fetching pivot data for ${categoryField}...`);
        const response = await fetch(`/api/pivot-heatmap/${categoryField}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ Pivot data received for ${categoryField}:`, {
            categories: data.categories?.length || 0,
            ageRanges: data.ageRanges?.length || 0,
            maxValue: data.maxValue,
            heatmapDataLength: data.heatmapData?.length || 0
          });
          setPivotData(data);
        } else {
          throw new Error(data.message || 'Failed to fetch pivot data');
        }
      } catch (error: any) {
        console.error(`❌ Error fetching pivot data for ${categoryField}:`, error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (categoryField) {
      fetchPivotData();
    }
  }, [categoryField]);

  return { pivotData, loading, error };
}