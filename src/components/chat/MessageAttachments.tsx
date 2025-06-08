
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye, ExternalLink } from 'lucide-react';
import { getFileIcon, formatFileSize } from '@/utils/chatAttachmentUtils';
import type { Tables } from '@/integrations/supabase/types';

type MessageAttachment = Tables<'message_attachments'>;

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

export const MessageAttachments = ({ attachments }: MessageAttachmentsProps) => {
  if (attachments.length === 0) return null;

  const handleDownload = (attachment: MessageAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.file_url;
    link.download = attachment.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment: MessageAttachment) => {
    if (attachment.file_type.startsWith('image/')) {
      window.open(attachment.file_url, '_blank');
    } else {
      handleDownload(attachment);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-3 bg-background/50 rounded-lg border shadow-sm"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{getFileIcon(attachment.file_type)}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={attachment.file_name}>
                {attachment.file_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-3">
            {attachment.file_type.startsWith('image/') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePreview(attachment)}
                className="h-8 w-8 p-0"
                title="Preview image"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(attachment.file_url, '_blank')}
              className="h-8 w-8 p-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(attachment)}
              className="h-8 w-8 p-0"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
