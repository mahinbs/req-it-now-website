
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface MessageFormProps {
  onSendMessage: (content: string) => Promise<void>;
}

export const MessageForm = ({ onSendMessage }: MessageFormProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);
    
    try {
      await onSendMessage(messageContent);
    } catch (error) {
      setNewMessage(messageContent);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
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
  );
};
