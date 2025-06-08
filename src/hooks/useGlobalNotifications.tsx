
import { useState, useRef, useEffect, createContext, useContext } from 'react';
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

  const updateState = (updates: Partial<GlobalNotificationState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  const getCurrentUserId = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return user.id;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  const setupGlobalSubscription = async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Get current user ID for proper notification logic
    currentUserIdRef.current = await getCurrentUserId();
    console.log('Setting up global notifications for user:', currentUserIdRef.current);

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Global message received:', payload);
          if (mountedRef.current) {
            const newMessage = payload.new as Message;
            
            // Only show notification if message is from someone else
            const isFromSelf = newMessage.sender_id === currentUserIdRef.current;
            
            if (!isFromSelf) {
              const requirementId = newMessage.requirement_id || 'general';
              
              setState(prev => ({
                ...prev,
                notificationCounts: {
                  ...prev.notificationCounts,
                  [requirementId]: (prev.notificationCounts[requirementId] || 0) + 1
                },
                hasNewMessage: true
              }));

              console.log('Notification added for requirement:', requirementId);
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
    setState(prev => ({
      ...prev,
      notificationCounts: {
        ...prev.notificationCounts,
        [requirementId]: 0
      }
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
