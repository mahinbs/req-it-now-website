
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface UseChatUltraFastProps {
  requirementId: string;
  userId?: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
}

export const useChatUltraFast = ({
  requirementId,
  userId,
  isAdmin = false,
  isCurrentChat = true
}: UseChatUltraFastProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  
  const mountedRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const initialLoadRef = useRef(false);

  // Ultra-fast message loading - no auth dependency
  const loadMessages = useCallback(async () => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    console.log('🚀 Ultra-fast loading messages for:', requirementId);
    const startTime = performance.now();
    
    try {
      // Build query without waiting for full auth
      let query = supabase
        .from('messages')
        .select(`
          *,
          message_attachments (*)
        `)
        .order('created_at', { ascending: true })
        .limit(50);

      if (requirementId && requirementId !== 'general') {
        query = query.eq('requirement_id', requirementId);
      } else {
        query = query.is('requirement_id', null);
      }

      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) {
        throw messagesError;
      }

      const processedMessages = (messagesData || []).map(msg => ({
        ...msg,
        sender_name: msg.is_admin ? 'Admin' : 'User',
        attachments: msg.message_attachments || []
      }));

      if (mountedRef.current) {
        setMessages(processedMessages);
        setLoading(false);
        
        const endTime = performance.now();
        console.log(`✅ Ultra-fast loaded ${processedMessages.length} messages in ${(endTime - startTime).toFixed(2)}ms`);
      }
    } catch (error: any) {
      console.error('❌ Ultra-fast loading failed:', error);
      if (mountedRef.current) {
        setError('Failed to load messages');
        setLoading(false);
      }
    }
  }, [requirementId]);

  // Parallel real-time connection setup
  const setupRealtimeConnection = useCallback(() => {
    if (!isCurrentChat || channelRef.current) return;

    console.log('🔄 Setting up parallel real-time connection');
    
    const channelName = `ultra-fast-chat-${requirementId || 'general'}-${Date.now()}`;
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
        (payload) => {
          console.log('📨 New real-time message:', payload.new);
          if (mountedRef.current) {
            const newMessage: Message = {
              ...(payload.new as Tables<'messages'>),
              sender_name: (payload.new as Tables<'messages'>).is_admin ? 'Admin' : 'User',
              attachments: []
            };
            
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔄 Connection status: ${status}`);
        if (mountedRef.current) {
          setConnected(status === 'SUBSCRIBED');
        }
      });

    channelRef.current = channel;
  }, [requirementId, isCurrentChat]);

  // Ultra-fast message sending
  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!userId || !content.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const messageData = {
        content: content.trim(),
        sender_id: userId,
        is_admin: isAdmin,
        requirement_id: requirementId && requirementId !== 'general' ? requirementId : null
      };

      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      console.log('✅ Message sent ultra-fast');
    } catch (error: any) {
      console.error('❌ Send failed:', error);
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
  }, [userId, isAdmin, requirementId, sending]);

  // Initialize with parallel loading
  useEffect(() => {
    if (!mountedRef.current) return;

    // Start loading messages immediately (no auth wait)
    loadMessages();

    // Set up real-time connection in parallel (no blocking)
    const connectionTimeout = setTimeout(() => {
      setupRealtimeConnection();
    }, 100); // Small delay to let messages load first

    return () => {
      mountedRef.current = false;
      clearTimeout(connectionTimeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadMessages, setupRealtimeConnection]);

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
    messagesEndRef,
    sendMessage
  };
};
