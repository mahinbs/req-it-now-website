
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
};

interface ChatBoxProps {
  requirementId: string;
  currentUserName: string;
  isAdmin?: boolean;
}

export const ChatBox = ({ requirementId, currentUserName, isAdmin = false }: ChatBoxProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout;

    const initializeChat = async () => {
      try {
        console.log('Initializing chat for requirement:', requirementId || 'general');
        
        // Set timeout for initialization
        initTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.warn('Chat initialization timeout');
            setLoading(false);
            setError('Chat loading timeout. Please try refreshing.');
          }
        }, 10000);

        await fetchMessages();
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (mounted) {
          setError('Failed to load chat messages');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        if (initTimeout) {
          clearTimeout(initTimeout);
        }
      }
    };

    initializeChat();
    
    // Subscribe to real-time updates with unique channel name
    const channelName = `messages-${requirementId || 'general'}-${Date.now()}-${Math.random()}`;
    console.log('Setting up chat subscription:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: requirementId ? `requirement_id=eq.${requirementId}` : 'requirement_id=is.null'
        },
        (payload) => {
          console.log('New message received:', payload);
          if (mounted) {
            const newMessage = payload.new as Message;
            newMessage.sender_name = newMessage.is_admin ? 'Admin' : 'User';
            setMessages(prev => {
              // Prevent duplicate messages
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    return () => {
      console.log('Cleaning up chat component');
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [requirementId]);

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for:', requirementId || 'general chat');
      setError(null);
      
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (requirementId) {
        query = query.eq('requirement_id', requirementId);
      } else {
        query = query.is('requirement_id', null);
      }

      // Add timeout to prevent hanging
      const fetchPromise = query;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Message fetch timeout')), 8000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      const messagesWithNames = data?.map(msg => ({
        ...msg,
        sender_name: msg.is_admin ? 'Admin' : 'User'
      })) || [];
      
      console.log('Messages fetched successfully:', messagesWithNames.length);
      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
      toast({
        title: "Error",
        description: "Failed to load messages. Please refresh and try again.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setIsLoading(true);
    
    try {
      console.log('Sending message...');
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to send messages');
      }

      console.log('Sending message:', {
        content: messageContent,
        isAdmin,
        requirementId: requirementId || null,
        userId: user.id
      });

      const messageData: any = {
        sender_id: user.id,
        content: messageContent,
        is_admin: isAdmin
      };

      if (requirementId) {
        messageData.requirement_id = requirementId;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Message send error:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);
      
      // Optimistically add message to UI (real-time will handle duplicates)
      const optimisticMessage = {
        ...data,
        sender_name: isAdmin ? 'Admin' : 'User'
      };
      
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === optimisticMessage.id);
        if (exists) return prev;
        return [...prev, optimisticMessage];
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message in input on error
      setNewMessage(messageContent);
      setError('Failed to send message');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading chat...</p>
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
                onClick={() => {
                  setError(null);
                  fetchMessages();
                }} 
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}
          
          <div className="h-64 overflow-y-auto border rounded-md p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                {requirementId ? 
                  'No messages yet. Start the conversation!' : 
                  'Welcome! How can we help you today?'
                }
              </div>
            ) : (
              messages.map((message) => (
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
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={isLoading || !newMessage.trim()}
              className="flex items-center space-x-1"
            >
              <Send className="h-4 w-4" />
              {isLoading && <span className="text-xs">Sending...</span>}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
