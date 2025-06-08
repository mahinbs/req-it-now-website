
import React from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
};

interface MessageListProps {
  messages: Message[];
  requirementId: string;
  isAdmin: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList = ({ messages, requirementId, isAdmin, messagesEndRef }: MessageListProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        {requirementId ? 
          'No messages yet. Start the conversation!' : 
          'Welcome! How can we help you today?'
        }
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.is_admin === isAdmin ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
              message.is_admin === isAdmin
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <div className="text-xs opacity-75 mb-1">
              {message.sender_name} • {new Date(message.created_at).toLocaleTimeString()}
            </div>
            <div className="text-sm">{message.content}</div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </>
  );
};
