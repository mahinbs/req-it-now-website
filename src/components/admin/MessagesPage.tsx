import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, MessageCircle, RefreshCw, Bell } from 'lucide-react';
import { RequirementsList } from './RequirementsList';

import { useUnifiedNotificationContext } from '@/hooks/useUnifiedNotifications';
import { useAuth } from '@/hooks/useAuthOptimized';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

type RequirementWithProfile = Tables<'requirements'> & {
  profiles: {
    company_name: string;
    website_url: string;
  } | null;
};

interface MessagesPageProps {
  requirements: Requirement[];
  onChatClick: (requirement: Requirement) => void;
  onDownloadAttachment: (url: string, fileName: string) => void;
  onRefresh: () => void;
  onApprovalUpdate?: () => void;
}

export const MessagesPage = ({
  requirements,
  onChatClick,
  onDownloadAttachment,
  onRefresh,
  onApprovalUpdate
}: MessagesPageProps) => {
  const { getUnreadCount, markAsRead, notificationCounts } = useUnifiedNotificationContext();
  const { user, isAdmin } = useAuth();
  const [requirementsWithMessages, setRequirementsWithMessages] = useState<Requirement[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch all requirements that have messages (any messages, not just unread)
  const fetchRequirementsWithMessages = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      console.log('MessagesPage: User not authenticated or not admin', { userId: user?.id, isAdmin });
      return;
    }
    
    console.log('MessagesPage: Starting to fetch requirements with messages');
    setLoadingMessages(true);
    
    try {
      // Simple approach: Get all messages first
      console.log('MessagesPage: Step 1 - Fetching all messages');
      const { data: allMessages, error: messagesError } = await supabase
        .from('messages')
        .select('requirement_id, created_at, is_admin, content')
        .order('created_at', { ascending: false });
      
      console.log('MessagesPage: Messages fetched:', { 
        count: allMessages?.length || 0, 
        messages: allMessages, 
        error: messagesError 
      });
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        setRequirementsWithMessages([]);
        return;
      }
      
      if (!allMessages || allMessages.length === 0) {
        console.log('MessagesPage: No messages found in database');
        setRequirementsWithMessages([]);
        return;
      }
      
      // Get unique requirement IDs that have any messages (filter out null values)
      const requirementIdsWithMessages = [...new Set(allMessages
        .map(msg => msg.requirement_id)
        .filter(id => id !== null && id !== undefined)
      )];
      console.log('MessagesPage: Step 2 - Unique requirement IDs with messages:', requirementIdsWithMessages);
      
      if (requirementIdsWithMessages.length === 0) {
        console.log('MessagesPage: No unique requirement IDs found');
        setRequirementsWithMessages([]);
        return;
      }
      
      // Fetch requirements and profiles separately (same approach as useAdminDashboard)
      console.log('MessagesPage: Step 3 - Fetching requirements and profiles separately');
      const [requirementsResult, profilesResult] = await Promise.all([
        supabase
          .from('requirements')
          .select('*')
          .in('id', requirementIdsWithMessages)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, company_name, website_url')
      ]);

      const { data: requirementsData, error: requirementsError } = requirementsResult;
      const { data: profilesData, error: profilesError } = profilesResult;

      console.log('MessagesPage: Requirements fetched:', { 
        count: requirementsData?.length || 0, 
        requirements: requirementsData, 
        error: requirementsError 
      });
      
      console.log('MessagesPage: Profiles fetched:', { 
        count: profilesData?.length || 0, 
        profiles: profilesData, 
        error: profilesError 
      });

      if (requirementsError) {
        console.error('Error fetching requirements:', requirementsError);
        setRequirementsWithMessages([]);
        return;
      }

      if (profilesError) {
        console.warn('Error fetching profiles (continuing without profile data):', profilesError);
      }

      if (!requirementsData || requirementsData.length === 0) {
        console.log('MessagesPage: No requirements found for the given IDs');
        setRequirementsWithMessages([]);
        return;
      }

      // Manually join requirements with profiles (same logic as useAdminDashboard)
      const requirementsWithProfiles: Requirement[] = requirementsData.map(requirement => {
        const profile = profilesData?.find(p => p.id === requirement.user_id);
        return {
          ...requirement,
          profiles: profile ? {
            company_name: profile.company_name,
            website_url: profile.website_url
          } : null
        };
      });

      console.log('MessagesPage: Successfully setting requirements with messages and profiles:', requirementsWithProfiles);
      setRequirementsWithMessages(requirementsWithProfiles);
      
    } catch (error) {
      console.error('Error fetching requirements with messages:', error);
      setRequirementsWithMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [user?.id, isAdmin]);

  // Fetch requirements with messages when component mounts
  useEffect(() => {
    fetchRequirementsWithMessages();
  }, [fetchRequirementsWithMessages]);

  // Get all requirements that have messages (fetched from database)
  const requirementsWithMessagesList = useMemo(() => {
    console.log('MessagesPage: requirementsWithMessagesList computed', requirementsWithMessages);
    // Use the fetched requirements that have messages
    return requirementsWithMessages;
  }, [requirementsWithMessages]);

  // Sort by latest message timestamp (most recent first)
  const sortedRequirements = useMemo(() => {
    console.log('MessagesPage: sortedRequirements computed', requirementsWithMessagesList);
    return [...requirementsWithMessagesList].sort((a, b) => {
      // Sort by creation date (newest first) since we want latest updated
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [requirementsWithMessagesList]);

  const totalUnreadCount = useMemo(() => {
    return requirementsWithMessagesList.reduce((total, requirement) => {
      return total + (getUnreadCount(requirement.id) || notificationCounts[requirement.id] || 0);
    }, 0);
  }, [requirementsWithMessagesList, getUnreadCount, notificationCounts]);

  const handleRefresh = () => {
    onRefresh();
    fetchRequirementsWithMessages();
  };

  if (loadingMessages) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <h2 className="text-2xl font-bold text-white font-space-grotesk">Messages</h2>
        </div>
        <Card className="border-slate-600/50">
          <CardContent className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-300">Loading messages...</p>
          </CardContent>
        </Card>
      </div>
    );
  }



  console.log('MessagesPage: Render check', { 
    loadingMessages, 
    requirementsWithMessagesListLength: requirementsWithMessagesList.length,
    requirementsWithMessagesList 
  });

  if (requirementsWithMessagesList.length === 0) {
    console.log('MessagesPage: Rendering empty state');
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <h2 className="text-2xl font-bold text-white font-space-grotesk">Messages</h2>
          <div className="flex items-center space-x-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
            <Button
              onClick={() => {
                console.log('MessagesPage: Manual refresh triggered');
                fetchRequirementsWithMessages();
              }}
              variant="outline"
              size="sm"
              className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Fetch
            </Button>
          </div>
        </div>

        <Card className="border-slate-600/50">
          <CardContent className="text-center py-16">
            <div className="bg-green-500/20 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-xl font-medium mb-3 text-white">
              No messages yet! 📭
            </h3>
            <p className="text-slate-300 mb-6 max-w-md mx-auto">
              No requirements have messages yet. Messages will appear here once clients start conversations.
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>You'll be notified of new messages</span>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>
    );
  }

  console.log('MessagesPage: Rendering main content with', sortedRequirements.length, 'requirements');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white font-space-grotesk">Messages</h2>
          <p className="text-slate-300 mt-1">
            {requirementsWithMessagesList.length} requirement{requirementsWithMessagesList.length !== 1 ? 's' : ''} with messages
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="glass px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-3">
            <MessageCircle className="h-5 w-5 text-green-400" />
            <span className="text-sm text-slate-200 font-medium">
              {totalUnreadCount} unread message{totalUnreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Messages List */}
      <div className="scale-in">
        <RequirementsList
          requirements={sortedRequirements}
          onChatClick={onChatClick}
          onDownloadAttachment={onDownloadAttachment}
          onRefresh={onRefresh}
          onApprovalUpdate={onApprovalUpdate}
        />
      </div>

      {/* Quick Actions */}
      <div className="glass bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="outline"
            onClick={() => {
              // Mark all as read
              requirementsWithMessagesList.forEach(requirement => {
                markAsRead(requirement.id);
              });
            }}
            className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Messages
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Open the first unread chat
              if (sortedRequirements.length > 0) {
                onChatClick(sortedRequirements[0]);
              }
            }}
            disabled={sortedRequirements.length === 0}
            className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Open First Unread
          </Button>
        </div>
      </div>

      
    </div>
  );
}; 