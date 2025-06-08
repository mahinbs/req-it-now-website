
import React from 'react';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AuthPage } from '@/components/auth/AuthPage';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuth } from '@/hooks/useAuth';

export const RequirementsManagement = () => {
  const {
    user,
    userProfile,
    loading,
    error,
    setError,
    handleLogin,
    handleSignup,
    handleLogout
  } = useAuth();

  if (loading) {
    return <LoadingScreen error={error} />;
  }

  if (user && userProfile) {
    if (userProfile.isAdmin) {
      return <AdminDashboard onLogout={handleLogout} />;
    } else {
      return <UserDashboard user={userProfile} onLogout={handleLogout} />;
    }
  }

  return (
    <AuthPage
      onLogin={handleLogin}
      onSignup={handleSignup}
      error={error}
      setError={setError}
    />
  );
};
