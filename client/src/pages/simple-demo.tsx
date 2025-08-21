import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";

export default function SimpleDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">DatabaseStatsWidget Demo</h1>
        
        {/* Your DatabaseStatsWidget in action */}
        <DatabaseStatsWidget />
        
        <div className="mt-8 p-4 bg-white rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">What you're seeing:</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• <strong>398,676 Records</strong> - Total healthcare records in your dataset</li>
            <li>• <strong>5,124 Patients</strong> - Unique patients tracked</li>
            <li>• <strong>3,855 Symptoms</strong> - Distinct symptoms identified</li>
            <li>• <strong>Status: Ready</strong> - System is operational</li>
            <li>• <strong>File Info</strong> - Click the dropdown arrow to see source files</li>
          </ul>
        </div>
      </div>
    </div>
  );
}