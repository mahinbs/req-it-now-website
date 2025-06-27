
import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuthOptimized';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
};

interface NotificationCounts {
  [requirementId: string]: number;
}

interface NotificationState {
  notificationCounts: NotificationCounts;
  hasNewMessage: boolean;
  connected: boolean;
  error: string | null;
  loading: boolean;
}

interface UnifiedNotificationContextType {
  notificationCounts: NotificationCounts;
  hasNewMessage: boolean;
  connected: boolean;
  error: string | null;
  loading: boolean;
  clearNotifications: (requirementId: string) => void;
  getUnreadCount: (requirementId: string) => number;
  markAsRead: (requirementId: string) => Promise<void>;
}

const UnifiedNotificationContext = createContext<UnifiedNotificationContextType | null>(null);

export const useUnifiedNotifications = (): UnifiedNotificationContextType => {
  const { user, isAdmin } = useAuth();
  const [state, setState] = useState<NotificationState>({
    notificationCounts: {},
    hasNewMessage: false,
    connected: false,
    error: null,
    loading: true
  });

  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const subscriptionActiveRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const updateState = (updates: Partial<NotificationState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  const fetchInitialUnreadCounts = async () => {
    if (!user?.id) {
      updateState({ loading: false });
      return;
    }

    try {
      console.log('Fetching initial unread counts for:', user.id, isAdmin ? '(Admin)' : '(Client)');
      
      const rpcFunction = isAdmin 
        ? 'get_unread_counts_for_admin'
        : 'get_unread_counts_for_client';
      
      let rpcParams;
      if (isAdmin) {
        rpcParams = { admin_user_id: user.id };
      } else {
        rpcParams = { client_user_id: user.id };
      }
      
      const { data, error } = await supabase.rpc(rpcFunction, rpcParams);

      if (error) {
        console.error('Error fetching unread counts:', error);
        updateState({ 
          loading: false, 
          error: 'Failed to load notifications',
          connected: false
        });
        return;
      }

      const unreadCounts: NotificationCounts = {};
      data?.forEach((item: any) => {
        unreadCounts[item.requirement_id || 'general'] = item.unread_count;
      });

      updateState({ 
        notificationCounts: unreadCounts,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error in fetchInitialUnreadCounts:', error);
      updateState({ 
        loading: false, 
        error: 'Failed to connect to notification service',
        connected: false
      });
    }
  };

  const setupUnifiedSubscription = async () => {
    if (!user?.id || subscriptionActiveRef.current || channelRef.current) {
      return;
    }

    try {
      console.log('Setting up unified notification subscription for:', user.id, isAdmin ? '(Admin)' : '(Client)');
      
      subscriptionActiveRef.current = true;
      
      // Use a unique channel name to prevent conflicts
      const channelName = `unified-notifications-${isAdmin ? 'admin' : 'client'}-${user.id}-${Date.now()}`;
      
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
            if (mountedRef.current && user) {
              try {
                const newMessage = payload.new as Message;
                
                // Determine if this message should create a notification
                let shouldNotify = false;
                
                if (isAdmin) {
                  // Admin gets notifications for client messages only
                  shouldNotify = !newMessage.is_admin && newMessage.sender_id !== user.id;
                } else {
                  // Client gets notifications for admin messages only
                  shouldNotify = newMessage.is_admin && newMessage.sender_id !== user.id;
                }
                
                if (shouldNotify) {
                  const requirementId = newMessage.requirement_id || 'general';
                  
                  console.log('Adding notification for:', requirementId, 'User:', isAdmin ? 'Admin' : 'Client');
                  
                  setState(prev => ({
                    ...prev,
                    notificationCounts: {
                      ...prev.notificationCounts,
                      [requirementId]: (prev.notificationCounts[requirementId] || 0) + 1
                    },
                    hasNewMessage: true
                  }));
                }
              } catch (error) {
                console.error('Error processing notification:', error);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('Unified notification subscription status:', status);
          
          if (mountedRef.current) {
            if (status === 'SUBSCRIBED') {
              updateState({ connected: true, error: null });
              retryCountRef.current = 0;
            } else if (status === 'CHANNEL_ERROR') {
              subscriptionActiveRef.current = false;
              updateState({ 
                connected: false, 
                error: retryCountRef.current >= 3 ? 'Connection failed after retries' : null
              });
              
              // Retry with exponential backoff
              if (retryCountRef.current < 3) {
                const delay = Math.pow(2, retryCountRef.current) * 1000;
                retryTimeoutRef.current = setTimeout(() => {
                  retryCountRef.current++;
                  setupUnifiedSubscription();
                }, delay);
              }
            } else if (status === 'CLOSED') {
              subscriptionActiveRef.current = false;
              updateState({ connected: false });
            }
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('Error setting up unified subscription:', error);
      subscriptionActiveRef.current = false;
      updateState({ 
        connected: false, 
        error: 'Failed to initialize real-time notifications',
        loading: false
      });
    }
  };

  const markAsRead = async (requirementId: string) => {
    if (!user?.id) return;

    try {
      console.log('Marking as read:', requirementId, 'User:', isAdmin ? 'Admin' : 'Client');
      
      const rpcFunction = isAdmin 
        ? 'mark_requirement_as_read'
        : 'mark_requirement_as_read_for_client';
      
      let rpcParams;
      if (isAdmin) {
        rpcParams = { admin_user_id: user.id, req_id: requirementId };
      } else {
        rpcParams = { client_user_id: user.id, req_id: requirementId };
      }

      const { error } = await supabase.rpc(rpcFunction, rpcParams);

      if (error) {
        console.error('Error marking as read:', error);
        return;
      }

      // Update local state immediately
      setState(prev => ({
        ...prev,
        notificationCounts: {
          ...prev.notificationCounts,
          [requirementId]: 0
        },
        hasNewMessage: Object.values({
          ...prev.notificationCounts,
          [requirementId]: 0
        }).some(count => count > 0)
      }));

    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (user?.id) {
      fetchInitialUnreadCounts();
      setupUnifiedSubscription();
    } else {
      updateState({ loading: false });
    }

    return () => {
      console.log('Cleaning up unified notifications');
      mountedRef.current = false;
      subscriptionActiveRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, isAdmin]);

  const clearNotifications = (requirementId: string) => {
    console.log('Clearing notifications for:', requirementId);
    setState(prev => ({
      ...prev,
      notificationCounts: {
        ...prev.notificationCounts,
        [requirementId]: 0
      },
      hasNewMessage: Object.values({
        ...prev.notificationCounts,
        [requirementId]: 0
      }).some(count => count > 0)
    }));
  };

  const getUnreadCount = (requirementId: string) => {
    return state.notificationCounts[requirementId] || 0;
  };

  return {
    notificationCounts: state.notificationCounts,
    hasNewMessage: state.hasNewMessage,
    connected: state.connected,
    error: state.error,
    loading: state.loading,
    clearNotifications,
    getUnreadCount,
    markAsRead
  };
};

// Provider component
export const UnifiedNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const notificationState = useUnifiedNotifications();
  
  return (
    <UnifiedNotificationContext.Provider value={notificationState}>
      {children}
    </UnifiedNotificationContext.Provider>
  );
};

// Hook to use the context
export const useUnifiedNotificationContext = () => {
  const context = useContext(UnifiedNotificationContext);
  if (!context) {
    throw new Error('useUnifiedNotificationContext must be used within a UnifiedNotificationProvider');
  }
  return context;
};
