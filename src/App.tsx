
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/hooks/useAuthOptimized';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingScreen } from '@/components/common/LoadingScreen';

// Direct imports instead of lazy loading to fix default export issues
import { AuthPage } from '@/components/auth/AuthPage';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AdminDashboardOptimized } from '@/components/admin/AdminDashboardOptimized';

const AppContent = () => {
  const { user, loading, signOut, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            isAdmin ? (
              <AdminDashboardOptimized onLogout={signOut} />
            ) : (
              <UserDashboard 
                user={{
                  id: user.id,
                  company_name: user.user_metadata?.company_name || 'My Company',
                  website_url: user.user_metadata?.website_url || 'https://example.com'
                }}
                onLogout={signOut}
              />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <AppContent />
          <Toaster />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
