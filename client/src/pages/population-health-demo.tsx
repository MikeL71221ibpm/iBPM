import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PopulationHealthDemo() {
  return (
    <div className="px-2 py-2 max-w-[1920px] mx-auto">
      <div className="mb-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1">
          <div>
            <h1 className="text-xl font-bold mb-0">Population Health Analytics</h1>
            <p className="text-gray-600 text-xs">Analyzing HRSN and BH Impact</p>
          </div>
        </div>
        
        {/* Database Stats Widget */}
        <DatabaseStatsWidget />
      </div>

      {/* Sample Content */}
      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Population Health Charts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Your authentic healthcare data context is displayed above:</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              <li>• <strong>398,676 Records</strong> - Total healthcare records in your dataset</li>
              <li>• <strong>5,124 Patients</strong> - Unique patients tracked</li>
              <li>• <strong>3,855 Symptoms</strong> - Distinct symptoms identified</li>
              <li>• <strong>Status: Ready</strong> - System is operational</li>
              <li>• <strong>File Info</strong> - Click the dropdown arrow to see source files</li>
            </ul>
            <p className="mt-4 text-sm text-blue-600 bg-blue-50 p-3 rounded">
              This is exactly how the DatabaseStatsWidget will appear on your Population Health page - 
              providing immediate context about your authentic healthcare dataset while users analyze their data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}