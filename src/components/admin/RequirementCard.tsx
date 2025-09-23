
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RequirementCardHeader } from './RequirementCardHeader';
import { RequirementCardContent } from './RequirementCardContent';
import { RequirementCardAttachments } from './RequirementCardAttachments';
import { RequirementCardActions } from './RequirementCardActions';
import { RejectionResponseModal } from './RejectionResponseModal';
import { RequirementViewModal } from '../common/RequirementViewModal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquare, RotateCcw } from 'lucide-react';
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
  onDownloadAttachment?: (url: string, fileName: string) => void;
}

export const RequirementCard = ({ 
  requirement, 
  onOpenChat, 
  unreadCount = 0,
  onMarkAsRead,
  onApprovalUpdate,
  onDownloadAttachment 
}: RequirementCardProps) => {
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const handleOpenChat = (req: Requirement) => {
    // Mark as read when opening chat
    if (unreadCount > 0 && onMarkAsRead) {
      onMarkAsRead(requirement.id);
    }
    
    onOpenChat(req);
  };

  // Handle status update with additional logging
  const handleStatusUpdate = () => {
    if (onApprovalUpdate) {
      onApprovalUpdate();
    }
  };

  const handleRejectionUpdate = () => {
    setShowRejectionModal(false);
    handleStatusUpdate();
  };

  // Check if task was recently reopened
  const wasRecentlyReopened = requirement.admin_response_to_rejection && 
                              !requirement.rejected_by_client && 
                              requirement.rejection_reason;
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow relative h-fit flex flex-col">
        {/* Reopened Task Banner */}
        {wasRecentlyReopened && (
          <div className="bg-green-900/30 border-b border-green-500/30 p-3 flex-shrink-0">
            <div className="flex items-start space-x-2">
              <RotateCcw className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-green-300">Task Reopened</h4>
                <p className="text-xs text-green-200 mt-1">
                  This task was reopened after addressing client concerns. Continue working and mark as complete when ready.
                </p>
                <div className="mt-2 p-2 bg-slate-800/50 border border-green-500/30 rounded text-xs">
                  <span className="font-medium text-green-300">Your Response: </span>
                  <span className="text-green-200">{requirement.admin_response_to_rejection}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Alert Banner */}
        {requirement.rejected_by_client && (
          <div className="bg-red-900/30 border-b border-red-500/30 p-3 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 min-w-0 flex-1">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-red-300">Rejected by Client</h4>
                  <p className="text-xs text-red-200 mt-1 line-clamp-2">
                    {requirement.rejection_reason || 'No specific reason provided'}
                  </p>
                  {requirement.admin_response_to_rejection && (
                    <div className="mt-2 p-2 bg-blue-900/30 border border-blue-500/30 rounded text-xs">
                      <span className="font-medium text-blue-300">Your Response: </span>
                      <span className="text-blue-200">{requirement.admin_response_to_rejection}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setShowRejectionModal(true)}
                size="sm"
                variant="outline"
                className="ml-2 text-red-300 border-red-500/50 hover:bg-red-900/20 hover:text-red-200 hover:border-red-400 flex-shrink-0"
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
        
        <CardContent className="pt-0 flex-1 flex flex-col">
          <div className="flex-1 space-y-4">
            <RequirementCardContent requirement={requirement} />
            
            <RequirementCardAttachments requirement={requirement} />
            
            <div className="text-xs text-slate-400">
              Website: {requirement.profiles?.website_url || 'Not provided'}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-600/30">
            <RequirementCardActions
              requirement={requirement}
              unreadCount={unreadCount}
              onOpenChat={handleOpenChat}
              onStatusUpdate={handleStatusUpdate}
              onViewRequirement={() => setShowViewModal(true)}
            />
          </div>
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

      {/* Requirement View Modal */}
      {showViewModal && (
        <RequirementViewModal
          requirement={requirement}
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          onDownloadAttachment={onDownloadAttachment}
        />
      )}
    </>
  );
};
