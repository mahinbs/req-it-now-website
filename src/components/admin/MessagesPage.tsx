import React, { useMemo, useState, useEffect } from 'react';
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
  const [requirementsWithUnread, setRequirementsWithUnread] = useState<Requirement[]>([]);
  const [loadingUnread, setLoadingUnread] = useState(false);

  // Fetch requirements with unread messages directly from database
  const fetchRequirementsWithUnread = async () => {
    if (!user?.id || !isAdmin) return;
    
    setLoadingUnread(true);
    try {
      // First get the unread counts
      const { data: unreadData, error: unreadError } = await supabase.rpc('get_unread_counts_for_admin', {
        admin_user_id: user.id
      });
      
      if (unreadError) {
        // Fallback: Get all requirements and check for messages manually
        const { data: allRequirements, error: allReqError } = await supabase
          .from('requirements')
          .select(`
            *,
            profiles (
              company_name,
              website_url
            )
          `)
          .order('created_at', { ascending: false });
        
        if (allReqError) return;
        
        // Get all messages
        const { data: allMessages, error: messagesError } = await supabase
          .from('messages')
          .select('requirement_id, created_at, is_admin')
          .order('created_at', { ascending: false });
        
        if (messagesError) return;
        
        // Find requirements with client messages (non-admin messages)
        const clientMessages = allMessages?.filter(msg => !msg.is_admin) || [];
        const requirementIdsWithMessages = [...new Set(clientMessages.map(msg => msg.requirement_id))];
        
        if (requirementIdsWithMessages.length === 0) {
          setRequirementsWithUnread([]);
          return;
        }
        
        // Filter requirements that have client messages
        const requirementsWithMessages = allRequirements?.filter(req => 
          requirementIdsWithMessages.includes(req.id)
        ) || [];
        
        setRequirementsWithUnread((requirementsWithMessages as unknown as Requirement[]) || []);
        return;
      }
      
      if (!unreadData || unreadData.length === 0) {
        setRequirementsWithUnread([]);
        return;
      }
      
      // Get the requirement IDs that have unread messages
      const requirementIds = unreadData.map((item: any) => item.requirement_id);
      
      if (requirementIds.length === 0) {
        setRequirementsWithUnread([]);
        return;
      }
      
      // Fetch the full requirement details
      const { data: requirementsData, error: requirementsError } = await supabase
        .from('requirements')
        .select(`
          *,
          profiles (
            company_name,
            website_url
          )
        `)
        .in('id', requirementIds);
      
      if (requirementsError) return;
      
      setRequirementsWithUnread((requirementsData as unknown as Requirement[]) || []);
      
    } catch (error) {
      console.error('Error fetching requirements with unread messages:', error);
    } finally {
      setLoadingUnread(false);
    }
  };

  // Fetch requirements with unread messages when component mounts
  useEffect(() => {
    fetchRequirementsWithUnread();
  }, [user?.id, isAdmin]);

  // Use notification counts to determine which requirements have unread messages
  const requirementsWithUnreadMessages = useMemo(() => {
    // Get requirement IDs that have unread messages from notification counts
    const requirementIdsWithUnread = Object.keys(notificationCounts).filter(
      id => notificationCounts[id] > 0
    );
    
    // If we have fetched requirements, use those; otherwise filter from passed requirements
    const sourceRequirements = requirementsWithUnread.length > 0 ? requirementsWithUnread : requirements;

  // Filter requirements that have unread messages
    return sourceRequirements.filter(requirement => {
      const hasUnreadFromNotification = requirementIdsWithUnread.includes(requirement.id);
      const unreadCount = getUnreadCount(requirement.id);
      const notificationCount = notificationCounts[requirement.id] || 0;
      
      return hasUnreadFromNotification || unreadCount > 0 || notificationCount > 0;
    });
  }, [requirements, requirementsWithUnread, getUnreadCount, notificationCounts, user?.id, isAdmin]);

  // Sort by unread count (highest first) and then by creation date (newest first)
  const sortedRequirements = useMemo(() => {
    return [...requirementsWithUnreadMessages].sort((a, b) => {
      const unreadA = getUnreadCount(a.id) || notificationCounts[a.id] || 0;
      const unreadB = getUnreadCount(b.id) || notificationCounts[b.id] || 0;
      
      // First sort by unread count (highest first)
      if (unreadA !== unreadB) {
        return unreadB - unreadA;
      }
      
      // Then sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [requirementsWithUnreadMessages, getUnreadCount, notificationCounts]);

  const totalUnreadCount = useMemo(() => {
    return requirementsWithUnreadMessages.reduce((total, requirement) => {
      return total + (getUnreadCount(requirement.id) || notificationCounts[requirement.id] || 0);
    }, 0);
  }, [requirementsWithUnreadMessages, getUnreadCount, notificationCounts]);

  const handleRefresh = () => {
    onRefresh();
    fetchRequirementsWithUnread();
  };

  if (loadingUnread) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <h2 className="text-2xl font-bold text-white font-space-grotesk">Messages</h2>
        </div>
        <Card className="border-slate-600/50">
          <CardContent className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-300">Loading unread messages...</p>
          </CardContent>
        </Card>
      </div>
    );
  }



  if (requirementsWithUnreadMessages.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <h2 className="text-2xl font-bold text-white font-space-grotesk">Messages</h2>
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

        <Card className="border-slate-600/50">
          <CardContent className="text-center py-16">
            <div className="bg-green-500/20 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-xl font-medium mb-3 text-white">
              All caught up! 🎉
            </h3>
            <p className="text-slate-300 mb-6 max-w-md mx-auto">
              No unread messages at the moment. All requirements have been responded to.
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white font-space-grotesk">Messages</h2>
          <p className="text-slate-300 mt-1">
            {requirementsWithUnreadMessages.length} requirement{requirementsWithUnreadMessages.length !== 1 ? 's' : ''} with unread messages
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
              requirementsWithUnreadMessages.forEach(requirement => {
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