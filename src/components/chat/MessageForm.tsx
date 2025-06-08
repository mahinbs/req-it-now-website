
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, Upload, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
  const [fileValidated, setFileValidated] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || isLoading || disabled) return;

    const messageContent = newMessage.trim();
    const fileToSend = selectedFile;
    
    // Immediate UI feedback - clear form
    setNewMessage('');
    setSelectedFile(null);
    setFileValidated(false);
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      // Enhanced progress simulation for better UX
      if (fileToSend) {
        const progressSteps = [10, 25, 50, 75, 90];
        for (let i = 0; i < progressSteps.length; i++) {
          setTimeout(() => setUploadProgress(progressSteps[i]), i * 150);
        }
      }

      await onSendMessage(messageContent || `📎 ${fileToSend?.name}`, fileToSend || undefined);
      
      setUploadProgress(100);
      
      // Success feedback
      setTimeout(() => {
        toast({
          title: "✅ Message sent",
          description: fileToSend ? "Message and file sent successfully" : "Message sent successfully",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }, 200);
      
    } catch (error) {
      console.error('Message send failed:', error);
      
      // Restore form state on error
      setNewMessage(messageContent);
      setSelectedFile(fileToSend);
      setFileValidated(!!fileToSend);
      
      toast({
        title: "❌ Failed to send message",
        description: error instanceof Error ? error.message : "Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [newMessage, selectedFile, isLoading, disabled, onSendMessage]);

  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file);
    if (validation.valid) {
      setSelectedFile(file);
      setFileValidated(true);
      toast({
        title: "✅ File selected",
        description: `${file.name} ready to send`,
        className: "bg-green-50 border-green-200 text-green-800"
      });
    } else {
      setSelectedFile(null);
      setFileValidated(false);
      toast({
        title: "❌ Invalid File",
        description: validation.error,
        variant: "destructive"
      });
    }
  }, []);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFileValidated(false);
    setUploadProgress(0);
  }, []);

  const canSend = (newMessage.trim() || selectedFile) && !isLoading && !disabled;

  return (
    <div className="space-y-3">
      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="relative">
              <span className="text-xl">{getFileIcon(selectedFile.type)}</span>
              {fileValidated && (
                <CheckCircle className="h-4 w-4 text-green-500 absolute -top-1 -right-1 bg-white rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-blue-900 truncate" title={selectedFile.name}>
                {selectedFile.name}
              </div>
              <div className="text-xs text-blue-700">
                {formatFileSize(selectedFile.size)}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeSelectedFile}
            className="h-7 w-7 p-0 ml-2 hover:bg-red-100 text-slate-600 hover:text-red-600"
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {isLoading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {selectedFile ? 'Uploading file...' : 'Sending message...'}
            </span>
            <span className="text-blue-600 font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={selectedFile ? "Add a message (optional)" : "Type your message..."}
          disabled={isLoading || disabled}
          className="flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          className={`flex items-center space-x-1 px-4 transition-all duration-200 ${
            isLoading 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
          }`}
        >
          {isLoading ? (
            <>
              <Upload className="h-4 w-4 animate-pulse" />
              <span className="text-xs">Sending...</span>
            </>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};
