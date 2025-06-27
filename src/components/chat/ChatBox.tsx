
import React, { useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, WifiOff, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatOptimizedFast } from '@/hooks/useChatOptimizedFast';
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
    sendMessage: originalSendMessage, 
    retryConnection,
    loadMoreMessages
  } = useChatOptimizedFast({
    requirementId,
    isAdmin,
    isCurrentChat
  });

  const { markAsRead: unifiedMarkAsRead } = useUnifiedNotificationContext();
  const hasMarkedAsReadRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  // Wrapper to match MessageForm interface
  const sendMessage = useCallback(async (content: string, file?: File) => {
    try {
      const attachments = file ? [file] : undefined;
      await originalSendMessage(content, attachments);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [originalSendMessage]);

  // Mark messages as read only after user interaction or visibility
  const handleMarkAsRead = useCallback(async () => {
    if (!isCurrentChat || !requirementId || hasMarkedAsReadRef.current) return;
    
    console.log('ChatBox marking messages as read for requirement:', requirementId);
    
    try {
      if (isAdmin && onMarkAsRead) {
        onMarkAsRead(requirementId);
      } else {
        await unifiedMarkAsRead(requirementId);
      }
      hasMarkedAsReadRef.current = true;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [isCurrentChat, requirementId, isAdmin, onMarkAsRead, unifiedMarkAsRead]);

  // Only mark as read when user has interacted with the chat
  useEffect(() => {
    if (isCurrentChat && messages.length > lastMessageCountRef.current && messages.length > 0) {
      // Only mark as read if there are new messages and user is actively viewing
      const timeoutId = setTimeout(() => {
        if (isCurrentChat) {
          handleMarkAsRead();
        }
      }, 2000); // 2 second delay to ensure user actually sees the messages
      
      lastMessageCountRef.current = messages.length;
      return () => clearTimeout(timeoutId);
    }
  }, [isCurrentChat, messages.length, handleMarkAsRead]);

  // Reset read status when switching chats
  useEffect(() => {
    hasMarkedAsReadRef.current = false;
    lastMessageCountRef.current = 0;
  }, [requirementId]);

  if (loading) {
    return <ChatLoading error={error} loadingMessage="Loading messages..." onRetry={retryConnection} />;
  }

  return (
    <Card className="w-full glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-white font-space-grotesk">
                {requirementId ? 'Requirement Chat' : 'General Chat'}
              </span>
              {messages.length > 0 && (
                <span className="text-sm text-slate-400 ml-2">({messages.length} messages)</span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                <AlertCircle className="h-3 w-3" />
                <span>Error</span>
              </div>
            )}
            {!connected && !error && (
              <div className="flex items-center space-x-2 text-orange-400 text-xs bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <WifiOff className="h-3 w-3 animate-pulse" />
                <span>Reconnecting...</span>
              </div>
            )}
            {connected && !error && (
              <div className="flex items-center space-x-2 text-green-400 text-xs bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Connected</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {error && (
            <div className="glass p-4 bg-red-500/10 border border-red-400/30 rounded-xl text-red-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Connection Issue</span>
                  </div>
                  <div className="mt-1 text-sm">{error}</div>
                </div>
                <Button 
                  onClick={retryConnection} 
                  size="sm"
                  variant="ghost"
                  className="ml-2 text-red-300 hover:text-red-200 hover:bg-red-500/20 p-2 h-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          <div 
            className="h-64 overflow-y-auto glass bg-white/5 border border-white/10 rounded-xl p-4 space-y-4"
            onClick={handleMarkAsRead}
          >
            {messages.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-full mb-4">
                  <MessageCircle className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1 text-slate-500">Start the conversation!</p>
              </div>
            ) : (
              <MessageList 
                messages={messages}
                requirementId={requirementId}
                isAdmin={isAdmin}
                messagesEndRef={messagesEndRef}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMoreMessages}
              />
            )}
          </div>
          
          <div className="relative">
            <MessageForm 
              onSendMessage={sendMessage} 
              disabled={sending || !connected}
            />
            {sending && (
              <div className="absolute inset-0 glass bg-white/5 rounded-xl flex items-center justify-center">
                <div className="flex items-center space-x-2 text-blue-400">
                  <Zap className="h-4 w-4 animate-pulse" />
                  <span className="text-sm font-medium">Sending...</span>
                </div>
              </div>
            )}
          </div>
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
