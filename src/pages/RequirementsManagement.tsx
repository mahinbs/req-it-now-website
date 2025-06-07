
import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

interface User {
  email: string;
  companyName: string;
  websiteUrl: string;
  isAdmin?: boolean;
}

export const RequirementsManagement = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLogin = async (email: string, password: string) => {
    // Simulate authentication
    if (email === 'admin@admin.com' && password === 'admin') {
      setCurrentUser({
        email: 'admin@admin.com',
        companyName: 'Admin',
        websiteUrl: 'https://admin.com',
        isAdmin: true
      });
    } else {
      // Regular user login
      setCurrentUser({
        email: email,
        companyName: 'Demo Company',
        websiteUrl: 'https://democompany.com'
      });
    }
  };

  const handleSignup = async (userData: {
    email: string;
    password: string;
    companyName: string;
    websiteUrl: string;
  }) => {
    // Simulate user registration
    setCurrentUser({
      email: userData.email,
      companyName: userData.companyName,
      websiteUrl: userData.websiteUrl
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (currentUser) {
    if (currentUser.isAdmin) {
      return <AdminDashboard />;
    } else {
      return <UserDashboard user={currentUser} onLogout={handleLogout} />;
    }
  }

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

        {authMode === 'login' ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToSignup={() => setAuthMode('signup')}
          />
        ) : (
          <SignupForm
            onSignup={handleSignup}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Demo credentials:</p>
          <p>Admin: admin@admin.com / admin</p>
          <p>User: any email / any password</p>
        </div>
      </div>
    </div>
  );
};
