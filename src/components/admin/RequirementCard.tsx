
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RequirementCardHeader } from './RequirementCardHeader';
import { RequirementCardContent } from './RequirementCardContent';
import { RequirementCardAttachments } from './RequirementCardAttachments';
import { RequirementCardActions } from './RequirementCardActions';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface RequirementCardProps {
  requirement: Requirement;
  onOpenChat: (requirement: Requirement) => void;
  unreadCount?: number;
  onMarkAsRead?: (requirementId: string) => void;
  onApprovalUpdate?: () => void;
}

export const RequirementCard = ({ 
  requirement, 
  onOpenChat, 
  unreadCount = 0,
  onMarkAsRead,
  onApprovalUpdate 
}: RequirementCardProps) => {
  const handleOpenChat = (req: Requirement) => {
    // Mark as read when opening chat
    if (unreadCount > 0 && onMarkAsRead) {
      onMarkAsRead(requirement.id);
    }
    
    onOpenChat(req);
  };

  // Handle status update with additional logging
  const handleStatusUpdate = () => {
    console.log('Status update callback triggered for requirement:', requirement.id);
    if (onApprovalUpdate) {
      onApprovalUpdate();
    }
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow relative">
      <RequirementCardHeader 
        requirement={requirement} 
        unreadCount={unreadCount} 
      />
      
      <CardContent className="pt-0">
        <RequirementCardContent requirement={requirement} />
        
        <RequirementCardAttachments requirement={requirement} />
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500">
            Website: {requirement.profiles?.website_url || 'Not provided'}
          </span>
        </div>

        <RequirementCardActions
          requirement={requirement}
          unreadCount={unreadCount}
          onOpenChat={handleOpenChat}
          onStatusUpdate={handleStatusUpdate}
        />
      </CardContent>
    </Card>
  );
};
