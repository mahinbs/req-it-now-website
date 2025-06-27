
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Video, Download, ExternalLink } from 'lucide-react';
import { getUniqueAttachments } from '@/utils/requirementUtils';
import { downloadFile, getFileTypeInfo } from '@/utils/downloadUtils';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementCardAttachmentsProps {
  requirement: Requirement;
}

export const RequirementCardAttachments = ({
  requirement
}: RequirementCardAttachmentsProps) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const attachments = getUniqueAttachments(requirement);

  if (attachments.length === 0) {
    return null;
  }

  const setLoading = (url: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [url]: loading }));
  };

  const handleDownload = async (attachment: { url: string; name: string; type: string }) => {
    setLoading(attachment.url, true);
    
    try {
      const result = await downloadFile(
        attachment.url, 
        attachment.name, 
        { forceDownload: true }
      );

      if (!result.success) {
        toast({
          title: "Download Failed",
          description: result.error || "Failed to download file",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Download Started",
          description: `${attachment.name} is being downloaded`,
        });
      }
    } finally {
      setLoading(attachment.url, false);
    }
  };

  const handleOpenInNewTab = async (attachment: { url: string; name: string; type: string }) => {
    setLoading(attachment.url, true);
    
    try {
      const result = await downloadFile(
        attachment.url, 
        attachment.name, 
        { openInNewTab: true }
      );

      if (!result.success) {
        toast({
          title: "Failed to Open",
          description: result.error || "Failed to open file in new tab",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(attachment.url, false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center text-gray-100">
        <Paperclip className="h-4 w-4 mr-1 flex-shrink-0" />
        Attachments ({attachments.length})
      </h4>
      <div className="space-y-2">
        {attachments.map((attachment, index) => {
          const isLoading = loadingStates[attachment.url];
          
          return (
            <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                {attachment.type === 'video' ? (
                  <Video className="h-4 w-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Paperclip className="h-4 w-4 text-slate-600 flex-shrink-0" />
                )}
                <span className="text-sm text-slate-700 truncate">
                  {attachment.name}
                </span>
              </div>
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleOpenInNewTab(attachment)}
                  className="text-blue-600 hover:text-blue-700 text-xs h-8 w-8 p-0"
                  title="Open in new tab"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDownload(attachment)}
                  className="text-green-600 hover:text-green-700 text-xs h-8 w-8 p-0"
                  title="Download file"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
