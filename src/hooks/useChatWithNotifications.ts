
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
  const currentUserIdRef = useRef<string | null>(null);

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

  // Get current user ID
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

    // Get current user ID for proper notification logic
    currentUserIdRef.current = await getCurrentUserId();

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
          console.log('New message received:', payload);
          if (mountedRef.current) {
            const newMessage = payload.new as Message;
            newMessage.sender_name = newMessage.is_admin ? 'Admin' : 'User';
            
            setState(prev => {
              const exists = prev.messages.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              
              const updatedMessages = [...prev.messages, newMessage];
              
              // Only show notification if:
              // 1. This chat is not currently active
              // 2. The message is from someone else (not current user)
              const isFromSelf = newMessage.sender_id === currentUserIdRef.current;
              const shouldNotify = !isCurrentChat && !isFromSelf;
              
              console.log('Notification logic:', {
                isCurrentChat,
                isFromSelf,
                shouldNotify,
                senderId: newMessage.sender_id,
                currentUserId: currentUserIdRef.current
              });
              
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
      
      // Start both operations in parallel for faster loading
      const [fetchSuccess] = await Promise.all([
        fetchMessages(),
        setupRealtimeSubscription()
      ]);
      
      // If fetch failed, still allow subscription to work
      if (!fetchSuccess && mountedRef.current) {
        updateState({ 
          loading: false,
          error: 'Failed to load message history'
        });
      }
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

  const retryConnection = async () => {
    if (!mountedRef.current) return;
    
    updateState({ 
      error: null, 
      loading: true 
    });
    
    const fetchSuccess = await fetchMessages();
    if (fetchSuccess && mountedRef.current) {
      await setupRealtimeSubscription();
    }
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
