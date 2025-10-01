import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/hooks/useAuthOptimized';
import { UnifiedNotificationProvider } from '@/hooks/useUnifiedNotifications';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingScreen } from '@/components/common/LoadingScreen';

// Direct imports instead of lazy loading to fix default export issues
import { AuthPage } from '@/components/auth/AuthPage';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout';
import { RejectRequirementPage } from '@/pages/RejectRequirementPage';
import { AcceptRequirementPage } from '@/pages/AcceptRequirementPage';
import { RequirementDetailPage } from '@/pages/RequirementDetailPage';

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
        {isAdmin ? (
          <>
            <Route 
              path="/" 
              element={<AdminDashboardLayout onLogout={signOut} />} 
            />
            <Route 
              path="/requirements" 
              element={<AdminDashboardLayout onLogout={signOut} />} 
            />
            <Route 
              path="/messages" 
              element={<AdminDashboardLayout onLogout={signOut} />} 
            />
            <Route 
              path="/requirement/:id" 
              element={<RequirementDetailPage />} 
            />
          </>
        ) : (
          <>
            <Route 
              path="/*" 
              element={
                <UserDashboard 
                  user={{
                    id: user.id,
                    company_name: user.user_metadata?.company_name || 'My Company',
                    website_url: user.user_metadata?.website_url || 'https://example.com'
                  }}
                  onLogout={signOut}
                />
              } 
            />
            <Route 
              path="/requirement/:id" 
              element={<RequirementDetailPage />} 
            />
          </>
        )}
        <Route 
          path="/reject-requirement/:id" 
          element={
            !isAdmin ? (
              <RejectRequirementPage />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/accept-requirement/:id" 
          element={
            !isAdmin ? (
              <AcceptRequirementPage />
            ) : (
              <Navigate to="/" replace />
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
        <UnifiedNotificationProvider>
          <div className="min-h-screen bg-background">
            <AppContent />
            <Toaster />
          </div>
        </UnifiedNotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
