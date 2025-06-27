
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Bell, BarChart3, Users, Zap } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-red-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 animated-gradient opacity-10"></div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-purple-400 border-r-red-400 mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-400 border-r-purple-400 animate-ping"></div>
          </div>
          <p className="text-2xl font-bold text-white font-space-grotesk">Loading admin dashboard...</p>
          <p className="mt-2 text-slate-300">Preparing your command center</p>
          {error && (
            <div className="mt-6 glass p-4 border border-red-400/30 rounded-xl text-red-200 max-w-md mx-auto">
              {error}
              <button 
                onClick={() => window.location.reload()} 
                className="ml-2 text-red-300 underline hover:no-underline"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-red-900 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 animated-gradient opacity-5"></div>
      
      <AdminDashboardHeader 
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {(error || notificationError) && (
          <div className="mb-6 glass p-4 border border-red-400/30 rounded-xl text-red-200 animate-fade-in">
            {error || notificationError}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-red-300 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <h1 className="text-3xl font-bold text-white font-space-grotesk">Admin Command Center</h1>
            <div className="flex items-center space-x-4">
              {/* Enhanced notification status indicator */}
              <div className="glass px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-3">
                <Bell className={`h-5 w-5 ${hasNewMessage ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-sm text-slate-200 font-medium">
                  {totalUnreadCount > 0 ? `${totalUnreadCount} unread` : 'No new messages'}
                </span>
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 pulse-neon' : 'bg-orange-400 animate-pulse'}`} 
                     title={connected ? 'Connected' : 'Reconnecting...'} />
              </div>
              
              <Button
                onClick={handleRefreshNotifications}
                variant="outline"
                size="sm"
                className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <Bell className="h-4 w-4 mr-2 relative z-10" />
                <span className="relative z-10">Refresh Notifications</span>
              </Button>
              
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <RefreshCw className={`h-4 w-4 mr-2 relative z-10 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="relative z-10">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-2">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-xl rounded-xl transition-all duration-300 font-medium text-slate-200 hover:text-white"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="requirements" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl rounded-xl transition-all duration-300 font-medium text-slate-200 hover:text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Requirements ({requirements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="scale-in">
              <AnalyticsCards requirements={requirements} />
            </div>
            
            <div className="glass bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Zap className="h-6 w-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white font-space-grotesk">Recent Requirements</h2>
              </div>
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

          <TabsContent value="requirements" className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <h2 className="text-2xl font-bold text-white font-space-grotesk">All Requirements</h2>
              {requirements.length > 0 && (
                <RequirementsFilter 
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              )}
            </div>
            
            <div className="scale-in">
              <RequirementsList
                requirements={filteredRequirements}
                onChatClick={handleChatClick}
                onDownloadAttachment={handleDownloadAttachment}
                onRefresh={handleRefresh}
              />
            </div>
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
