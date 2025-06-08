
import { useState, useRef } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

export const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return {
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
  };
};
