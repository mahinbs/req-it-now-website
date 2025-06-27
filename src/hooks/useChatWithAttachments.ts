
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { uploadChatAttachment } from '@/utils/chatAttachmentUtils';
import { measurePerformance } from '@/utils/performanceUtils';
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

const MESSAGE_BATCH_SIZE = 20;
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 3;

export const useChatWithAttachments = ({ 
  requirementId, 
  isAdmin = false, 
  isCurrentChat = true 
}: UseChatWithAttachmentsProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const reconnectAttempts = useRef(0);
  const lastMessageTimestamp = useRef<string | null>(null);
  const messageCache = useRef<Map<string, Message>>(new Map());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Optimized message fetching with JOIN to get attachments in one query
  const fetchMessagesWithAttachments = useCallback(async (
    offset = 0, 
    limit = MESSAGE_BATCH_SIZE,
    loadMore = false
  ) => {
    const performanceFn = measurePerformance('fetchMessagesWithAttachments', async () => {
      console.log(`Fetching messages: offset=${offset}, limit=${limit}, loadMore=${loadMore}`);
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          message_attachments (*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (requirementId) {
        query = query.eq('requirement_id', requirementId);
      } else {
        query = query.is('requirement_id', null);
      }

      const { data: messagesData, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      // Transform data and add to cache
      const transformedMessages = (messagesData || []).map(msg => {
        const message: Message = {
          ...msg,
          sender_name: msg.is_admin ? 'Admin' : 'User',
          attachments: msg.message_attachments || []
        };
        
        // Cache the message
        messageCache.current.set(message.id, message);
        return message;
      });

      // Reverse to get chronological order
      const orderedMessages = transformedMessages.reverse();
      
      if (mountedRef.current) {
        if (loadMore) {
          setMessages(prev => [...orderedMessages, ...prev]);
        } else {
          setMessages(orderedMessages);
          lastMessageTimestamp.current = orderedMessages[orderedMessages.length - 1]?.created_at || null;
        }
        
        setHasMore(orderedMessages.length === limit);
        setError(null);
      }

      return orderedMessages;
    });

    return await performanceFn();
  }, [requirementId, mountedRef]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      await fetchMessagesWithAttachments(messages.length, MESSAGE_BATCH_SIZE, true);
    } catch (error) {
      console.error('Error loading more messages:', error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load more messages",
          variant: "destructive"
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [messages.length, hasMore, loadingMore, fetchMessagesWithAttachments, mountedRef]);

  // Optimized real-time subscription with consistent channel naming
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `chat-optimized-${requirementId || 'general'}`;
    console.log('Setting up optimized chat subscription:', channelName);
    
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
            
            // Check if message is already in cache (prevent duplicates)
            if (messageCache.current.has(newMessage.id)) {
              console.log('Message already in cache, skipping:', newMessage.id);
              return;
            }
            
            newMessage.sender_name = newMessage.is_admin ? 'Admin' : 'User';
            
            // Fetch attachments for the new message if needed
            if (newMessage.id) {
              const { data: attachments } = await supabase
                .from('message_attachments')
                .select('*')
                .eq('message_id', newMessage.id);
              
              newMessage.attachments = attachments || [];
            }
            
            // Add to cache
            messageCache.current.set(newMessage.id, newMessage);
            
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
            
            // Update last message timestamp
            lastMessageTimestamp.current = newMessage.created_at;
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
        (payload) => {
          console.log('New attachment received:', payload);
          if (mountedRef.current) {
            const newAttachment = payload.new as Tables<'message_attachments'>;
            
            setMessages(prev => prev.map(msg => {
              if (msg.id === newAttachment.message_id) {
                const updatedMsg = {
                  ...msg,
                  attachments: [...(msg.attachments || []), newAttachment]
                };
                messageCache.current.set(msg.id, updatedMsg);
                return updatedMsg;
              }
              return msg;
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('Optimized chat subscription status:', status);
        if (mountedRef.current) {
          setConnected(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') {
            setLoading(false);
            reconnectAttempts.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            handleConnectionError();
          }
        }
      });

    channelRef.current = channel;
  }, [requirementId, mountedRef]);

  // Enhanced connection error handling with exponential backoff
  const handleConnectionError = useCallback(() => {
    console.log('Chat connection error, attempting retry...');
    setConnected(false);
    
    if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS && mountedRef.current) {
      const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
      reconnectAttempts.current++;
      
      setTimeout(() => {
        if (mountedRef.current) {
          console.log(`Reconnecting chat (attempt ${reconnectAttempts.current})...`);
          setupRealtimeSubscription();
        }
      }, delay);
    } else {
      setError('Connection failed. Please refresh to try again.');
      setLoading(false);
    }
  }, [setupRealtimeSubscription, mountedRef]);

  // Optimized send message with optimistic updates
  const sendMessage = useCallback(async (content: string, file?: File) => {
    if (!mountedRef.current) return;
    
    try {
      setSending(true);
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to send messages');
      }

      // Optimistic update - show message immediately
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        content: content,
        is_admin: isAdmin,
        created_at: new Date().toISOString(),
        requirement_id: requirementId || null,
        sender_name: isAdmin ? 'Admin' : 'User',
        attachments: []
      };

      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();

      const messageData: any = {
        sender_id: user.id,
        content: content,
        is_admin: isAdmin
      };

      if (requirementId) {
        messageData.requirement_id = requirementId;
      }

      // Send actual message
      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (messageError) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        throw messageError;
      }

      // Replace optimistic message with real message
      const realMessage: Message = {
        ...messageResult,
        sender_name: messageResult.is_admin ? 'Admin' : 'User',
        attachments: []
      };

      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? realMessage : msg
      ));

      // Handle file upload if present
      if (file && messageResult) {
        try {
          const uploadResult = await uploadChatAttachment(file, messageResult.id, user.id);
          if (!uploadResult.success) {
            toast({
              title: "Warning",
              description: `Message sent but attachment upload failed: ${uploadResult.error}`,
              variant: "destructive"
            });
          }
        } catch (uploadError) {
          console.error('Attachment upload error:', uploadError);
          toast({
            title: "Warning",
            description: "Message sent but attachment upload failed",
            variant: "destructive"
          });
        }
      }
      
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
  }, [requirementId, isAdmin, mountedRef, scrollToBottom]);

  const retryConnection = useCallback(() => {
    if (!mountedRef.current) return;
    
    setError(null);
    setLoading(true);
    reconnectAttempts.current = 0;
    
    fetchMessagesWithAttachments().then(() => {
      if (mountedRef.current && isCurrentChat) {
        setupRealtimeSubscription();
      }
    }).catch(() => {
      if (mountedRef.current) {
        setError('Failed to load messages');
        setLoading(false);
      }
    });
  }, [mountedRef, isCurrentChat, fetchMessagesWithAttachments, setupRealtimeSubscription]);

  // Initialize chat
  useEffect(() => {
    mountedRef.current = true;
    messageCache.current.clear();
    
    const initializeChat = async () => {
      console.log('Initializing optimized chat for requirement:', requirementId || 'general');
      
      try {
        setError(null);
        
        // Fetch initial messages
        await fetchMessagesWithAttachments();
        
        // Setup realtime subscription
        if (mountedRef.current && isCurrentChat) {
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

    initializeChat();

    return () => {
      console.log('Cleaning up optimized chat component');
      mountedRef.current = false;
      messageCache.current.clear();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requirementId, isCurrentChat, fetchMessagesWithAttachments, setupRealtimeSubscription]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

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
