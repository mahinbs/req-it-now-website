
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { getFileIcon, formatFileSize } from '@/utils/chatAttachmentUtils';
import type { Tables } from '@/integrations/supabase/types';

type MessageAttachment = Tables<'message_attachments'>;

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

export const MessageAttachments = ({ attachments }: MessageAttachmentsProps) => {
  if (attachments.length === 0) return null;

  const handleDownload = (attachment: MessageAttachment) => {
    window.open(attachment.file_url, '_blank');
  };

  const handlePreview = (attachment: MessageAttachment) => {
    if (attachment.file_type.startsWith('image/')) {
      window.open(attachment.file_url, '_blank');
    } else {
      handleDownload(attachment);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-2 bg-muted/50 rounded border"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className="text-lg">{getFileIcon(attachment.file_type)}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={attachment.file_name}>
                {attachment.file_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            {attachment.file_type.startsWith('image/') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePreview(attachment)}
                className="h-7 w-7 p-0"
                title="Preview"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(attachment)}
              className="h-7 w-7 p-0"
              title="Download"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
