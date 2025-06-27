
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 animated-gradient opacity-10"></div>
        
        <div className="text-center space-y-6 relative z-10">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-blue-400 border-r-purple-400 mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-pink-400 animate-ping"></div>
          </div>
          <div className="space-y-3">
            <p className="text-2xl font-bold text-white font-space-grotesk">Loading your dashboard...</p>
            <p className="text-slate-300 font-medium">Setting up your futuristic workspace</p>
          </div>
          {error && (
            <div className="mt-8 glass p-6 border border-red-400/30 rounded-2xl text-red-300 max-w-md mx-auto shadow-2xl">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">{error}</p>
                  <button 
                    onClick={() => setError(null)} 
                    className="mt-2 text-red-400 underline hover:no-underline font-medium transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 animated-gradient opacity-5"></div>
      
      <UserDashboardHeader 
        user={user}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {error && (
          <div className="mb-6 glass p-4 border border-red-400/30 rounded-xl text-red-300 shadow-2xl animate-fade-in">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p>{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="mt-2 text-red-400 underline hover:no-underline font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome message for new users */}
        {requirements.length === 0 && (
          <div className="mb-8">
            <WelcomeCard 
              onShowNewRequirement={() => setShowNewRequirement(true)}
            />
          </div>
        )}

        <Tabs defaultValue="requirements" className="space-y-8">
          <TabsList className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-2">
            <TabsTrigger 
              value="requirements" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl rounded-xl transition-all duration-300 font-medium"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              My Requirements
            </TabsTrigger>
            <TabsTrigger 
              value="new" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl rounded-xl transition-all duration-300 font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Submit New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <h2 className="text-2xl font-bold text-white font-space-grotesk">Your Requirements</h2>
              <div className="flex items-center space-x-4">
                {requirements.length > 0 && (
                  <RequirementsFilter 
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                )}
                <Button 
                  onClick={() => setShowNewRequirement(true)} 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-xl font-medium neon-glow group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                  <Plus className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">New Requirement</span>
                </Button>
              </div>
            </div>

            <div className="scale-in">
              <RequirementsList 
                requirements={filteredRequirements}
                onSelectRequirement={setSelectedRequirement}
                onShowNewRequirement={() => setShowNewRequirement(true)}
                onRequirementUpdate={handleRequirementUpdate}
              />
            </div>
          </TabsContent>

          <TabsContent value="new">
            <div className="glass bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 scale-in">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white font-space-grotesk mb-2">Submit New Requirement</h3>
                <p className="text-slate-300">Tell us about your project and we'll get started right away</p>
              </div>
              <RequirementForm onSubmit={handleSubmitRequirement} />
            </div>
          </TabsContent>
        </Tabs>

        <UserModals 
          user={user}
          showNewRequirement={showNewRequirement}
          selectedRequirement={selectedRequirement}
          onCloseNewRequirement={() => setShowNewRequirement(false)}
          onCloseRequirementChat={() => setSelectedRequirement(null)}
          onSubmitRequirement={handleSubmitRequirement}
        />
      </div>
    </div>
  );
};
