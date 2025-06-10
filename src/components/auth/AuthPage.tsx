
import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { useAuth } from '@/hooks/useAuthOptimized';
import { Logo } from '@/components/ui/logo';

export const AuthPage = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const { signIn, signUp, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    try {
      setError(null);
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleSignup = async (userData: {
    email: string;
    password: string;
    companyName: string;
    websiteUrl: string;
  }) => {
    try {
      setError(null);
      await signUp(userData.email, userData.password, {
        company_name: userData.companyName,
        website_url: userData.websiteUrl
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <Logo size="md" className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            BoostMySites
          </h1>
          <p className="text-slate-600 text-lg">
            Manage your website changes and requirements efficiently
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm shadow-sm animate-in slide-in-from-top duration-300">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p>{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="mt-2 text-red-700 underline hover:no-underline text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auth Forms */}
        {authMode === 'login' ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToSignup={() => setAuthMode('signup')}
            loading={loading}
            error={error}
          />
        ) : (
          <SignupForm
            onSignup={handleSignup}
            onSwitchToLogin={() => setAuthMode('login')}
            loading={loading}
            error={error}
          />
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600 space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <p className="text-green-600 font-medium">Ready to submit requirements!</p>
          </div>
          <p>Create your account and start submitting website changes</p>
        </div>
      </div>
    </div>
  );
};
