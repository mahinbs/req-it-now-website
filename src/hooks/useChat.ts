
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

export const useChat = ({ requirementId, isAdmin = false }: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeChat = async () => {
      console.log('Initializing chat for requirement:', requirementId || 'general');
      
      try {
        // Clear any existing error
        setError(null);
        
        // Fetch initial messages
        await fetchMessages();
        
        // Setup realtime subscription only after successful fetch
        if (mountedRef.current) {
          setupRealtimeSubscription();
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (mountedRef.current) {
          setError('Failed to load chat messages');
          setLoading(false);
        }
      }
    };

    const setupRealtimeSubscription = () => {
      // Clean up existing channel first
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channelName = `chat-${requirementId || 'general'}-${Date.now()}`;
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
              
              setMessages(prev => {
                // Prevent duplicate messages
                const exists = prev.some(msg => msg.id === newMessage.id);
                if (exists) return prev;
                return [...prev, newMessage];
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('Chat subscription status:', status);
          if (status === 'SUBSCRIBED' && mountedRef.current) {
            setLoading(false);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Chat subscription error');
            if (mountedRef.current) {
              setError('Real-time connection failed');
              setLoading(false);
            }
          }
        });

      channelRef.current = channel;
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

  const fetchMessages = async () => {
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
      
      console.log('Messages fetched successfully:', messagesWithNames.length);
      
      if (mountedRef.current) {
        setMessages(messagesWithNames);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (mountedRef.current) {
        setError('Failed to load messages');
        toast({
          title: "Error",
          description: "Failed to load messages. Please refresh and try again.",
          variant: "destructive"
        });
      }
      throw error;
    }
  };

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

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Message send error:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message. Please try again.";
      
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

  const retryFetch = () => {
    if (!mountedRef.current) return;
    
    setError(null);
    setLoading(true);
    fetchMessages().catch(() => {
      // Error already handled in fetchMessages
    });
  };

  return {
    messages,
    loading,
    error,
    sending,
    messagesEndRef,
    sendMessage,
    retryFetch
  };
};
