
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
  error: string | null;
}

interface GlobalNotificationContextType {
  notificationCounts: NotificationCounts;
  hasNewMessage: boolean;
  connected: boolean;
  error: string | null;
  clearNotifications: (requirementId: string) => void;
  getUnreadCount: (requirementId: string) => number;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType | null>(null);

export const useGlobalNotifications = (): GlobalNotificationContextType => {
  const [state, setState] = useState<GlobalNotificationState>({
    notificationCounts: {},
    hasNewMessage: false,
    connected: false,
    error: null
  });

  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const isAdminRef = useRef<boolean>(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = (updates: Partial<GlobalNotificationState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return { userId: null, isAdmin: false };

      // Check if user is admin with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Admin check timeout')), 5000)
      );

      const adminCheckPromise = supabase.rpc('is_admin', { user_id: user.id });
      
      const { data: adminCheck, error: adminError } = await Promise.race([
        adminCheckPromise,
        timeoutPromise
      ]) as any;
      
      return {
        userId: user.id,
        isAdmin: adminError ? false : (adminCheck || false)
      };
    } catch (error) {
      console.error('Error getting current user info:', error);
      updateState({ error: 'Failed to load user information' });
      return { userId: null, isAdmin: false };
    }
  };

  const setupGlobalSubscription = async () => {
    try {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }

      // Set timeout for initialization
      initializationTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.warn('Notification setup timeout - continuing without notifications');
          updateState({ connected: false, error: null });
        }
      }, 10000);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Get current user info for proper notification logic
      const { userId, isAdmin } = await getCurrentUserInfo();
      currentUserIdRef.current = userId;
      isAdminRef.current = isAdmin;
      
      console.log('Setting up global notifications for user:', userId, isAdmin ? '(Admin)' : '(User)');

      if (!userId) {
        // Clear timeout since we're done
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
          initializationTimeoutRef.current = null;
        }
        updateState({ connected: false, error: null });
        return;
      }

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
            if (mountedRef.current && currentUserIdRef.current) {
              try {
                console.log('Global message received:', payload);
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
              } catch (error) {
                console.error('Error processing notification:', error);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('Global notification subscription status:', status);
          if (mountedRef.current) {
            // Clear timeout on successful subscription
            if (status === 'SUBSCRIBED' && initializationTimeoutRef.current) {
              clearTimeout(initializationTimeoutRef.current);
              initializationTimeoutRef.current = null;
            }
            
            updateState({ 
              connected: status === 'SUBSCRIBED',
              error: status === 'CHANNEL_ERROR' ? 'Failed to connect to notifications' : null
            });
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('Error setting up global subscription:', error);
      if (mountedRef.current) {
        updateState({ 
          connected: false, 
          error: 'Failed to initialize notifications' 
        });
      }
      
      // Clear timeout on error
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    setupGlobalSubscription();

    return () => {
      console.log('Cleaning up global notifications');
      mountedRef.current = false;
      
      // Clear timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
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
    error: state.error,
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
