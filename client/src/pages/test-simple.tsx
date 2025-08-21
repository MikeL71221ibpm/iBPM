import React from 'react';

export default function TestSimple() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Healthcare Analytics Platform
        </h1>
        <p className="text-gray-600 mb-6">
          System is running and ready for file uploads
        </p>
        <div className="space-y-4">
          <div className="bg-green-100 p-4 rounded-lg">
            <p className="text-green-800 font-medium">✓ Server Connected</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg">
            <p className="text-blue-800 font-medium">Ready for Upload</p>
          </div>
        </div>
      </div>
    </div>
  );
}