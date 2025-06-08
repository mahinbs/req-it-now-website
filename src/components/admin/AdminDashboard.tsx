import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileVideo, ExternalLink, MessageCircle, Calendar, Building, Globe, LogOut, User, RefreshCw, Paperclip, Download } from 'lucide-react';
import { ChatBox } from '../chat/ChatBox';
import { Logo } from '../ui/logo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface AttachmentFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;

    // Set timeout to prevent infinite loading
    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Admin dashboard loading timeout');
        setLoading(false);
        setError('Loading timeout. Please refresh to try again.');
      }
    }, 15000); // 15 second timeout

    const initializeDashboard = async () => {
      try {
        await fetchRequirements();
        
        // Only set up real-time after initial load is complete
        if (mounted) {
          setupRealtimeSubscriptions();
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        if (mounted) {
          setError('Failed to load dashboard data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up real-time subscriptions...');
    
    // Use unique channel names to avoid conflicts
    const timestamp = Date.now();
    
    // Subscribe to requirements changes
    const requirementsChannel = supabase
      .channel(`admin-requirements-${timestamp}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requirements'
        },
        (payload) => {
          console.log('Requirements table changed:', payload);
          fetchRequirements(); // Refetch all data when requirements change
        }
      )
      .subscribe();

    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel(`admin-profiles-${timestamp}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profiles table changed:', payload);
          fetchRequirements(); // Refetch all data when profiles change
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(requirementsChannel);
      supabase.removeChannel(profilesChannel);
    };
  };

  const fetchRequirements = async () => {
    try {
      console.log('Fetching requirements...');
      setError(null);
      
      // Add timeout to prevent hanging
      const fetchPromise = Promise.all([
        supabase
          .from('requirements')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, company_name, website_url')
      ]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 10000)
      );

      const [requirementsResult, profilesResult] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      const { data: requirementsData, error: requirementsError } = requirementsResult;
      const { data: profilesData, error: profilesError } = profilesResult;

      if (requirementsError) {
        console.error('Error fetching requirements:', requirementsError);
        throw requirementsError;
      }

      if (profilesError) {
        console.warn('Error fetching profiles (continuing without profile data):', profilesError);
      }

      console.log('Requirements fetched:', requirementsData?.length || 0);
      console.log('Profiles fetched:', profilesData?.length || 0);

      // Combine the data manually
      const requirementsWithProfiles: Requirement[] = requirementsData?.map(requirement => {
        const profile = profilesData?.find(p => p.id === requirement.user_id);
        return {
          ...requirement,
          profiles: profile ? {
            company_name: profile.company_name,
            website_url: profile.website_url
          } : null
        };
      }) || [];

      console.log('Final requirements with profiles:', requirementsWithProfiles.length);
      setRequirements(requirementsWithProfiles);
    } catch (error) {
      console.error('Error in fetchRequirements:', error);
      setError('Failed to load requirements data');
      toast({
        title: "Error",
        description: "Failed to load requirements",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('Manual refresh triggered');
    await fetchRequirements();
    toast({
      title: "Refreshed",
      description: "Requirements data has been refreshed"
    });
  };

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

  const parseAttachmentMetadata = (metadata: any): AttachmentFile[] => {
    if (!metadata) return [];
    try {
      if (typeof metadata === 'string') {
        return JSON.parse(metadata);
      }
      if (Array.isArray(metadata)) {
        return metadata;
      }
      return [];
    } catch (error) {
      console.error('Error parsing attachment metadata:', error);
      return [];
    }
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
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Logo size="md" className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">req-it-now Admin</h1>
                <p className="text-slate-600">Manage website requirements and communicate with clients</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

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
            {requirements.length === 0 ? (
              <Card className="bg-white border-slate-200">
                <CardContent className="text-center py-12">
                  <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-slate-900">No requirements yet</h3>
                  <p className="text-slate-600">
                    Waiting for users to submit their first requirements
                  </p>
                  <Button onClick={handleRefresh} className="mt-4" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {requirements.map((requirement) => {
                  const attachmentMetadata = parseAttachmentMetadata(requirement.attachment_metadata);
                  const attachmentUrls = requirement.attachment_urls || [];
                  const hasAttachments = attachmentMetadata.length > 0 || attachmentUrls.length > 0;
                  
                  return (
                    <Card key={requirement.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200 bg-white">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors">
                            {requirement.title}
                          </CardTitle>
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
                        <p className="text-sm text-slate-600 line-clamp-3">
                          {requirement.description}
                        </p>
                        
                        {/* Attachments Section */}
                        {hasAttachments && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-xs text-blue-600">
                              <Paperclip className="h-3 w-3" />
                              <span>
                                {attachmentMetadata.length || attachmentUrls.length} attachment(s)
                              </span>
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {attachmentMetadata.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span className="truncate">{file.name}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadAttachment(file.url, file.name)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {attachmentUrls.map((url, index) => (
                                <div key={`url-${index}`} className="flex items-center justify-between text-xs">
                                  <span className="truncate">Attachment {index + 1}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadAttachment(url, `attachment-${index + 1}`)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2 text-xs text-slate-500">
                          <div className="flex items-center space-x-2">
                            <Building className="h-3 w-3 text-blue-500" />
                            <span className="font-medium">{requirement.profiles?.company_name || 'Unknown Company'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Globe className="h-3 w-3 text-green-500" />
                            <span className="truncate">{requirement.profiles?.website_url || 'No website provided'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 text-purple-500" />
                            <span>{new Date(requirement.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3 text-orange-500" />
                            <span className="text-xs">User ID: {requirement.user_id}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          {requirement.has_screen_recording && (
                            <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                              <FileVideo className="h-3 w-3" />
                              <span>Recording</span>
                            </div>
                          )}
                          <div className="flex space-x-2 ml-auto">
                            <Button
                              size="sm"
                              onClick={() => {
                                console.log('Opening chat for requirement:', requirement);
                                setSelectedRequirement(requirement);
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Chat
                            </Button>
                            {requirement.profiles?.website_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={requirement.profiles.website_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-900">Total Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700">{requirements.length}</div>
                  <p className="text-sm text-blue-600 mt-1">All time</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-yellow-900">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700">
                    {requirements.filter(r => r.status === 'pending').length}
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">Awaiting review</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-orange-900">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-700">
                    {requirements.filter(r => r.status === 'in-progress').length}
                  </div>
                  <p className="text-sm text-orange-600 mt-1">Being worked on</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-green-900">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">
                    {requirements.filter(r => r.status === 'completed').length}
                  </div>
                  <p className="text-sm text-green-600 mt-1">Finished</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Chat Modal */}
        {selectedRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Chat: {selectedRequirement.title}
                  </h3>
                  <p className="text-sm text-slate-600">{selectedRequirement.profiles?.company_name || 'Unknown Company'}</p>
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
                currentUserName="Admin"
                isAdmin={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
