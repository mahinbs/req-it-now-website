
import React, { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface EnhancedLoadingScreenProps {
  error?: string | null;
  timeout?: number;
  onRetry?: () => void;
  loadingText?: string;
  showProgress?: boolean;
}

export const EnhancedLoadingScreen = ({ 
  error, 
  timeout = 15000,
  onRetry,
  loadingText = "Loading your dashboard...",
  showProgress = true
}: EnhancedLoadingScreenProps) => {
  const [showTimeout, setShowTimeout] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (showProgress && !error && !showTimeout) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [showProgress, error, showTimeout]);

  useEffect(() => {
    if (timeout > 0) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [timeout]);

  const handleRetry = () => {
    setShowTimeout(false);
    setProgress(0);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  if (error || showTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="text-center relative z-10 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6">
            <Logo size="lg" className="w-10 h-10" />
          </div>
          
          <div className="mb-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {error ? 'Something went wrong' : 'Taking longer than expected'}
            </h2>
            <p className="text-slate-600">
              {error || 'The application is taking longer to load than usual.'}
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleRetry} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <p className="text-sm text-slate-500">
              If the problem persists, please refresh the page
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="text-center relative z-10">
        {/* Logo with pulsing animation */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6 animate-pulse">
          <Logo size="lg" className="w-10 h-10" />
        </div>

        {/* Enhanced loading spinner */}
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-ping"></div>
        </div>

        {/* Loading content */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            BoostMySites
          </h2>
          <p className="text-lg font-medium text-slate-700 animate-pulse">
            {loadingText}
          </p>
          
          {showProgress && (
            <div className="w-64 mx-auto">
              <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-500 mt-2">Setting up your workspace...</p>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Initializing secure connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
