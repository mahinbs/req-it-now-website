
import React from 'react';

interface LoadingScreenProps {
  error?: string | null;
}

export const LoadingScreen = ({ error }: LoadingScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm max-w-md">
            {error}
            <button 
              onClick={() => window.location.reload()} 
              className="ml-2 underline hover:no-underline"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
