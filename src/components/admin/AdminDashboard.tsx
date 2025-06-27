
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Bell } from 'lucide-react';
import { RequirementsList } from './RequirementsList';
import { ChatModal } from './ChatModal';
import { AnalyticsCards } from './AnalyticsCards';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { NotificationDebugger } from './NotificationDebugger';
import { RequirementsFilter, type FilterState } from '@/components/filters/RequirementsFilter';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useUnifiedNotificationContext } from '@/hooks/useUnifiedNotifications';
import { applyFilters } from '@/utils/filterUtils';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterState>({
    dateFilter: 'newest',
    statusFilter: 'all'
  });
  
  const {
    requirements,
    loading,
    refreshing,
    error,
    setError,
    handleRefresh
  } = useAdminDashboard();

  const { 
    markAsRead, 
    refreshNotifications, 
    hasNewMessage, 
    notificationCounts,
    connected,
    error: notificationError 
  } = useUnifiedNotificationContext();

  // Memoized filtered requirements for better performance
  const filteredRequirements = useMemo(() => {
    return applyFilters(requirements, filters.dateFilter, filters.statusFilter);
  }, [requirements, filters.dateFilter, filters.statusFilter]);

  // Memoized recent requirements for overview tab
  const recentRequirements = useMemo(() => {
    return requirements.slice(0, 6);
  }, [requirements]);

  const handleChatClick = (requirement: Requirement) => {
    console.log('Admin opening chat for requirement:', requirement.id);
    setSelectedRequirement(requirement);
  };

  const handleCloseChatModal = () => {
    setSelectedRequirement(null);
  };

  const handleDownloadAttachment = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    try {
      console.log('Admin logout triggered');
      await onLogout();
      toast({
        title: "Success",
        description: "Logged out successfully"
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleRefreshNotifications = async () => {
    try {
      await refreshNotifications();
      toast({
        title: "Refreshed",
        description: "Notifications have been refreshed"
      });
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
      toast({
        title: "Error",
        description: "Failed to refresh notifications",
        variant: "destructive"
      });
    }
  };

  const totalUnreadCount = useMemo(() => {
    return Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
  }, [notificationCounts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading admin dashboard...</p>
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminDashboardHeader 
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="max-w-7xl mx-auto p-6">
        {(error || notificationError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error || notificationError}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-2">
              {/* Notification status indicator */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-white border rounded-lg">
                <Bell className={`h-4 w-4 ${hasNewMessage ? 'text-red-500' : 'text-slate-400'}`} />
                <span className="text-sm text-slate-600">
                  {totalUnreadCount > 0 ? `${totalUnreadCount} unread` : 'No new messages'}
                </span>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-orange-500'}`} 
                     title={connected ? 'Connected' : 'Reconnecting...'} />
              </div>
              
              <Button
                onClick={handleRefreshNotifications}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span>Refresh Notifications</span>
              </Button>
              
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="requirements" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Requirements ({requirements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AnalyticsCards requirements={requirements} />
            
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Requirements</h2>
              <RequirementsList
                requirements={recentRequirements}
                onChatClick={handleChatClick}
                onDownloadAttachment={handleDownloadAttachment}
                onRefresh={handleRefresh}
              />
            </div>

            {/* Debug tool for troubleshooting notifications */}
            <NotificationDebugger />
          </TabsContent>

          <TabsContent value="requirements" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-semibold text-slate-900">All Requirements</h2>
              {requirements.length > 0 && (
                <RequirementsFilter 
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              )}
            </div>
            
            <RequirementsList
              requirements={filteredRequirements}
              onChatClick={handleChatClick}
              onDownloadAttachment={handleDownloadAttachment}
              onRefresh={handleRefresh}
            />
          </TabsContent>
        </Tabs>

        <ChatModal
          requirement={selectedRequirement}
          onClose={handleCloseChatModal}
          onMarkAsRead={markAsRead}
        />
      </div>
    </div>
  );
};
