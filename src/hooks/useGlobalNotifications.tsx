
import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
};

interface NotificationCounts {
  [requirementId: string]: number;
}

interface GlobalNotificationState {
  notificationCounts: NotificationCounts;
  hasNewMessage: boolean;
  connected: boolean;
}

interface GlobalNotificationContextType {
  notificationCounts: NotificationCounts;
  hasNewMessage: boolean;
  connected: boolean;
  clearNotifications: (requirementId: string) => void;
  getUnreadCount: (requirementId: string) => number;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType | null>(null);

export const useGlobalNotifications = (): GlobalNotificationContextType => {
  const [state, setState] = useState<GlobalNotificationState>({
    notificationCounts: {},
    hasNewMessage: false,
    connected: false
  });

  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const isAdminRef = useRef<boolean>(false);

  const updateState = (updates: Partial<GlobalNotificationState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return { userId: null, isAdmin: false };

      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase.rpc('is_admin', { user_id: user.id });
      
      return {
        userId: user.id,
        isAdmin: adminError ? false : (adminCheck || false)
      };
    } catch (error) {
      console.error('Error getting current user info:', error);
      return { userId: null, isAdmin: false };
    }
  };

  const setupGlobalSubscription = async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Get current user info for proper notification logic
    const { userId, isAdmin } = await getCurrentUserInfo();
    currentUserIdRef.current = userId;
    isAdminRef.current = isAdmin;
    
    console.log('Setting up global notifications for user:', userId, isAdmin ? '(Admin)' : '(User)');

    const channel = supabase
      .channel('global-messages-optimized')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Global message received:', payload);
          if (mountedRef.current && currentUserIdRef.current) {
            const newMessage = payload.new as Message;
            
            // Notification logic based on user type
            let shouldNotify = false;
            
            if (isAdminRef.current) {
              // Admin should get notifications for client messages only
              shouldNotify = !newMessage.is_admin && newMessage.sender_id !== currentUserIdRef.current;
            } else {
              // Client should get notifications for admin messages only
              shouldNotify = newMessage.is_admin && newMessage.sender_id !== currentUserIdRef.current;
            }
            
            if (shouldNotify) {
              const requirementId = newMessage.requirement_id || 'general';
              
              setState(prev => ({
                ...prev,
                notificationCounts: {
                  ...prev.notificationCounts,
                  [requirementId]: (prev.notificationCounts[requirementId] || 0) + 1
                },
                hasNewMessage: true
              }));

              console.log('Notification added for requirement:', requirementId, 'Admin:', isAdminRef.current);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Global notification subscription status:', status);
        if (mountedRef.current) {
          updateState({ 
            connected: status === 'SUBSCRIBED'
          });
        }
      });

    channelRef.current = channel;
  };

  useEffect(() => {
    mountedRef.current = true;
    setupGlobalSubscription();

    return () => {
      console.log('Cleaning up global notifications');
      mountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const clearNotifications = (requirementId: string) => {
    console.log('Clearing notifications for requirement:', requirementId);
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
    clearNotifications,
    getUnreadCount
  };
};

// Provider component
export const GlobalNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const notificationState = useGlobalNotifications();
  
  return (
    <GlobalNotificationContext.Provider value={notificationState}>
      {children}
    </GlobalNotificationContext.Provider>
  );
};

// Hook to use the context
export const useNotificationContext = () => {
  const context = useContext(GlobalNotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a GlobalNotificationProvider');
  }
  return context;
};
