
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MessageCache, createRetryLogic } from '@/utils/performanceUtils';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  connected: boolean;
  hasMore: boolean;
  loadingMore: boolean;
}

interface UseChatWithAttachmentsProps {
  requirementId: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
}

const MESSAGES_PER_PAGE = 20;
const messageCache = new MessageCache();

export const useChatWithAttachments = ({ 
  requirementId, 
  isAdmin = false, 
  isCurrentChat = false 
}: UseChatWithAttachmentsProps) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    loading: true,
    error: null,
    sending: false,
    connected: false,
    hasMore: true,
    loadingMore: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const offsetRef = useRef(0);
  const { retry } = createRetryLogic(3, 1000);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  const updateState = useCallback((updates: Partial<ChatState>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const fetchMessages = useCallback(async (offset = 0, limit = MESSAGES_PER_PAGE): Promise<boolean> => {
    try {
      const cacheKey = `messages-${requirementId || 'general'}-${offset}-${limit}`;
      
      // Check cache first
      if (offset === 0) {
        const cached = messageCache.get(cacheKey);
        if (cached) {
          console.log('Using cached messages');
          updateState({ 
            messages: cached, 
            error: null,
            hasMore: cached.length === limit 
          });
          return true;
        }
      }

      console.log('Fetching messages for:', requirementId || 'general chat', 'offset:', offset, 'limit:', limit);
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          attachments:message_attachments(*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

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
      
      const messagesWithNames = (data || []).map(msg => ({
        ...msg,
        sender_name: msg.is_admin ? 'Admin' : 'User'
      })).reverse(); // Reverse to show oldest first
      
      if (offset === 0) {
        // Cache initial load
        messageCache.set(cacheKey, messagesWithNames);
        updateState({ 
          messages: messagesWithNames, 
          error: null,
          hasMore: messagesWithNames.length === limit
        });
      } else {
        // Append to existing messages for pagination
        setState(prev => ({
          ...prev,
          messages: [...messagesWithNames, ...prev.messages],
          hasMore: messagesWithNames.length === limit,
          loadingMore: false
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Error fetching messages:', error);
      updateState({ 
        error: 'Failed to load messages',
        loadingMore: false
      });
      return false;
    }
  }, [requirementId, updateState]);

  const loadMoreMessages = useCallback(async () => {
    if (state.loadingMore || !state.hasMore) return;
    
    updateState({ loadingMore: true });
    offsetRef.current += MESSAGES_PER_PAGE;
    await fetchMessages(offsetRef.current, MESSAGES_PER_PAGE);
  }, [state.loadingMore, state.hasMore, fetchMessages, updateState]);

  const setupRealtimeSubscription = useCallback(async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Use consistent channel name without timestamp
    const channelName = `chat-messages-${requirementId || 'general'}`;
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
              // Check for duplicates
              const exists = prev.messages.some(msg => msg.id === newMessage.id);
              if (exists) {
                console.log('Duplicate message received, ignoring');
                return prev;
              }
              
              // Clear cache when new message arrives
              messageCache.clear();
              
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
  }, [requirementId, updateState]);

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeChat = async () => {
      console.log('Initializing chat for requirement:', requirementId || 'general');
      
      updateState({ 
        error: null, 
        loading: true 
      });
      
      // Reset pagination
      offsetRef.current = 0;
      
      // Fetch initial messages with retry logic
      await retry(() => fetchMessages(0, MESSAGES_PER_PAGE));
      
      // Setup subscription
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
  }, [requirementId, fetchMessages, setupRealtimeSubscription, updateState, retry]);

  const sendMessage = useCallback(async (content: string) => {
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
      
      // Clear cache to ensure fresh data
      messageCache.clear();
      
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
  }, [state.sending, isAdmin, requirementId, updateState]);

  const retryConnection = useCallback(async () => {
    if (!mountedRef.current) return;
    
    updateState({ 
      error: null, 
      loading: true 
    });
    
    await retry(() => fetchMessages(0, MESSAGES_PER_PAGE));
    await setupRealtimeSubscription();
  }, [fetchMessages, setupRealtimeSubscription, updateState, retry]);

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    sending: state.sending,
    connected: state.connected,
    hasMore: state.hasMore,
    loadingMore: state.loadingMore,
    messagesEndRef,
    sendMessage,
    retryConnection,
    loadMoreMessages
  };
};
