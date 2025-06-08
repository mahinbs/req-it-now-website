
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatWithNotifications } from '@/hooks/useChatWithNotifications';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MessageList } from './MessageList';
import { MessageForm } from './MessageForm';

interface ChatBoxProps {
  requirementId: string;
  currentUserName: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
}

const ChatBoxContent = ({ requirementId, currentUserName, isAdmin = false, isCurrentChat = true }: ChatBoxProps) => {
  const { 
    messages, 
    loading, 
    error, 
    sending, 
    connected,
    messagesEndRef, 
    sendMessage, 
    retryConnection
  } = useChatWithNotifications({
    requirementId,
    isAdmin,
    isCurrentChat
  });

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading chat...</p>
          </div>
        </CardContent>
      </Card>
    );
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
