
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, ExternalLink, XCircle } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import { CloseRequirementModal } from './CloseRequirementModal';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface RequirementCardActionsProps {
  requirement: Requirement;
  unreadCount: number;
  onOpenChat: (requirement: Requirement) => void;
  onStatusUpdate: () => void;
  onViewRequirement: () => void;
}

export const RequirementCardActions = ({ 
  requirement, 
  unreadCount, 
  onOpenChat, 
  onStatusUpdate,
  onViewRequirement 
}: RequirementCardActionsProps) => {
  const navigate = useNavigate();
  const [showCloseModal, setShowCloseModal] = useState(false);

  const handleOpenChat = () => {
    console.log('Opening chat for requirement:', requirement.id, 'Unread count:', unreadCount);
    onOpenChat(requirement);
  };

  const handleViewInPage = () => {
    navigate(`/requirement/${requirement.id}`);
  };

  const handleCloseSuccess = () => {
    setShowCloseModal(false);
    onStatusUpdate();
  };

  // Check if requirement is already closed or completed
  const isClosed = requirement.admin_status === 'closed' || requirement.admin_status === 'completed';
  const isRejected = requirement.rejected_by_client;

  return (
    <>
      <div className="space-y-3">
        {/* Status Dropdown - Full Width */}
        <div className="w-full">
          <StatusDropdown 
            requirement={requirement} 
            onStatusUpdate={onStatusUpdate} 
          />
        </div>
        
        {/* Action Buttons - Consistent Grid Layout */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={onViewRequirement}
            size="sm"
            variant="outline"
            className="w-full h-9 bg-slate-700/60 border-slate-500 text-slate-100 hover:bg-slate-600/80 hover:border-slate-400 hover:text-white transition-all duration-200 font-medium"
            title="View in modal"
          >
            <Eye className="h-4 w-4 flex-shrink-0" />
          </Button>
          
          <Button
            onClick={handleViewInPage}
            size="sm"
            variant="outline"
            className="w-full h-9 bg-purple-700/60 border-purple-500 text-purple-100 hover:bg-purple-600/80 hover:border-purple-400 hover:text-white transition-all duration-200 font-medium"
            title="View in page"
          >
            <ExternalLink className="h-4 w-4 flex-shrink-0" />
          </Button>
          
          <div className="relative">
            <Button
              onClick={handleOpenChat}
              size="sm"
              className={cn(
                "w-full h-9 text-white shadow-lg transition-all duration-200 font-medium",
                unreadCount > 0 
                  ? "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 ring-2 ring-yellow-400/50 shadow-yellow-400/20 animate-pulse" 
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              )}
              title={unreadCount > 0 ? 'New Messages' : 'Open Chat'}
            >
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Close Requirement Button - Only show if not already closed/completed/rejected */}
        {!isClosed && !isRejected && (
          <Button
            onClick={() => setShowCloseModal(true)}
            size="sm"
            variant="outline"
            className="w-full h-9 bg-red-700/20 border-red-500/50 text-red-300 hover:bg-red-700/40 hover:border-red-400 hover:text-red-200 transition-all duration-200 font-medium"
            title="Close requirement without completion"
          >
            <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Close This Requirement</span>
          </Button>
        )}
      </div>

      {/* Close Requirement Modal */}
      <CloseRequirementModal
        requirement={requirement}
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onSuccess={handleCloseSuccess}
      />
    </>
  );
};
