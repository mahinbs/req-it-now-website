
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X } from 'lucide-react';
import { AttachmentButton } from './AttachmentButton';
import { validateFile, formatFileSize, getFileIcon } from '@/utils/chatAttachmentUtils';

interface MessageFormProps {
  onSendMessage: (content: string, file?: File) => Promise<void>;
  disabled?: boolean;
}

export const MessageForm = ({ onSendMessage, disabled = false }: MessageFormProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || isLoading || disabled) return;

    const messageContent = newMessage.trim();
    const fileToSend = selectedFile;
    
    setNewMessage('');
    setSelectedFile(null);
    setIsLoading(true);
    
    try {
      await onSendMessage(messageContent || 'File attachment', fileToSend || undefined);
    } catch (error) {
      console.error('Message send failed:', error);
      // Restore the message content and file on error
      setNewMessage(messageContent);
      setSelectedFile(fileToSend);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (validation.valid) {
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const canSend = (newMessage.trim() || selectedFile) && !isLoading && !disabled;

  return (
    <div className="space-y-2">
      {selectedFile && (
        <div className="flex items-center justify-between p-2 bg-muted rounded border">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className="text-lg">{getFileIcon(selectedFile.type)}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={selectedFile.name}>
                {selectedFile.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeSelectedFile}
            className="h-7 w-7 p-0 ml-2"
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={selectedFile ? "Add a message (optional)" : "Type your message..."}
          disabled={isLoading || disabled}
          className="flex-1"
          autoComplete="off"
        />
        <AttachmentButton
          onFileSelect={handleFileSelect}
          disabled={isLoading || disabled}
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={!canSend}
          className="flex items-center space-x-1 px-3"
        >
          <Send className="h-4 w-4" />
          {isLoading && <span className="text-xs ml-1">Sending...</span>}
        </Button>
      </form>
    </div>
  );
};
