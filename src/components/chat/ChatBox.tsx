
import React, { useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatWithAttachments } from '@/hooks/useChatWithAttachments';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MessageList } from './MessageList';
import { MessageForm } from './MessageForm';
import { ChatLoading } from './ChatLoading';
import { useUnifiedNotificationContext } from '@/hooks/useUnifiedNotifications';

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

  const { markAsRead: unifiedMarkAsRead } = useUnifiedNotificationContext();

  // Mark messages as read only once when chat is opened
  const handleMarkAsRead = useCallback(async () => {
    if (!isCurrentChat || !requirementId) return;
    
    console.log('ChatBox marking messages as read for requirement:', requirementId);
    
    try {
      if (isAdmin && onMarkAsRead) {
        onMarkAsRead(requirementId);
      } else {
        await unifiedMarkAsRead(requirementId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [isCurrentChat, requirementId, isAdmin, onMarkAsRead, unifiedMarkAsRead]);

  // Mark as read only when chat is first opened with messages
  useEffect(() => {
    if (isCurrentChat && messages.length > 0) {
      // Debounce the mark as read to prevent multiple calls
      const timeoutId = setTimeout(handleMarkAsRead, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isCurrentChat, messages.length > 0]); // Only depend on these specific values

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
