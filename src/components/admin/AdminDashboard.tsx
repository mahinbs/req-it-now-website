
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { RequirementsList } from './RequirementsList';
import { AnalyticsCards } from './AnalyticsCards';
import { ChatModal } from './ChatModal';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
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
  const { requirements, loading, refreshing, error, setError, handleRefresh } = useAdminDashboard();

  const handleLogout = async () => {
    try {
      console.log('Admin logout triggered');
      await onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
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
        onRefresh={handleRefresh}
        onLogout={handleLogout}
        refreshing={refreshing}
      />

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <Tabs defaultValue="requirements" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="requirements" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              All Requirements ({requirements.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-6">
            <RequirementsList
              requirements={requirements}
              onChatClick={setSelectedRequirement}
              onDownloadAttachment={handleDownloadAttachment}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsCards requirements={requirements} />
          </TabsContent>
        </Tabs>

        <ChatModal
          requirement={selectedRequirement}
          onClose={() => setSelectedRequirement(null)}
        />
      </div>
    </div>
  );
};
