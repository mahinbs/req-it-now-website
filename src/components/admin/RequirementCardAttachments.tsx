
import React from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Video } from 'lucide-react';
import { getUniqueAttachments } from '@/utils/requirementUtils';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementCardAttachmentsProps {
  requirement: Requirement;
}

export const RequirementCardAttachments = ({ requirement }: RequirementCardAttachmentsProps) => {
  const attachments = getUniqueAttachments(requirement);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      <h4 className="text-sm font-medium text-slate-700 flex items-center">
        <Paperclip className="h-4 w-4 mr-1" />
        Attachments ({attachments.length})
      </h4>
      <div className="space-y-1">
        {attachments.map((attachment, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <div className="flex items-center space-x-2">
              {attachment.type === 'video' ? (
                <Video className="h-4 w-4 text-blue-600" />
              ) : (
                <Paperclip className="h-4 w-4 text-slate-600" />
              )}
              <span className="text-sm text-slate-700 truncate max-w-48">
                {attachment.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(attachment.url, '_blank')}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              Open
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
