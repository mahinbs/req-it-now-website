
import React, { useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatWithAttachments } from '@/hooks/useChatWithAttachments';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MessageList } from './MessageList';
import { MessageForm } from './MessageForm';
import { ChatLoading } from './ChatLoading';
import { useClientNotifications } from '@/hooks/useClientNotifications';
import { useDebounce } from '@/utils/performanceUtils';

interface ChatBoxProps {
  requirementId: string;
  currentUserName: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
  onMarkAsRead?: (requirementId: string) => void;
}

const ChatBoxContent = ({ 
  requirementId, 
  currentUserName, 
  isAdmin = false, 
  isCurrentChat = true,
  onMarkAsRead 
}: ChatBoxProps) => {
  const { 
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
  } = useChatWithAttachments({
    requirementId,
    isAdmin,
    isCurrentChat
  });

  const { markAsRead: clientMarkAsRead } = useClientNotifications();

  // Debounce the markAsRead function to prevent infinite loops
  const debouncedMarkAsRead = useDebounce(useCallback((reqId: string) => {
    console.log('Debounced mark as read called for:', reqId);
    
    if (isAdmin && onMarkAsRead) {
      onMarkAsRead(reqId);
    } else if (!isAdmin) {
      clientMarkAsRead(reqId);
    }
  }, [isAdmin, onMarkAsRead, clientMarkAsRead]), 1000);

  // Mark messages as read when chat is opened (only once when component mounts)
  useEffect(() => {
    if (isCurrentChat && requirementId && messages.length > 0) {
      console.log('ChatBox marking messages as read for requirement:', requirementId);
      debouncedMarkAsRead(requirementId);
    }
  }, [isCurrentChat, requirementId, messages.length > 0, debouncedMarkAsRead]);

  if (loading) {
    return <ChatLoading error={error} />;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>{requirementId ? 'Requirement Chat' : 'General Chat'}</span>
          </div>
          <div className="flex items-center space-x-2">
            {!connected && (
              <div className="flex items-center space-x-1 text-orange-600 text-xs">
                <WifiOff className="h-3 w-3" />
                <span>Reconnecting...</span>
              </div>
            )}
            {connected && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
              <Button 
                onClick={retryConnection} 
                size="sm"
                variant="ghost"
                className="ml-2 text-red-600 hover:text-red-700 p-0 h-auto underline"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
          
          <div className="h-64 overflow-y-auto border rounded-md p-3 space-y-3">
            <MessageList 
              messages={messages}
              requirementId={requirementId}
              isAdmin={isAdmin}
              messagesEndRef={messagesEndRef}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMoreMessages}
            />
          </div>
          
          <MessageForm 
            onSendMessage={sendMessage} 
            disabled={sending || !connected}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export const ChatBox = (props: ChatBoxProps) => {
  return (
    <ErrorBoundary>
      <ChatBoxContent {...props} />
    </ErrorBoundary>
  );
};
