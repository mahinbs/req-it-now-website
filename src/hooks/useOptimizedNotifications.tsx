
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

interface OptimizedNotificationState {
  notificationCounts: NotificationCounts;
  hasNewMessage: boolean;
  connected: boolean;
  error: string | null;
  initializing: boolean;
}

interface OptimizedNotificationContextType {
  notificationCounts: NotificationCounts;
  hasNewMessage: boolean;
  connected: boolean;
  error: string | null;
  initializing: boolean;
  clearNotifications: (requirementId: string) => void;
  getUnreadCount: (requirementId: string) => number;
}

const OptimizedNotificationContext = createContext<OptimizedNotificationContextType | null>(null);

export const useOptimizedNotifications = (): OptimizedNotificationContextType => {
  const { user, isAdmin } = useAuth();
  const [state, setState] = useState<OptimizedNotificationState>({
    notificationCounts: {},
    hasNewMessage: false,
    connected: false,
    error: null,
    initializing: true
  });

  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = (updates: Partial<OptimizedNotificationState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  const setupNotifications = async () => {
    if (!user) {
      updateState({ initializing: false, connected: false });
      return;
    }

    try {
      console.log('Setting up optimized notifications for user:', user.id, isAdmin ? '(Admin)' : '(User)');

      // Clear any existing timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }

      // Set a shorter timeout for notifications (non-blocking)
      initTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log('Notification setup timeout - continuing without real-time notifications');
          updateState({ initializing: false, connected: false, error: null });
        }
      }, 5000); // Shorter timeout

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel('optimized-messages')
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
                
                // Simplified notification logic
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
          console.log('Optimized notification subscription status:', status);
          if (mountedRef.current) {
            if (status === 'SUBSCRIBED' && initTimeoutRef.current) {
              clearTimeout(initTimeoutRef.current);
              initTimeoutRef.current = null;
            }
            
            updateState({ 
              connected: status === 'SUBSCRIBED',
              initializing: false,
              error: status === 'CHANNEL_ERROR' ? 'Failed to connect to notifications' : null
            });
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('Error setting up optimized notifications:', error);
      if (mountedRef.current) {
        updateState({ 
          connected: false, 
          initializing: false,
          error: null // Don't show error to user for non-critical notifications
        });
      }
      
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Only setup notifications after a short delay to not block initial load
    const delayedSetup = setTimeout(() => {
      if (mountedRef.current && user) {
        setupNotifications();
      } else if (mountedRef.current) {
        updateState({ initializing: false });
      }
    }, 1000); // 1 second delay to not block initial load

    return () => {
      mountedRef.current = false;
      clearTimeout(delayedSetup);
      
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, isAdmin]); // Depend on user and isAdmin from auth context

  const clearNotifications = (requirementId: string) => {
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
    initializing: state.initializing,
    clearNotifications,
    getUnreadCount
  };
};

// Provider component
export const OptimizedNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const notificationState = useOptimizedNotifications();
  
  return (
    <OptimizedNotificationContext.Provider value={notificationState}>
      {children}
    </OptimizedNotificationContext.Provider>
  );
};

// Hook to use the context
export const useOptimizedNotificationContext = () => {
  const context = useContext(OptimizedNotificationContext);
  if (!context) {
    throw new Error('useOptimizedNotificationContext must be used within an OptimizedNotificationProvider');
  }
  return context;
};
