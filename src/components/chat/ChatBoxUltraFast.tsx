
import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, WifiOff, AlertCircle, Zap } from 'lucide-react';
import { useChatUltraFast } from '@/hooks/useChatUltraFast';
import { useAuth } from '@/hooks/useAuth';
import { MessageList } from './MessageList';
import { MessageForm } from './MessageForm';
import { ChatSkeleton } from './ChatSkeleton';

interface ChatBoxUltraFastProps {
  requirementId: string;
  currentUserName: string;
  isAdmin?: boolean;
  isCurrentChat?: boolean;
}

export const ChatBoxUltraFast = ({ 
  requirementId, 
  currentUserName, 
  isAdmin = false, 
  isCurrentChat = true
}: ChatBoxUltraFastProps) => {
  const { user } = useAuth();
  
  const { 
    messages, 
    loading, 
    error, 
    sending, 
    connected,
    messagesEndRef, 
    sendMessage: originalSendMessage
  } = useChatUltraFast({
    requirementId,
    userId: user?.id,
    isAdmin,
    isCurrentChat
  });

  // Wrapper to match MessageForm interface
  const sendMessage = useCallback(async (content: string, file?: File) => {
    try {
      const attachments = file ? [file] : undefined;
      await originalSendMessage(content, attachments);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [originalSendMessage]);

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
            {!connected && !error && !loading && (
              <div className="flex items-center space-x-2 text-orange-400 text-xs bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <WifiOff className="h-3 w-3 animate-pulse" />
                <span>Connecting...</span>
              </div>
            )}
            {connected && (
              <div className="flex items-center space-x-2 text-green-400 text-xs bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Live</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">          
          <div className="h-64 overflow-y-auto glass bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
            {loading ? (
              <ChatSkeleton />
            ) : messages.length === 0 ? (
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
              />
            )}
          </div>
          
          <div className="relative">
            <MessageForm 
              onSendMessage={sendMessage} 
              disabled={sending || !user?.id}
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
