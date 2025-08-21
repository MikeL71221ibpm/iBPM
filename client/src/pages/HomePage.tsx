export default function HomePage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Behavioral Health Analytics Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Welcome to the iBPM Analytics platform. Navigate through the menu to access different sections.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Population Health</h3>
            <p className="text-gray-600 mb-4">Analyze population-wide health trends and patterns.</p>
            <a href="/population-health" className="text-blue-600 hover:text-blue-800 font-medium">
              View Analytics →
            </a>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Patient Search</h3>
            <p className="text-gray-600 mb-4">Search and analyze individual patient data.</p>
            <a href="/search" className="text-blue-600 hover:text-blue-800 font-medium">
              Search Patients →
            </a>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">HRSN Analytics</h3>
            <p className="text-gray-600 mb-4">Health-Related Social Needs analysis and insights.</p>
            <a href="/hrsn" className="text-blue-600 hover:text-blue-800 font-medium">
              View HRSN Data →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}