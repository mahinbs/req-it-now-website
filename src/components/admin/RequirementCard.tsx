
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RequirementCardHeader } from './RequirementCardHeader';
import { RequirementCardContent } from './RequirementCardContent';
import { RequirementCardAttachments } from './RequirementCardAttachments';
import { RequirementCardActions } from './RequirementCardActions';
import { RejectionResponseModal } from './RejectionResponseModal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquare } from 'lucide-react';
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
  const [showRejectionModal, setShowRejectionModal] = useState(false);

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

  const handleRejectionUpdate = () => {
    setShowRejectionModal(false);
    handleStatusUpdate();
  };
  
  return (
    <>
      <Card className="hover:shadow-md transition-shadow relative">
        {/* Rejection Alert Banner */}
        {requirement.rejected_by_client && (
          <div className="bg-red-50 border-b border-red-200 p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-red-800">Rejected by Client</h4>
                  <p className="text-xs text-red-700 mt-1 line-clamp-2">
                    {requirement.rejection_reason || 'No specific reason provided'}
                  </p>
                  {requirement.admin_response_to_rejection && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <span className="font-medium text-blue-800">Your Response: </span>
                      <span className="text-blue-700">{requirement.admin_response_to_rejection}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setShowRejectionModal(true)}
                size="sm"
                variant="outline"
                className="ml-2 text-red-600 border-red-300 hover:bg-red-50 flex-shrink-0"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Respond
              </Button>
            </div>
          </div>
        )}

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

      {/* Rejection Response Modal */}
      {showRejectionModal && (
        <RejectionResponseModal
          requirement={requirement}
          onClose={() => setShowRejectionModal(false)}
          onUpdate={handleRejectionUpdate}
        />
      )}
    </>
  );
};
