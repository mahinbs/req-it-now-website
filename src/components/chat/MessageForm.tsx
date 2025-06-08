
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, Upload } from 'lucide-react';
import { AttachmentButton } from './AttachmentButton';
import { validateFile, formatFileSize, getFileIcon } from '@/utils/chatAttachmentUtils';
import { toast } from '@/hooks/use-toast';

interface MessageFormProps {
  onSendMessage: (content: string, file?: File) => Promise<void>;
  disabled?: boolean;
}

export const MessageForm = ({ onSendMessage, disabled = false }: MessageFormProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || isLoading || disabled) return;

    const messageContent = newMessage.trim();
    const fileToSend = selectedFile;
    
    // Clear form immediately for better UX
    setNewMessage('');
    setSelectedFile(null);
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // Show upload progress for files
      if (fileToSend) {
        setUploadProgress(25);
        setTimeout(() => setUploadProgress(50), 200);
        setTimeout(() => setUploadProgress(75), 500);
      }

      await onSendMessage(messageContent || `📎 ${fileToSend?.name}`, fileToSend || undefined);
      
      setUploadProgress(100);
      
      toast({
        title: "Message sent",
        description: fileToSend ? "Message and file sent successfully" : "Message sent successfully"
      });
    } catch (error) {
      console.error('Message send failed:', error);
      
      // Restore the message content and file on error
      setNewMessage(messageContent);
      setSelectedFile(fileToSend);
      
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again. Check your connection and try once more.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (validation.valid) {
      setSelectedFile(file);
      toast({
        title: "File selected",
        description: `${file.name} ready to send`
      });
    } else {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive"
      });
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

      {isLoading && uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
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
          {isLoading ? <Upload className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
          {isLoading && <span className="text-xs ml-1">Sending...</span>}
        </Button>
      </form>
    </div>
  );
};
