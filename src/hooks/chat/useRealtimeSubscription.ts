
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAttachmentsForMessage } from '@/utils/chatAttachmentUtils';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface UseRealtimeSubscriptionProps {
  requirementId: string;
  mountedRef: React.MutableRefObject<boolean>;
  channelRef: React.MutableRefObject<any>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useRealtimeSubscription = ({
  requirementId,
  mountedRef,
  channelRef,
  setMessages,
  setConnected,
  setLoading,
  setError
}: UseRealtimeSubscriptionProps) => {
  
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `chat-attachments-${requirementId || 'general'}-${Date.now()}`;
    console.log('Setting up chat subscription with attachments:', channelName);
    
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
        async (payload) => {
          console.log('New message received:', payload);
          if (mountedRef.current) {
            const newMessage = payload.new as Message;
            newMessage.sender_name = newMessage.is_admin ? 'Admin' : 'User';
            
            // Fetch attachments for the new message
            const attachments = await getAttachmentsForMessage(newMessage.id);
            newMessage.attachments = attachments;
            
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments'
        },
        async (payload) => {
          console.log('New attachment received:', payload);
          if (mountedRef.current) {
            const newAttachment = payload.new as Tables<'message_attachments'>;
            
            // Update the message with the new attachment
            setMessages(prev => prev.map(msg => {
              if (msg.id === newAttachment.message_id) {
                return {
                  ...msg,
                  attachments: [...(msg.attachments || []), newAttachment]
                };
              }
              return msg;
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
        if (mountedRef.current) {
          setConnected(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') {
            setLoading(false);
          } else if (status === 'CHANNEL_ERROR') {
            setError('Real-time connection failed');
            setLoading(false);
          }
        }
      });

    channelRef.current = channel;
  }, [requirementId, mountedRef, channelRef, setMessages, setConnected, setLoading, setError]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up chat with attachments component');
    mountedRef.current = false;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [mountedRef, channelRef]);

  return {
    setupRealtimeSubscription,
    cleanup
  };
};
