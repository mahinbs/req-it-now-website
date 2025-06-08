
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { ChatLoading } from './ChatLoading';
import { MessageList } from './MessageList';
import { MessageForm } from './MessageForm';

interface ChatBoxProps {
  requirementId: string;
  currentUserName: string;
  isAdmin?: boolean;
}

export const ChatBox = ({ requirementId, currentUserName, isAdmin = false }: ChatBoxProps) => {
  const { messages, loading, error, messagesEndRef, sendMessage, retryFetch } = useChat({
    requirementId,
    isAdmin
  });

  if (loading) {
    return <ChatLoading error={error} />;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>{requirementId ? 'Requirement Chat' : 'General Chat'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
              <button 
                onClick={retryFetch} 
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
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
          
          <MessageForm onSendMessage={sendMessage} />
        </div>
      </CardContent>
    </Card>
  );
};
