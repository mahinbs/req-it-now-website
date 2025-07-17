import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Eye, ExternalLink, AlertCircle } from "lucide-react";
import { getFileIcon, formatFileSize } from "@/utils/chatAttachmentUtils";
import { downloadFile, getFileTypeInfo } from "@/utils/downloadUtils";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type MessageAttachment = Tables<"message_attachments">;

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

export const MessageAttachments = ({
  attachments,
}: MessageAttachmentsProps) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  if (attachments.length === 0) return null;

  const setLoading = (attachmentId: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [attachmentId]: loading }));
  };

  const handleDownload = async (attachment: MessageAttachment) => {
    setLoading(attachment.id, true);

    try {
      const result = await downloadFile(
        attachment.file_url,
        attachment.file_name,
        { forceDownload: true }
      );

      if (!result.success) {
        toast({
          title: "Download Failed",
          description: result.error || "Failed to download file",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Download Started",
          description: `${attachment.file_name} is being downloaded`,
        });
      }
    } finally {
      setLoading(attachment.id, false);
    }
  };

  const handlePreview = async (attachment: MessageAttachment) => {
    const fileInfo = getFileTypeInfo(
      attachment.file_name,
      attachment.file_type
    );

    if (fileInfo.canPreview) {
      setLoading(attachment.id, true);

      try {
        const result = await downloadFile(
          attachment.file_url,
          attachment.file_name,
          { openInNewTab: true }
        );

        if (!result.success) {
          toast({
            title: "Preview Failed",
            description: result.error || "Failed to open file",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(attachment.id, false);
      }
    } else {
      // For non-previewable files, download instead
      handleDownload(attachment);
    }
  };

  const handleOpenInNewTab = async (attachment: MessageAttachment) => {
    setLoading(attachment.id, true);

    try {
      const result = await downloadFile(
        attachment.file_url,
        attachment.file_name,
        { openInNewTab: true }
      );

      if (!result.success) {
        toast({
          title: "Failed to Open",
          description: result.error || "Failed to open file in new tab",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(attachment.id, false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {attachments.map((attachment) => {
        const fileInfo = getFileTypeInfo(
          attachment.file_name,
          attachment.file_type
        );
        const isLoading = loadingStates[attachment.id];

        return (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 bg-background/50 rounded-lg border shadow-sm"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <span className="text-2xl flex-shrink-0">
                {getFileIcon(attachment.file_type)}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  title={attachment.file_name}
                >
                  {attachment.file_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 ml-3">
              {fileInfo.canPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(attachment)}
                  className="h-8 w-8 p-0"
                  title="Preview file"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenInNewTab(attachment)}
                className="h-8 w-8 p-0"
                title="Open in new tab"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(attachment)}
                className="h-8 w-8 p-0"
                title="Download file"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
