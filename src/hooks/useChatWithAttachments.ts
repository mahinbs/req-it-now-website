
import { useEffect } from 'react';
import { useChatState } from './chat/useChatState';
import { useRealtimeSubscription } from './chat/useRealtimeSubscription';
import { useMessageOperations } from './chat/useMessageOperations';

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
  const {
    messages,
    setMessages,
    loading,
    setLoading,
    error,
    setError,
    sending,
    setSending,
    connected,
    setConnected,
    messagesEndRef,
    mountedRef,
    channelRef,
    scrollToBottom
  } = useChatState();

  const { setupRealtimeSubscription, cleanup } = useRealtimeSubscription({
    requirementId,
    mountedRef,
    channelRef,
    setMessages,
    setConnected,
    setLoading,
    setError
  });

  const { fetchMessagesWithAttachments, sendMessage, retryConnection } = useMessageOperations({
    requirementId,
    isAdmin,
    mountedRef,
    setMessages,
    setError,
    setSending
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

    initializeChat();

    return cleanup;
  }, [requirementId, fetchMessagesWithAttachments, setupRealtimeSubscription, cleanup, setError, setLoading, mountedRef]);

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
