
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getAttachmentsForMessage, uploadChatAttachment } from '@/utils/chatAttachmentUtils';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface UseMessageOperationsProps {
  requirementId: string;
  isAdmin: boolean;
  mountedRef: React.MutableRefObject<boolean>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSending: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useMessageOperations = ({
  requirementId,
  isAdmin,
  mountedRef,
  setMessages,
  setError,
  setSending
}: UseMessageOperationsProps) => {

  const fetchMessagesWithAttachments = useCallback(async () => {
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
  }, [requirementId, mountedRef, setMessages, setError]);

  const sendMessage = useCallback(async (content: string, file?: File) => {
    if (!mountedRef.current) return;
    
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
  }, [requirementId, isAdmin, mountedRef, setError, setSending]);

  const retryConnection = useCallback(() => {
    if (!mountedRef.current) return;
    
    setError(null);
    fetchMessagesWithAttachments().catch(() => {
      // Error already handled in fetchMessagesWithAttachments
    });
  }, [mountedRef, setError, fetchMessagesWithAttachments]);

  return {
    fetchMessagesWithAttachments,
    sendMessage,
    retryConnection
  };
};
