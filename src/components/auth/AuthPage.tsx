
import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (userData: {
    email: string;
    password: string;
    companyName: string;
    websiteUrl: string;
  }) => Promise<void>;
  error: string | null;
  setError: (error: string | null) => void;
}

export const AuthPage = ({ onLogin, onSignup, error, setError }: AuthPageProps) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Website Requirements
          </h1>
          <p className="text-gray-600">
            Manage your website changes and requirements efficiently
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {authMode === 'login' ? (
          <LoginForm
            onLogin={onLogin}
            onSwitchToSignup={() => setAuthMode('signup')}
          />
        ) : (
          <SignupForm
            onSignup={onSignup}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="text-green-600 font-medium">✅ Ready to submit requirements!</p>
          <p>Create your account and start submitting website changes</p>
        </div>
      </div>
    </div>
  );
};
