import React from 'react';

function TestApp() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Test App - Dashboard Loading Test
      </h1>
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl mb-4">Dashboard Test Status</h2>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>React Loading:</span>
            <span className="text-green-400">✅ Success</span>
          </div>
          <div className="flex justify-between">
            <span>Vite Dev Server:</span>
            <span className="text-green-400">✅ Running on :3001</span>
          </div>
          <div className="flex justify-between">
            <span>Basic Styling:</span>
            <span className="text-green-400">✅ TailwindCSS Working</span>
          </div>
        </div>
        <button 
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          onClick={() => {
            alert('Button works! React is functioning.');
          }}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}

export default TestApp;