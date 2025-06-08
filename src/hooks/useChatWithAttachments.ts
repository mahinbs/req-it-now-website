
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { uploadChatAttachment, getAttachmentsForMessage } from '@/utils/chatAttachmentUtils';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
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
      console.log('Initializing chat with attachments for requirement:', requirementId || 'general');
      
      try {
        setError(null);
        await fetchMessagesWithAttachments();
        
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channelName = `chat-attachments-${requirementId || 'general'}-${Date.now()}`;
      console.log('Setting up chat subscription with attachments:', channelName);
      
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
              
              // Update the message with the new attachment
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
              setError('Real-time connection failed');
              setLoading(false);
            }
          }
        });

      channelRef.current = channel;
    };

    initializeChat();

    return () => {
      console.log('Cleaning up chat with attachments component');
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requirementId]);

  const fetchMessagesWithAttachments = async () => {
    try {
      console.log('Fetching messages with attachments for:', requirementId || 'general chat');
      
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

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
      
      // Fetch attachments for each message
      const messagesWithAttachments = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const attachments = await getAttachmentsForMessage(msg.id);
          return {
            ...msg,
            sender_name: msg.is_admin ? 'Admin' : 'User',
            attachments
          };
        })
      );
      
      console.log('Messages with attachments fetched successfully:', messagesWithAttachments.length);
      
      if (mountedRef.current) {
        setMessages(messagesWithAttachments);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching messages with attachments:', error);
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

  const sendMessage = async (content: string, file?: File) => {
    if (sending || !mountedRef.current) return;
    
    try {
      setSending(true);
      setError(null);
      console.log('Sending message with attachment...');
      
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

      // Insert message first
      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (messageError) {
        console.error('Message send error:', messageError);
        throw messageError;
      }

      console.log('Message sent successfully:', messageResult);

      // Upload attachment if present
      if (file && messageResult) {
        console.log('Uploading attachment for message:', messageResult.id);
        const uploadResult = await uploadChatAttachment(file, messageResult.id, user.id);
        
        if (!uploadResult.success) {
          // Don't throw error for attachment failure, but show warning
          toast({
            title: "Warning",
            description: `Message sent but attachment upload failed: ${uploadResult.error}`,
            variant: "destructive"
          });
        } else {
          console.log('Attachment uploaded successfully:', uploadResult.url);
        }
      }
      
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

  const retryConnection = () => {
    if (!mountedRef.current) return;
    
    setError(null);
    setLoading(true);
    fetchMessagesWithAttachments().catch(() => {
      // Error already handled in fetchMessagesWithAttachments
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
