
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationState {
  unreadCount: number;
  hasNewMessage: boolean;
}

export const useMessageNotifications = (requirementId: string, isCurrentChat: boolean) => {
  const [notifications, setNotifications] = useState<NotificationState>({
    unreadCount: 0,
    hasNewMessage: false
  });
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    mountedRef.current = true;
    
    const setupNotificationSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channelName = `notifications-${requirementId || 'general'}-${Date.now()}`;
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: requirementId ? `requirement_id=eq.${requirementId}` : 'requirement_id=is.null'
          },
          (payload) => {
            if (!mountedRef.current) return;
            
            // Don't show notification if user is currently viewing this chat
            if (!isCurrentChat) {
              setNotifications(prev => ({
                unreadCount: prev.unreadCount + 1,
                hasNewMessage: true
              }));
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupNotificationSubscription();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requirementId, isCurrentChat]);

  const clearNotifications = () => {
    setNotifications({
      unreadCount: 0,
      hasNewMessage: false
    });
  };

  const markAsRead = () => {
    if (isCurrentChat) {
      clearNotifications();
    }
  };

  return {
    ...notifications,
    clearNotifications,
    markAsRead
  };
};
