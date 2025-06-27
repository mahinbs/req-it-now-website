
import React from 'react';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AuthPage } from '@/components/auth/AuthPage';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuth } from '@/hooks/useAuthOptimized';

export const RequirementsManagement = () => {
  const { user, loading, signOut, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  if (isAdmin) {
    return <AdminDashboard onLogout={signOut} />;
  }

  return (
    <UserDashboard 
      user={{
        id: user.id,
        company_name: user.user_metadata?.company_name || 'My Company',
        website_url: user.user_metadata?.website_url || 'https://example.com'
      }}
      onLogout={signOut}
    />
  );
};
