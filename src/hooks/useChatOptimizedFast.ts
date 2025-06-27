
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { chatConnectionManager } from '@/utils/chatConnectionManager';
import { ChatOptimizedQueries } from '@/utils/chatOptimizedQueries';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface UseChatOptimizedFastProps {
  requirementId: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
}

export const useChatOptimizedFast = ({
  requirementId,
  isAdmin = false,
  isCurrentChat = true
}: UseChatOptimizedFastProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const mountedRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const initialLoadRef = useRef(false);

  // Optimized message loading
  const loadMessages = useCallback(async (offset = 0, limit = 20) => {
    if (!user?.id) return { messages: [], hasMore: false };

    try {
      const result = await ChatOptimizedQueries.loadMessages({
        requirementId,
        limit,
        offset,
        includeAttachments: true
      });
      
      return result;
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  }, [requirementId, user?.id]);

  // Load more messages for pagination
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !user?.id) return;

    setLoadingMore(true);
    try {
      const { messages: newMessages } = await loadMessages(messages.length, 20);
      
      if (mountedRef.current) {
        setMessages(prev => [...newMessages, ...prev]);
      }
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
  }, [loadMessages, messages.length, hasMore, loadingMore, user?.id]);

  // Optimized message sending
  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!user?.id || !content.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const result = await ChatOptimizedQueries.sendMessage(
        content,
        user.id,
        isAdmin,
        requirementId,
        attachments
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (mountedRef.current) {
        setError(error.message || 'Failed to send message');
        toast({
          title: "Error",
          description: error.message || 'Failed to send message',
          variant: "destructive"
        });
      }
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  }, [user?.id, isAdmin, requirementId, sending]);

  // Handle real-time messages
  const handleRealtimeMessage = useCallback((message: any) => {
    if (!mountedRef.current) return;

    if (message.type === 'attachment') {
      // Handle attachment updates
      setMessages(prev => prev.map(msg => {
        if (msg.id === message.data.message_id) {
          return {
            ...msg,
            attachments: [...(msg.attachments || []), message.data]
          };
        }
        return msg;
      }));
    } else {
      // Handle new messages
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    }
  }, []);

  // Handle connection status
  const handleConnectionStatus = useCallback((status: string) => {
    if (!mountedRef.current) return;
    
    const isConnected = status === 'connected';
    setConnected(isConnected);
    
    if (status === 'error') {
      setError('Connection failed. Retrying...');
    } else if (isConnected) {
      setError(null);
    }
  }, []);

  // Retry connection
  const retryConnection = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return;

    console.log('Retrying chat connection...');
    setError(null);
    setLoading(true);
    
    try {
      // Reload messages
      const { messages: initialMessages, hasMore: hasMoreMessages } = await loadMessages(0, 20);
      
      if (mountedRef.current) {
        setMessages(initialMessages);
        setHasMore(hasMoreMessages);
        setLoading(false);
        
        // Reconnect real-time if this is the current chat
        if (isCurrentChat && subscriptionIdRef.current) {
          chatConnectionManager.unsubscribe(subscriptionIdRef.current);
          subscriptionIdRef.current = await chatConnectionManager.subscribe(
            requirementId,
            handleRealtimeMessage,
            handleConnectionStatus
          );
        }
      }
    } catch (error) {
      console.error('Error during retry:', error);
      if (mountedRef.current) {
        setError('Failed to reconnect. Please refresh the page.');
        setLoading(false);
      }
    }
  }, [user?.id, loadMessages, isCurrentChat, requirementId, handleRealtimeMessage, handleConnectionStatus]);

  // Initialize chat
  useEffect(() => {
    if (!user?.id || initialLoadRef.current) return;
    
    mountedRef.current = true;
    initialLoadRef.current = true;

    const initializeChat = async () => {
      try {
        console.log('🚀 Initializing optimized chat for:', requirementId);
        
        // Show loading immediately
        setLoading(true);
        setError(null);
        
        // Load initial messages quickly
        const { messages: initialMessages, hasMore: hasMoreMessages } = await loadMessages(0, 20);
        
        if (mountedRef.current) {
          setMessages(initialMessages);
          setHasMore(hasMoreMessages);
          setLoading(false);
          
          console.log(`✅ Loaded ${initialMessages.length} messages`);
          
          // Set up real-time connection after UI is ready
          if (isCurrentChat) {
            subscriptionIdRef.current = await chatConnectionManager.subscribe(
              requirementId,
              handleRealtimeMessage,
              handleConnectionStatus
            );
          }
        }
      } catch (error: any) {
        console.error('❌ Chat initialization failed:', error);
        if (mountedRef.current) {
          setError('Failed to load chat. Please try again.');
          setLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      console.log('🧹 Cleaning up optimized chat');
      mountedRef.current = false;
      
      if (subscriptionIdRef.current) {
        chatConnectionManager.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [user?.id, requirementId, isCurrentChat, loadMessages, handleRealtimeMessage, handleConnectionStatus]);

  // Auto-scroll to bottom
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
