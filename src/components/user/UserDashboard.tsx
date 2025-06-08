import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileVideo, MessageCircle, Calendar, LogOut, User, File, Image, FileText, HelpCircle } from 'lucide-react';
import { RequirementForm } from '../requirements/RequirementForm';
import { ChatBox } from '../chat/ChatBox';
import { Logo } from '../ui/logo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

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
  const [showNewRequirement, setShowNewRequirement] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [showGeneralChat, setShowGeneralChat] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: NodeJS.Timeout;

    const fetchRequirementsWithTimeout = async () => {
      try {
        console.log('Starting requirements fetch for user:', user.id);
        
        // Set a timeout to prevent infinite loading
        fetchTimeout = setTimeout(() => {
          if (mounted) {
            console.log('Requirements fetch timeout, setting loading to false');
            setLoading(false);
          }
        }, 8000); // 8 second timeout

        await fetchRequirements();
        
        if (fetchTimeout) {
          clearTimeout(fetchTimeout);
        }
      } catch (error) {
        console.error('Error in fetchRequirementsWithTimeout:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchRequirementsWithTimeout();
    
    // Set up real-time subscription with proper cleanup
    console.log('Setting up real-time subscriptions for user dashboard...');
    
    const requirementsChannel = supabase
      .channel(`user-requirements-${user.id}-${Date.now()}`) // Use unique channel name
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requirements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('User requirements changed:', payload);
          fetchRequirements();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('Cleaning up user dashboard subscriptions');
      mounted = false;
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
      supabase.removeChannel(requirementsChannel);
    };
  }, [user.id]); // Add user.id as dependency

  const fetchRequirements = async () => {
    try {
      console.log('Fetching requirements for user:', user.id);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Requirements fetch timeout')), 6000)
      );

      // Create the actual fetch promise
      const fetchPromise = supabase
        .from('requirements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Race between timeout and actual fetch
      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Error fetching requirements:', error);
        throw error;
      }
      
      console.log('Requirements fetched successfully:', data?.length || 0);
      setRequirements(data || []);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      
      // Don't show error toast for timeout - just log it
      if (error instanceof Error && error.message === 'Requirements fetch timeout') {
        console.log('Requirements fetch timed out, proceeding with empty list');
        setRequirements([]);
      } else {
        toast({
          title: "Error",
          description: "Failed to load requirements",
          variant: "destructive"
        });
      }
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleSubmitRequirement = async () => {
    console.log('Requirement submitted successfully');
    // Refresh requirements list
    await fetchRequirements();
    // Close the modal
    setShowNewRequirement(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for admin review';
      case 'in-progress': return 'Being worked on by admin';
      case 'completed': return 'Completed by admin';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your requirements...</p>
          <p className="mt-2 text-sm text-slate-500">This should only take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Logo size="md" className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">req-it-now</h1>
                <p className="text-slate-600">{user.company_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setShowGeneralChat(true)}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Chat with Admin</span>
              </Button>
              <Button variant="outline" onClick={onLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Welcome message for new users */}
        {requirements.length === 0 && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900">Welcome to your Requirements Dashboard!</h3>
                  <p className="text-blue-700 mt-1">
                    Need help getting started? You can chat directly with our admin team or submit a detailed requirement.
                  </p>
                  <div className="flex space-x-3 mt-3">
                    <Button 
                      onClick={() => setShowGeneralChat(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Quick Chat
                    </Button>
                    <Button onClick={() => setShowNewRequirement(true)} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Requirement
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

            {requirements.length === 0 ? (
              <Card className="bg-white border-slate-200">
                <CardContent className="text-center py-12">
                  <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-slate-900">No requirements yet</h3>
                  <p className="text-slate-600 mb-4">
                    Submit your first website requirement to get started
                  </p>
                  <Button onClick={() => setShowNewRequirement(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Requirement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {requirements.map((requirement) => (
                  <Card key={requirement.id} className="bg-white border-slate-200 hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-slate-900">{requirement.title}</CardTitle>
                        <div className="flex flex-col space-y-2">
                          <Badge className={`${getPriorityColor(requirement.priority)} border`}>
                            {requirement.priority}
                          </Badge>
                          <Badge className={`${getStatusColor(requirement.status)} border`}>
                            {requirement.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">
                        {requirement.description}
                      </p>
                      
                      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="h-3 w-3 text-blue-500" />
                          <span>Submitted: {new Date(requirement.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600">{getStatusMessage(requirement.status)}</p>
                        {(requirement.attachment_urls?.length > 0 || requirement.attachment_metadata) && (
                          <div className="flex items-center space-x-1 mt-2">
                            <File className="h-3 w-3 text-green-500" />
                            <span className="text-green-600">Files attached</span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setSelectedRequirement(requirement)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Chat with Admin
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new">
            <RequirementForm onSubmit={handleSubmitRequirement} />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {showNewRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                <h3 className="text-lg font-semibold text-slate-900">Submit New Requirement</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewRequirement(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </Button>
              </div>
              <RequirementForm onSubmit={handleSubmitRequirement} />
            </div>
          </div>
        )}

        {selectedRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Chat: {selectedRequirement.title}
                  </h3>
                  <p className="text-sm text-slate-600">Communicate with admin about this requirement</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequirement(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </Button>
              </div>
              <ChatBox
                requirementId={selectedRequirement.id}
                currentUserName={user.company_name}
              />
            </div>
          </div>
        )}

        {/* General Chat Modal */}
        {showGeneralChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Chat with Admin</h3>
                  <p className="text-sm text-slate-600">Ask questions or get help with your website</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGeneralChat(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </Button>
              </div>
              <ChatBox
                requirementId=""
                currentUserName={user.company_name}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
