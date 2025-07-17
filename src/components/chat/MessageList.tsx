import React from "react";
import { MessageAttachments } from "./MessageAttachments";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages"> & {
  sender_name?: string;
  attachments?: Tables<"message_attachments">[];
};

interface MessageListProps {
  messages: Message[];
  requirementId: string;
  isAdmin: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => Promise<void>;
}

export const MessageList = ({
  messages,
  requirementId,
  isAdmin,
  messagesEndRef,
  hasMore,
  loadingMore,
  onLoadMore,
}: MessageListProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-center text-slate-300 text-sm py-8">
        {requirementId
          ? "No messages yet. Start the conversation!"
          : "Welcome! How can we help you today?"}
      </div>
    );
  }
  // Group messages by date (YYYY-MM-DD)
  const grouped: Record<string, Message[]> = {};
  messages.forEach((msg) => {
    const dateObj = new Date(msg.created_at);
    // Use ISO string for grouping
    const groupKey = dateObj.toISOString().slice(0, 10);
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(msg);
  });
  // Sort by date ascending
  const sortedDates = Object.keys(grouped).sort((a, b) =>
    new Date(a) > new Date(b) ? 1 : -1
  );

  // Helper to format date as '01 May 2024'
  const formatDateHeader = (dateString: string) => {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      {hasMore && onLoadMore && (
        <div className="flex justify-center mb-4">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs text-slate-400 hover:text-slate-300 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {loadingMore ? "Loading..." : "Load older messages"}
          </button>
        </div>
      )}

      {sortedDates.map((date) => (
        <div key={date}>
          <div className="flex justify-center my-4">
            <span className="bg-slate-800 text-slate-200 text-xs px-4 py-1 rounded-full shadow font-medium">
              {formatDateHeader(date)}
            </span>
          </div>
          {grouped[date].map((message) => (
            <div
              key={message.id}
              className={`flex my-3 ${
                message.is_admin === isAdmin ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.is_admin === isAdmin
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-100"
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
        </div>
      ))}
      <div ref={messagesEndRef} />
    </>
  );
};
