
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RequirementForm } from '../requirements/RequirementForm';
import { toast } from '@/hooks/use-toast';
import { UserDashboardHeader } from './UserDashboardHeader';
import { WelcomeCard } from './WelcomeCard';
import { RequirementsList } from './RequirementsList';
import { UserModals } from './UserModals';
import { RequirementsFilter, type FilterState } from '@/components/filters/RequirementsFilter';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { applyFilters } from '@/utils/filterUtils';

interface User {
  id: string;
  company_name: string;
  website_url: string;
}

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

export const UserDashboard = ({ user, onLogout }: UserDashboardProps) => {
  const [filters, setFilters] = useState<FilterState>({
    dateFilter: 'newest',
    statusFilter: 'all'
  });

  const {
    showNewRequirement,
    setShowNewRequirement,
    selectedRequirement,
    setSelectedRequirement,
    showGeneralChat,
    setShowGeneralChat,
    requirements,
    loading,
    error,
    setError,
    handleSubmitRequirement,
    handleRequirementUpdate
  } = useUserDashboard(user);

  // Apply filters to requirements
  const filteredRequirements = applyFilters(requirements, filters.dateFilter, filters.statusFilter);

  const handleLogout = async () => {
    try {
      console.log('User logout triggered');
      await onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "❌ Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-ping"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-slate-700">Loading your dashboard...</p>
            <p className="text-sm text-slate-500">Setting up your workspace</p>
          </div>
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm max-w-md mx-auto shadow-sm">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p>{error}</p>
                  <button 
                    onClick={() => setError(null)} 
                    className="mt-2 text-red-700 underline hover:no-underline font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <UserDashboardHeader 
        user={user}
        onShowGeneralChat={() => setShowGeneralChat(true)}
        onLogout={handleLogout}
        isGeneralChatOpen={showGeneralChat}
      />

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 shadow-sm animate-in slide-in-from-top duration-300">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p>{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="mt-2 text-red-700 underline hover:no-underline font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome message for new users */}
        {requirements.length === 0 && (
          <WelcomeCard 
            onShowGeneralChat={() => setShowGeneralChat(true)}
            onShowNewRequirement={() => setShowNewRequirement(true)}
          />
        )}

        <Tabs defaultValue="requirements" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-xl p-1">
            <TabsTrigger 
              value="requirements" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              My Requirements
            </TabsTrigger>
            <TabsTrigger 
              value="new" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              Submit New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-semibold text-slate-900">Your Requirements</h2>
              <div className="flex items-center space-x-3">
                {requirements.length > 0 && (
                  <RequirementsFilter 
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                )}
                <Button 
                  onClick={() => setShowNewRequirement(true)} 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Requirement
                </Button>
              </div>
            </div>

            <RequirementsList 
              requirements={filteredRequirements}
              onSelectRequirement={setSelectedRequirement}
              onShowNewRequirement={() => setShowNewRequirement(true)}
              onRequirementUpdate={handleRequirementUpdate}
            />
          </TabsContent>

          <TabsContent value="new">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6">
              <RequirementForm onSubmit={handleSubmitRequirement} />
            </div>
          </TabsContent>
        </Tabs>

        <UserModals 
          user={user}
          showNewRequirement={showNewRequirement}
          selectedRequirement={selectedRequirement}
          showGeneralChat={showGeneralChat}
          onCloseNewRequirement={() => setShowNewRequirement(false)}
          onCloseRequirementChat={() => setSelectedRequirement(null)}
          onCloseGeneralChat={() => setShowGeneralChat(false)}
          onSubmitRequirement={handleSubmitRequirement}
        />
      </div>
    </div>
  );
};
