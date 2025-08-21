import React from 'react';

export default function TestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Application Test Page</h1>
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        ✅ Application is loading correctly
      </div>
      <p className="text-lg mb-4">If you can see this page, the React application is working properly.</p>
      <div className="space-y-2">
        <p><strong>Next steps:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Navigate to <a href="/upload" className="text-blue-600 underline">/upload</a> to test file upload</li>
          <li>Check database statistics</li>
          <li>Verify all processes are reset</li>
        </ul>
      </div>
    </div>
  );
}