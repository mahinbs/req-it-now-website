
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const initializeChat = async () => {
      try {
        console.log('Initializing chat for requirement:', requirementId || 'general');
        
        await fetchMessages();
        
        if (mounted) {
          setupRealtimeSubscription();
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (mounted) {
          setError('Failed to load chat messages');
          setLoading(false);
        }
      }
    };

    const setupRealtimeSubscription = () => {
      const channelName = `chat-${requirementId || 'general'}-${Date.now()}`;
      console.log('Setting up chat subscription:', channelName);
      
      channel = supabase
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
            if (mounted) {
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
          console.log('Chat subscription status:', status);
          if (status === 'SUBSCRIBED' && mounted) {
            setLoading(false);
          }
        });
    };

    initializeChat();

    return () => {
      console.log('Cleaning up chat component');
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [requirementId]);

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for:', requirementId || 'general chat');
      setError(null);
      
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
      setMessages(messagesWithNames);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to load messages. Please refresh and try again.",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async (content: string) => {
    if (sending) return;
    
    try {
      setSending(true);
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
      setError('Failed to send message');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const retryFetch = () => {
    setError(null);
    setLoading(true);
    fetchMessages();
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
