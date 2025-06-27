
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageAttachments } from './MessageAttachments';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface MessageListProps {
  messages: Message[];
  requirementId: string;
  isAdmin: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export const MessageList = ({ 
  messages, 
  requirementId, 
  isAdmin, 
  messagesEndRef,
  hasMore = false,
  loadingMore = false,
  onLoadMore
}: MessageListProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-center text-slate-300 text-sm py-8">
        {requirementId ? 
          'No messages yet. Start the conversation!' : 
          'Welcome! How can we help you today?'
        }
      </div>
    );
  }

  return (
    <>
      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Loading...
              </>
            ) : (
              'Load More Messages'
            )}
          </Button>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.is_admin === isAdmin ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
              message.is_admin === isAdmin
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-100'
            }`}
          >
            <div className="text-xs opacity-75 mb-1">
              {message.sender_name} • {new Date(message.created_at).toLocaleTimeString()}
            </div>
            <div className="text-sm">{message.content}</div>
            
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments attachments={message.attachments} />
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </>
  );
};
