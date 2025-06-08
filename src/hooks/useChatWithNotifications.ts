
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
};

interface ChatNotificationState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  connected: boolean;
  unreadCount: number;
  hasNewMessage: boolean;
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
  const [state, setState] = useState<ChatNotificationState>({
    messages: [],
    loading: true,
    error: null,
    sending: false,
    connected: false,
    unreadCount: 0,
    hasNewMessage: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const updateState = (updates: Partial<ChatNotificationState>) => {
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

  const setupRealtimeSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Use consistent channel name to avoid connection overhead
    const channelName = `unified-chat-${requirementId || 'general'}`;
    console.log('Setting up unified chat subscription:', channelName);
    
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
          console.log('New message received:', payload);
          if (mountedRef.current) {
            const newMessage = payload.new as Message;
            newMessage.sender_name = newMessage.is_admin ? 'Admin' : 'User';
            
            setState(prev => {
              const exists = prev.messages.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              
              const updatedMessages = [...prev.messages, newMessage];
              
              // Update notification state based on current chat status
              const shouldNotify = !isCurrentChat && newMessage.sender_id !== 'current-user-id';
              
              return {
                ...prev,
                messages: updatedMessages,
                unreadCount: shouldNotify ? prev.unreadCount + 1 : prev.unreadCount,
                hasNewMessage: shouldNotify
              };
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Unified chat subscription status:', status);
        if (mountedRef.current) {
          if (status === 'SUBSCRIBED') {
            updateState({ 
              connected: true, 
              loading: false 
            });
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            updateState({ connected: false });
            handleConnectionError();
          }
        }
      });

    channelRef.current = channel;
  };

  const handleConnectionError = () => {
    console.log('Chat connection error, attempting retry...');
    updateState({ connected: false });
    
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 5000);
    
    if (retryCountRef.current < maxRetries && mountedRef.current) {
      retryCountRef.current++;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setupRealtimeSubscription();
        }
      }, retryDelay);
    } else {
      updateState({ 
        error: 'Connection failed. Please refresh to try again.',
        loading: false 
      });
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeChat = async () => {
      console.log('Initializing unified chat for requirement:', requirementId || 'general');
      
      updateState({ 
        error: null, 
        loading: true 
      });
      
      // Reduced timeout for better perceived performance
      const fetchTimeout = setTimeout(() => {
        if (mountedRef.current && state.loading) {
          updateState({ 
            error: 'Loading timeout. Please try again.',
            loading: false 
          });
        }
      }, 3000); // Reduced from 10 seconds to 3 seconds
      
      // Start both fetch and subscription setup in parallel
      const [fetchSuccess] = await Promise.all([
        fetchMessages(),
        new Promise(resolve => {
          setupRealtimeSubscription();
          resolve(true);
        })
      ]);
      
      clearTimeout(fetchTimeout);
      
      if (!fetchSuccess && mountedRef.current) {
        updateState({ loading: false });
      }
    };

    initializeChat();

    return () => {
      console.log('Cleaning up unified chat component');
      mountedRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requirementId]);

  // Clear notifications when chat becomes current
  useEffect(() => {
    if (isCurrentChat) {
      updateState({
        unreadCount: 0,
        hasNewMessage: false
      });
    }
  }, [isCurrentChat]);

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

  const retryConnection = () => {
    if (!mountedRef.current) return;
    
    updateState({ 
      error: null, 
      loading: true 
    });
    retryCountRef.current = 0;
    
    fetchMessages().then(success => {
      if (success && mountedRef.current) {
        setupRealtimeSubscription();
      }
    });
  };

  const clearNotifications = () => {
    updateState({
      unreadCount: 0,
      hasNewMessage: false
    });
  };

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    sending: state.sending,
    connected: state.connected,
    unreadCount: state.unreadCount,
    hasNewMessage: state.hasNewMessage,
    messagesEndRef,
    sendMessage,
    retryConnection,
    clearNotifications
  };
};
