
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
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Improved message loading with better error handling
  const loadMessages = useCallback(async (offset = 0, limit = 20) => {
    if (!user?.id) {
      console.log('No user found, skipping message load');
      return { messages: [], hasMore: false };
    }

    try {
      console.log(`Loading messages for requirement: ${requirementId}, offset: ${offset}, user: ${user.id}`);
      
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

      console.log(`Loaded ${messagesData?.length || 0} messages from database`);

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

  // Improved real-time subscription with better error handling
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || subscriptionActiveRef.current || channelRef.current) {
      return;
    }

    console.log('Setting up real-time subscription for:', requirementId);
    subscriptionActiveRef.current = true;

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Use a unique channel name to prevent conflicts
    const channelName = `chat-enhanced-${requirementId || 'general'}-${user.id}-${Date.now()}`;
    
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
          console.log('New message received via real-time:', payload);
          if (mountedRef.current) {
            const newMessage = payload.new as Message;
            
            // Prevent duplicate messages
            if (lastMessageIdRef.current === newMessage.id) {
              return;
            }
            lastMessageIdRef.current = newMessage.id;
            
            newMessage.sender_name = newMessage.is_admin ? 'Admin' : 'User';
            
            // Fetch attachments for the new message
            try {
              const attachments = await getAttachmentsForMessage(newMessage.id);
              newMessage.attachments = attachments;
            } catch (error) {
              console.error('Error loading attachments for new message:', error);
            }
            
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
          console.log('New attachment received via real-time:', payload);
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
        console.log('Real-time subscription status:', status, 'for channel:', channelName);
        if (mountedRef.current) {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            setError(null);
            retryCountRef.current = 0;
            console.log('✅ Real-time subscription established successfully');
          } else if (status === 'CHANNEL_ERROR') {
            subscriptionActiveRef.current = false;
            setConnected(false);
            handleConnectionError();
          } else if (status === 'CLOSED') {
            subscriptionActiveRef.current = false;
            setConnected(false);
          }
        }
      });

    channelRef.current = channel;
  }, [requirementId, user?.id]);

  // Improved connection error handling with exponential backoff
  const handleConnectionError = useCallback(() => {
    console.log('Real-time connection error, attempting retry...');
    setConnected(false);
    
    const maxRetries = 5;
    const baseDelay = 1000;
    const retryDelay = Math.min(baseDelay * Math.pow(2, retryCountRef.current), 30000);
    
    if (retryCountRef.current < maxRetries && mountedRef.current) {
      retryCountRef.current++;
      console.log(`Retry attempt ${retryCountRef.current}/${maxRetries} in ${retryDelay}ms`);
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          // Clean up before retry
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
          subscriptionActiveRef.current = false;
          setupRealtimeSubscription();
        }
      }, retryDelay);
    } else {
      console.log('Max retries reached, giving up on real-time connection');
      setError('Real-time connection failed. Messages will still load, but new messages may not appear automatically.');
    }
  }, [setupRealtimeSubscription]);

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

      // Handle attachments if provided (placeholder for future implementation)
      if (attachments && attachments.length > 0) {
        console.log('Attachments to process:', attachments.length);
        // Attachment handling would be implemented here
      }

    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      setError(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [user?.id, requirementId, isAdmin]);

  const retryConnection = useCallback(() => {
    console.log('Manual retry requested...');
    setError(null);
    setConnected(false);
    retryCountRef.current = 0;
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    subscriptionActiveRef.current = false;
    
    // Retry both message loading and real-time setup
    if (mountedRef.current) {
      setLoading(true);
      loadMessages(0, 20)
        .then(({ messages: initialMessages, hasMore: hasMoreMessages }) => {
          if (mountedRef.current) {
            setMessages(initialMessages);
            setHasMore(hasMoreMessages);
            setLoading(false);
            
            // Set up real-time after successful load
            if (isCurrentChat) {
              setTimeout(() => {
                if (mountedRef.current) {
                  setupRealtimeSubscription();
                }
              }, 1000);
            }
          }
        })
        .catch((error) => {
          console.error('Error during retry:', error);
          if (mountedRef.current) {
            setError('Failed to load messages. Please try refreshing the page.');
            setLoading(false);
          }
        });
    }
  }, [loadMessages, setupRealtimeSubscription, isCurrentChat]);

  // Initial load effect with improved error handling
  useEffect(() => {
    mountedRef.current = true;

    const initializeChat = async () => {
      if (!user?.id) {
        console.log('No user found, cannot initialize chat');
        setLoading(false);
        return;
      }

      try {
        console.log('Initializing chat for requirement:', requirementId, 'user:', user.id);
        setError(null);
        setLoading(true);
        
        // Load initial messages first - this should always work
        const { messages: initialMessages, hasMore: hasMoreMessages } = await loadMessages(0, 20);
        
        if (mountedRef.current) {
          setMessages(initialMessages);
          setHasMore(hasMoreMessages);
          setLoading(false);
          
          console.log(`✅ Loaded ${initialMessages.length} initial messages`);
          
          // Set up real-time subscription after successful initial load
          if (isCurrentChat) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
              if (mountedRef.current) {
                setupRealtimeSubscription();
              }
            }, 500);
          }
        }
      } catch (error: any) {
        console.error('Error initializing chat:', error);
        if (mountedRef.current) {
          setError('Failed to load messages. Please try again.');
          setLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      console.log('Cleaning up chat hook for requirement:', requirementId);
      mountedRef.current = false;
      subscriptionActiveRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
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
