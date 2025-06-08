
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNotificationContext } from './useGlobalNotifications';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
};

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  connected: boolean;
}

interface UseChatWithNotificationsProps {
  requirementId: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
}

export const useChatWithNotifications = ({ 
  requirementId, 
  isAdmin = false, 
  isCurrentChat = false 
}: UseChatWithNotificationsProps) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    loading: true,
    error: null,
    sending: false,
    connected: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const { clearNotifications, getUnreadCount } = useNotificationContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const updateState = (updates: Partial<ChatState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  const fetchMessages = async (): Promise<boolean> => {
    try {
      console.log('Fetching messages for:', requirementId || 'general chat');
      
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (requirementId) {
        query = query.eq('requirement_id', requirementId);
      } else {
        query = query.is('requirement_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      const messagesWithNames = data?.map(msg => ({
        ...msg,
        sender_name: msg.is_admin ? 'Admin' : 'User'
      })) || [];
      
      updateState({ 
        messages: messagesWithNames, 
        error: null 
      });
      
      return true;
    } catch (error) {
      console.error('Error fetching messages:', error);
      updateState({ error: 'Failed to load messages' });
      return false;
    }
  };

  const setupRealtimeSubscription = async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `chat-${requirementId || 'general'}`;
    console.log('Setting up chat subscription:', channelName);
    
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
          console.log('New message received in chat:', payload);
          if (mountedRef.current) {
            const newMessage = payload.new as Message;
            newMessage.sender_name = newMessage.is_admin ? 'Admin' : 'User';
            
            setState(prev => {
              const exists = prev.messages.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              
              return {
                ...prev,
                messages: [...prev.messages, newMessage]
              };
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
        if (mountedRef.current) {
          if (status === 'SUBSCRIBED') {
            updateState({ 
              connected: true, 
              loading: false,
              error: null
            });
          } else if (status === 'CHANNEL_ERROR') {
            updateState({ 
              connected: false,
              loading: false,
              error: 'Connection failed. Please retry.'
            });
          } else if (status === 'CLOSED') {
            updateState({ 
              connected: false
            });
          }
        }
      });

    channelRef.current = channel;
  };

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeChat = async () => {
      console.log('Initializing chat for requirement:', requirementId || 'general');
      
      updateState({ 
        error: null, 
        loading: true 
      });
      
      // Fetch messages first
      await fetchMessages();
      
      // Then setup subscription
      await setupRealtimeSubscription();
    };

    initializeChat();

    return () => {
      console.log('Cleaning up chat component');
      mountedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requirementId]);

  // Clear notifications when chat becomes current
  useEffect(() => {
    if (isCurrentChat) {
      clearNotifications(requirementId || 'general');
    }
  }, [isCurrentChat, requirementId, clearNotifications]);

  const sendMessage = async (content: string) => {
    if (state.sending || !mountedRef.current) return;
    
    try {
      updateState({ sending: true, error: null });
      console.log('Sending message...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to send messages');
      }

      const messageData: any = {
        sender_id: user.id,
        content: content,
        is_admin: isAdmin
      };

      if (requirementId) {
        messageData.requirement_id = requirementId;
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) {
        console.error('Message send error:', error);
        throw error;
      }

      console.log('Message sent successfully');
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      
      if (mountedRef.current) {
        updateState({ error: errorMessage });
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        updateState({ sending: false });
      }
    }
  };

  const retryConnection = async () => {
    if (!mountedRef.current) return;
    
    updateState({ 
      error: null, 
      loading: true 
    });
    
    await fetchMessages();
    await setupRealtimeSubscription();
  };

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    sending: state.sending,
    connected: state.connected,
    unreadCount: getUnreadCount(requirementId || 'general'),
    hasNewMessage: getUnreadCount(requirementId || 'general') > 0,
    messagesEndRef,
    sendMessage,
    retryConnection,
    clearNotifications: () => clearNotifications(requirementId || 'general')
  };
};
