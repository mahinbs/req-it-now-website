
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAttachmentsForMessage } from '@/utils/chatAttachmentUtils';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface UseChatWithAttachmentsProps {
  requirementId: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
}

export const useChatWithAttachments = ({
  requirementId,
  isAdmin = false,
  isCurrentChat = true
}: UseChatWithAttachmentsProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionActiveRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);

  // Paginated message loading
  const loadMessages = useCallback(async (offset = 0, limit = 20) => {
    if (!user?.id) return { messages: [], hasMore: false };

    try {
      console.log(`Loading messages for requirement: ${requirementId}, offset: ${offset}`);
      
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (requirementId && requirementId !== 'general') {
        query = query.eq('requirement_id', requirementId);
      } else {
        query = query.is('requirement_id', null);
      }

      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        throw messagesError;
      }

      const messagesWithAttachments = await Promise.all(
        (messagesData || []).map(async (message) => {
          const attachments = await getAttachmentsForMessage(message.id);
          return {
            ...message,
            sender_name: message.is_admin ? 'Admin' : 'User',
            attachments
          };
        })
      );

      // Reverse to get chronological order
      const orderedMessages = messagesWithAttachments.reverse();
      
      return {
        messages: orderedMessages,
        hasMore: messagesData.length === limit
      };
    } catch (error) {
      console.error('Error in loadMessages:', error);
      throw error;
    }
  }, [requirementId, user?.id]);

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const { messages: newMessages } = await loadMessages(messages.length, 20);
      
      if (mountedRef.current) {
        setMessages(prev => [...newMessages, ...prev]);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      if (mountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [loadMessages, messages.length, hasMore, loadingMore]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || subscriptionActiveRef.current || channelRef.current) {
      return;
    }

    console.log('Setting up chat subscription for:', requirementId);
    subscriptionActiveRef.current = true;

    // Use a unique channel name that includes timestamp to prevent conflicts
    const channelName = `chat-${requirementId || 'general'}-${user.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: requirementId && requirementId !== 'general' 
            ? `requirement_id=eq.${requirementId}` 
            : 'requirement_id=is.null'
        },
        async (payload) => {
          console.log('New message received:', payload);
          if (mountedRef.current) {
            const newMessage = payload.new as Message;
            
            // Prevent duplicate messages
            if (lastMessageIdRef.current === newMessage.id) {
              return;
            }
            lastMessageIdRef.current = newMessage.id;
            
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
            subscriptionActiveRef.current = false;
            setError('Real-time connection failed');
            setLoading(false);
          } else if (status === 'CLOSED') {
            subscriptionActiveRef.current = false;
            setConnected(false);
          }
        }
      });

    channelRef.current = channel;
  }, [requirementId, user?.id, mountedRef]);

  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!user?.id || !content.trim()) return;

    setSending(true);
    setError(null);

    try {
      console.log('Sending message:', { content, requirementId, isAdmin });

      const messageData = {
        content: content.trim(),
        sender_id: user.id,
        is_admin: isAdmin,
        requirement_id: requirementId && requirementId !== 'general' ? requirementId : null
      };

      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        console.error('Error sending message:', messageError);
        throw messageError;
      }

      console.log('Message sent successfully:', messageResult);

      // Handle attachments if provided
      if (attachments && attachments.length > 0) {
        // Implementation for attachments would go here
        console.log('Attachments to process:', attachments.length);
      }

    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      setError(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [user?.id, requirementId, isAdmin]);

  const retryConnection = useCallback(() => {
    console.log('Retrying connection...');
    setConnected(false);
    setError(null);
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      subscriptionActiveRef.current = false;
    }
    
    setTimeout(() => {
      if (mountedRef.current) {
        setupRealtimeSubscription();
      }
    }, 1000);
  }, [setupRealtimeSubscription]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;

    const initializeChat = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const { messages: initialMessages, hasMore: hasMoreMessages } = await loadMessages(0, 20);
        
        if (mountedRef.current) {
          setMessages(initialMessages);
          setHasMore(hasMoreMessages);
          
          // Set up real-time subscription after initial load
          if (isCurrentChat) {
            setupRealtimeSubscription();
          } else {
            setLoading(false);
          }
        }
      } catch (error: any) {
        console.error('Error initializing chat:', error);
        if (mountedRef.current) {
          setError(error.message || 'Failed to load messages');
          setLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      console.log('Cleaning up chat hook');
      mountedRef.current = false;
      subscriptionActiveRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, requirementId, isCurrentChat, loadMessages, setupRealtimeSubscription]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return {
    messages,
    loading,
    error,
    sending,
    connected,
    hasMore,
    loadingMore,
    messagesEndRef,
    sendMessage,
    retryConnection,
    loadMoreMessages
  };
};
