
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UnreadCount {
  requirement_id: string;
  unread_count: number;
}

interface AdminNotificationState {
  unreadCounts: Record<string, number>;
  loading: boolean;
  connected: boolean;
}

export const useAdminNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AdminNotificationState>({
    unreadCounts: {},
    loading: true,
    connected: false
  });

  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const initializingRef = useRef(false);

  const updateState = (updates: Partial<AdminNotificationState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  // Fetch initial unread counts from database
  const fetchUnreadCounts = async () => {
    if (!user?.id) return;

    try {
      console.log('Fetching unread counts for admin:', user.id);
      
      const { data, error } = await supabase.rpc('get_unread_counts_for_admin', {
        admin_user_id: user.id
      });

      if (error) {
        console.error('Error fetching unread counts:', error);
        return;
      }

      console.log('Unread counts data:', data);

      const unreadCounts: Record<string, number> = {};
      data?.forEach((item: UnreadCount) => {
        unreadCounts[item.requirement_id] = item.unread_count;
      });

      updateState({ 
        unreadCounts,
        loading: false 
      });
    } catch (error) {
      console.error('Error in fetchUnreadCounts:', error);
      updateState({ loading: false });
    }
  };

  // Mark requirement as read
  const markAsRead = async (requirementId: string) => {
    if (!user?.id) return;

    try {
      console.log('Marking requirement as read:', requirementId);
      
      const { error } = await supabase.rpc('mark_requirement_as_read', {
        admin_user_id: user.id,
        req_id: requirementId
      });

      if (error) {
        console.error('Error marking as read:', error);
        return;
      }

      // Update local state
      setState(prev => ({
        ...prev,
        unreadCounts: {
          ...prev.unreadCounts,
          [requirementId]: 0
        }
      }));
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  // Set up real-time subscriptions
  const setupRealtimeSubscriptions = () => {
    if (!user?.id || channelRef.current || initializingRef.current) return;

    console.log('Setting up admin notifications real-time subscription');
    initializingRef.current = true;

    // Create a unique channel name to avoid conflicts
    const channelName = `admin-notifications-${user.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as any;
          
          // Only count client messages (not admin messages)
          if (!newMessage.is_admin && newMessage.requirement_id) {
            setState(prev => ({
              ...prev,
              unreadCounts: {
                ...prev.unreadCounts,
                [newMessage.requirement_id]: (prev.unreadCounts[newMessage.requirement_id] || 0) + 1
              }
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('Admin notifications subscription status:', status);
        updateState({ connected: status === 'SUBSCRIBED' });
        initializingRef.current = false;
      });

    channelRef.current = channel;
  };

  useEffect(() => {
    mountedRef.current = true;

    if (user?.id) {
      fetchUnreadCounts();
      setupRealtimeSubscriptions();
    }

    return () => {
      console.log('Cleaning up admin notifications');
      mountedRef.current = false;
      initializingRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const getUnreadCount = (requirementId: string) => {
    return state.unreadCounts[requirementId] || 0;
  };

  return {
    unreadCounts: state.unreadCounts,
    loading: state.loading,
    connected: state.connected,
    getUnreadCount,
    markAsRead,
    refetch: fetchUnreadCounts
  };
};
