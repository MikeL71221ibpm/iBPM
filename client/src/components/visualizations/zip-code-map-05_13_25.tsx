import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ZipCodeMapProps {
  title: string;
  categoryName: string;
  data?: any[];
  filterBy?: any;
}

interface ZipCodeData {
  zipCode: string;
  count: number;
  percentage: number;
  affected: number;
  total: number;
}

const ZipCodeMap = ({ title, categoryName, data = [], filterBy }: ZipCodeMapProps) => {
  const [zipCodeData, setZipCodeData] = useState<ZipCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if a patient is affected by the specific HRSN category
  const checkHrsnAffected = (patient: any, category: string): boolean => {
    // Map category names to patient fields or check extracted symptoms
    switch (category) {
      case 'housing_insecurity':
        return patient.housing_status === 'Problem' || patient.housing_insecurity === true;
      case 'food_insecurity':
        return patient.food_status === 'Problem' || patient.food_insecurity === true;
      case 'financial_strain':
        return patient.financial_status === 'Problem' || patient.financial_strain === true;
      case 'access_to_transportation':
        return patient.transportation === 'Problem' || patient.access_to_transportation === true;
      case 'has_a_car':
        return patient.has_a_car === true || patient.transportation_car === 'Yes';
      default:
        // For other categories, check if any symptoms match
        return patient[category] === true || patient[category] === 'Problem';
    }
  };

  // Process zip code data from the provided data prop
  const processedZipCodeData = useMemo(() => {
    if (!data || data.length === 0) return [];

    console.log(`🗺️ Processing zip code data for ${categoryName}:`, data);

    // Group data by zip code and calculate statistics
    const zipCodeMap = new Map<string, { affected: number; total: number }>();

    data.forEach(item => {
      if (item.zip_code && item.zip_code !== 'Unknown') {
        const zipCode = item.zip_code.toString();
        const current = zipCodeMap.get(zipCode) || { affected: 0, total: 0 };

        current.total += 1;

        // Check if this patient is affected by the HRSN category
        const isAffected = checkHrsnAffected(item, categoryName);
        if (isAffected) {
          current.affected += 1;
        }

        zipCodeMap.set(zipCode, current);
      }
    });

    // Convert to array and calculate percentages
    const processedData: ZipCodeData[] = Array.from(zipCodeMap.entries())
      .map(([zipCode, stats]) => ({
        zipCode,
        count: stats.total,
        affected: stats.affected,
        total: stats.total,
        percentage: stats.total > 0 ? Math.round((stats.affected / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.affected - a.affected) // Sort by affected count
      .slice(0, 15); // Show top 15 zip codes

    console.log(`🗺️ Processed ${processedData.length} zip codes for ${categoryName}`);
    return processedData;
  }, [data, categoryName]);

  // Generate color intensity based on percentage
  const getColorIntensity = (percentage: number): string => {
    if (percentage === 0) return '#f8f9fa';
    if (percentage <= 10) return '#e3f2fd';
    if (percentage <= 25) return '#bbdefb';
    if (percentage <= 50) return '#64b5f6';
    if (percentage <= 75) return '#2196f3';
    return '#1565c0';
  };

  useEffect(() => {
    setZipCodeData(processedZipCodeData);
    setIsLoading(false);
  }, [processedZipCodeData]);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-80 bg-neutral-50 text-neutral-400 rounded-md">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <div className="mt-2">Loading geographic data...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-80 bg-red-50 text-red-400 rounded-md">
            <div className="text-center">
              <div className="text-red-600 font-semibold">Error Loading Map</div>
              <div className="text-red-500 text-sm mt-1">{error}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (zipCodeData.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-80 bg-neutral-50 text-neutral-400 rounded-md">
            <div className="text-center">
              <div className="text-neutral-600 font-semibold">No Geographic Data</div>
              <div className="text-neutral-500 text-sm mt-1">
                No zip code data available for {categoryName}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxAffected = Math.max(...zipCodeData.map(d => d.affected));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <span className="text-sm font-normal text-gray-500">
            Top {zipCodeData.length} Zip Codes
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Geographic Heat Map Visualization */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {zipCodeData.map((zipData, index) => (
              <div
                key={zipData.zipCode}
                className="relative p-3 rounded-lg border text-center transition-all duration-200 hover:shadow-md hover:scale-105"
                style={{
                  backgroundColor: getColorIntensity(zipData.percentage),
                  borderColor: zipData.affected === maxAffected ? '#1565c0' : '#e0e0e0',
                  borderWidth: zipData.affected === maxAffected ? '2px' : '1px'
                }}
              >
                <div className="text-sm font-bold text-gray-800">
                  {zipData.zipCode}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {zipData.affected}/{zipData.total}
                </div>
                <div className="text-xs font-semibold text-gray-700">
                  {zipData.percentage}%
                </div>
                {zipData.affected === maxAffected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-semibold text-gray-700 mb-2">Legend</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 rounded border"></div>
                <span className="text-xs text-gray-600">0%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-200 rounded border"></div>
                <span className="text-xs text-gray-600">1-25%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-400 rounded border"></div>
                <span className="text-xs text-gray-600">26-50%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded border"></div>
                <span className="text-xs text-gray-600">51-75%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-800 rounded border"></div>
                <span className="text-xs text-gray-600">76-100%</span>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-2 bg-blue-50 rounded">
              <div className="text-xs text-blue-600">Total Zip Codes</div>
              <div className="text-lg font-bold text-blue-800">{zipCodeData.length}</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="text-xs text-green-600">Total Patients</div>
              <div className="text-lg font-bold text-green-800">
                {zipCodeData.reduce((sum, d) => sum + d.total, 0)}
              </div>
            </div>
            <div className="p-2 bg-orange-50 rounded">
              <div className="text-xs text-orange-600">Affected Patients</div>
              <div className="text-lg font-bold text-orange-800">
                {zipCodeData.reduce((sum, d) => sum + d.affected, 0)}
              </div>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <div className="text-xs text-purple-600">Avg. Rate</div>
              <div className="text-lg font-bold text-purple-800">
                {Math.round(
                  zipCodeData.reduce((sum, d) => sum + d.percentage, 0) / zipCodeData.length
                )}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { ZipCodeMap };
export default ZipCodeMap;