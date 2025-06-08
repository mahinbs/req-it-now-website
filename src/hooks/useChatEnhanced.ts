
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
};

interface UseChatProps {
  requirementId: string;
  isAdmin?: boolean;
}

export const useChatEnhanced = ({ requirementId, isAdmin = false }: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
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
  }, [messages]);

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
      
      if (mountedRef.current) {
        setMessages(messagesWithNames);
        setError(null);
      }
      
      return true;
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (mountedRef.current) {
        setError('Failed to load messages');
      }
      return false;
    }
  };

  const setupRealtimeSubscription = () => {
    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `chat-enhanced-${requirementId || 'general'}-${Date.now()}`;
    console.log('Setting up enhanced chat subscription:', channelName);
    
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
            
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Enhanced chat subscription status:', status);
        if (mountedRef.current) {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            setLoading(false);
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            setConnected(false);
            handleConnectionError();
          }
        }
      });

    channelRef.current = channel;
  };

  const handleConnectionError = () => {
    console.log('Chat connection error, attempting retry...');
    setConnected(false);
    
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
    
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
      setError('Connection failed. Please refresh to try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeChat = async () => {
      console.log('Initializing enhanced chat for requirement:', requirementId || 'general');
      
      setError(null);
      setLoading(true);
      
      // Fetch initial messages with timeout
      const fetchTimeout = setTimeout(() => {
        if (mountedRef.current && loading) {
          setError('Loading timeout. Please try again.');
          setLoading(false);
        }
      }, 10000); // 10 second timeout
      
      const success = await fetchMessages();
      clearTimeout(fetchTimeout);
      
      if (success && mountedRef.current) {
        setupRealtimeSubscription();
      } else if (mountedRef.current) {
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      console.log('Cleaning up enhanced chat component');
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

  const sendMessage = async (content: string) => {
    if (sending || !mountedRef.current) return;
    
    try {
      setSending(true);
      setError(null);
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
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  };

  const retryConnection = () => {
    if (!mountedRef.current) return;
    
    setError(null);
    setLoading(true);
    retryCountRef.current = 0;
    
    fetchMessages().then(success => {
      if (success && mountedRef.current) {
        setupRealtimeSubscription();
      }
    });
  };

  return {
    messages,
    loading,
    error,
    sending,
    connected,
    messagesEndRef,
    sendMessage,
    retryConnection
  };
};
