
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RequirementForm } from '../requirements/RequirementForm';
import { toast } from '@/hooks/use-toast';
import { UserDashboardHeader } from './UserDashboardHeader';
import { WelcomeCard } from './WelcomeCard';
import { RequirementsList } from './RequirementsList';
import { UserModals } from './UserModals';
import { useUserDashboard } from '@/hooks/useUserDashboard';

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
    handleSubmitRequirement
  } = useUserDashboard(user);

  const handleLogout = async () => {
    try {
      console.log('User logout triggered');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your dashboard...</p>
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
      <UserDashboardHeader 
        user={user}
        onShowGeneralChat={() => setShowGeneralChat(true)}
        onLogout={handleLogout}
        isGeneralChatOpen={showGeneralChat}
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

        {/* Welcome message for new users */}
        {requirements.length === 0 && (
          <WelcomeCard 
            onShowGeneralChat={() => setShowGeneralChat(true)}
            onShowNewRequirement={() => setShowNewRequirement(true)}
          />
        )}

        <Tabs defaultValue="requirements" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="requirements" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              My Requirements
            </TabsTrigger>
            <TabsTrigger value="new" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              Submit New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Your Requirements</h2>
              <Button onClick={() => setShowNewRequirement(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Requirement
              </Button>
            </div>

            <RequirementsList 
              requirements={requirements}
              onSelectRequirement={setSelectedRequirement}
              onShowNewRequirement={() => setShowNewRequirement(true)}
            />
          </TabsContent>

          <TabsContent value="new">
            <RequirementForm onSubmit={handleSubmitRequirement} />
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
