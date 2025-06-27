
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, FileText, Paperclip, AlertTriangle, RotateCcw, Eye } from 'lucide-react';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { AcceptanceButton } from './AcceptanceButton';
import { RequirementViewModal } from '../common/RequirementViewModal';
import { useClientNotifications } from '@/hooks/useClientNotifications';
import { getStatusColor, getPriorityColor, formatDate, getAttachmentCount, adminStatusConfig } from '@/utils/requirementUtils';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementsListProps {
  requirements: Requirement[];
  onSelectRequirement: (requirement: Requirement) => void;
  onShowNewRequirement: () => void;
  onRequirementUpdate?: () => void;
}

export const RequirementsList = ({ 
  requirements, 
  onSelectRequirement, 
  onShowNewRequirement,
  onRequirementUpdate 
}: RequirementsListProps) => {
  const { getUnreadCount, markAsRead, loading: notificationsLoading } = useClientNotifications();
  const [selectedViewRequirement, setSelectedViewRequirement] = useState<Requirement | null>(null);

  const handleSelectRequirement = (requirement: Requirement) => {
    console.log('Selecting requirement for chat:', requirement.id);
    const unreadCount = getUnreadCount(requirement.id);
    
    // Mark as read when opening chat if there are unread messages
    if (unreadCount > 0) {
      markAsRead(requirement.id);
    }
    
    onSelectRequirement(requirement);
  };

  const getStatusBadgeVariant = (requirement: Requirement) => {
    if (requirement.rejected_by_client) {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (requirement.accepted_by_client) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (requirement.completed_by_admin && !requirement.accepted_by_client) {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else if (requirement.approved_by_admin) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    return getStatusColor(requirement.status);
  };

  const getStatusText = (requirement: Requirement) => {
    // Prioritize admin_status for clearer status display
    const adminStatus = requirement.admin_status || 'pending';
    
    if (requirement.rejected_by_client) {
      return 'You Rejected This Work';
    } else if (requirement.accepted_by_client) {
      return 'Completed & Approved';
    } else if (requirement.completed_by_admin && !requirement.accepted_by_client) {
      return 'Awaiting Your Review';
    } else if (adminStatus === 'ongoing') {
      return 'Work in Progress';
    } else if (adminStatus === 'completed') {
      return 'Completed - Awaiting Review';
    } else if (adminStatus === 'pending') {
      return 'Pending Review';
    }
    
    // Fallback to original status
    return requirement.status.replace('_', ' ');
  };

  const getAdminStatusDisplay = (requirement: Requirement) => {
    const adminStatus = requirement.admin_status || 'pending';
    const config = adminStatusConfig[adminStatus as keyof typeof adminStatusConfig];
    return config || adminStatusConfig.pending;
  };

  // Check if requirement was recently reopened (rejected but now has pending/ongoing status)
  const wasRecentlyReopened = (requirement: Requirement) => {
    return requirement.rejection_reason && 
           !requirement.rejected_by_client && 
           requirement.admin_response_to_rejection;
  };

  if (requirements.length === 0) {
    return (
      <Card className="border-dashed border-2 border-slate-400/50 bg-gradient-to-br from-slate-800/80 to-slate-700/80">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No requirements yet</h3>
          <p className="text-sm text-slate-300 text-center mb-6 max-w-md">
            Get started by submitting your first website requirement. Our team will review it and get back to you soon.
          </p>
          <Button onClick={onShowNewRequirement} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Plus className="h-4 w-4 mr-2" />
            Submit Your First Requirement
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {notificationsLoading && (
          <div className="text-center text-sm text-slate-300 py-2">
            Loading notification status...
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requirements.map((requirement) => {
            const attachmentCount = getAttachmentCount(requirement);
            const unreadCount = getUnreadCount(requirement.id);
            const adminStatus = getAdminStatusDisplay(requirement);
            const AdminStatusIcon = adminStatus.icon;
            const recentlyReopened = wasRecentlyReopened(requirement);
            
            return (
              <Card key={requirement.id} className="hover:shadow-md transition-shadow relative border-slate-600/50">
                {/* Rejection indicator */}
                {requirement.rejected_by_client && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-red-500 text-white rounded-full p-1">
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                  </div>
                )}

                {/* Recently Reopened indicator */}
                {recentlyReopened && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-green-500 text-white rounded-full p-1">
                      <RotateCcw className="h-3 w-3" />
                    </div>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-medium text-white leading-tight">
                      {requirement.title}
                    </CardTitle>
                    <div className="flex items-center space-x-1 ml-2">
                      <Badge variant="outline" className={getPriorityColor(requirement.priority)}>
                        {requirement.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className={getStatusBadgeVariant(requirement)}>
                      {getStatusText(requirement)}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {formatDate(requirement.created_at)}
                    </span>
                  </div>

                  {/* Admin Status Section */}
                  <div className="mt-3 p-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">Admin Status:</span>
                      <Badge variant="outline" className={adminStatus.color}>
                        <AdminStatusIcon className="h-3 w-3 mr-1" />
                        {adminStatus.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-200 mb-4 line-clamp-3">
                    {requirement.description}
                  </p>

                  {/* Show reopened notice */}
                  {recentlyReopened && (
                    <div className="bg-green-800/30 border border-green-500/50 rounded-lg p-3 mb-4">
                      <div className="flex items-start space-x-2">
                        <RotateCcw className="h-4 w-4 text-green-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-green-200">Task Reopened</h4>
                          <p className="text-xs text-green-100 mt-1">
                            The admin has addressed your concerns and reopened this task for further work.
                          </p>
                          {requirement.admin_response_to_rejection && (
                            <div className="mt-2 p-2 bg-slate-800/50 border border-green-500/30 rounded text-xs">
                              <span className="font-medium text-green-200">Admin Response: </span>
                              <span className="text-green-100">{requirement.admin_response_to_rejection}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show rejection reason if client rejected */}
                  {requirement.rejected_by_client && requirement.rejection_reason && (
                    <div className="bg-orange-800/30 border border-orange-500/50 rounded-lg p-3 mb-4">
                      <h4 className="text-sm font-medium text-orange-200 mb-1">Your Rejection Reason:</h4>
                      <p className="text-sm text-orange-100">{requirement.rejection_reason}</p>
                      {requirement.admin_response_to_rejection && (
                        <>
                          <h4 className="text-sm font-medium text-orange-200 mb-1 mt-2">Admin Response:</h4>
                          <p className="text-sm text-orange-100">{requirement.admin_response_to_rejection}</p>
                        </>
                      )}
                    </div>
                  )}
                  
                  {attachmentCount > 0 && (
                    <div className="flex items-center text-xs text-slate-400 mb-4">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {attachmentCount} attachment{attachmentCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {/* Show acceptance button for completed work that needs review */}
                  {requirement.completed_by_admin && !requirement.accepted_by_client && !requirement.rejected_by_client && (
                    <div className="mb-4 p-3 bg-blue-800/30 border border-blue-500/50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-200 mb-2">Work Completed - Please Review</h4>
                      <AcceptanceButton 
                        requirement={requirement} 
                        onAcceptanceUpdate={onRequirementUpdate || (() => {})} 
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <Button
                      onClick={() => setSelectedViewRequirement(requirement)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 bg-slate-700/50 border-slate-500 text-slate-100 hover:bg-slate-600/80 hover:text-white hover:border-slate-400 font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Button>
                    
                    <NotificationBadge count={unreadCount} pulse={unreadCount > 0}>
                      <Button
                        onClick={() => handleSelectRequirement(requirement)}
                        variant="outline"
                        size="sm"
                        className={`flex-1 flex items-center justify-center space-x-2 font-medium ${
                          unreadCount > 0 
                            ? 'bg-blue-700/60 border-blue-400/60 text-white hover:bg-blue-600/80 hover:border-blue-300 ring-2 ring-blue-400/50 ring-offset-1 shadow-lg' 
                            : 'bg-slate-700/50 border-slate-500 text-slate-100 hover:bg-blue-700/50 hover:border-blue-400 hover:text-white'
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{unreadCount > 0 ? 'New Messages' : 'Open Chat'}</span>
                        {unreadCount > 0 && (
                          <div className="ml-1 bg-blue-400 text-slate-900 rounded-full text-xs font-bold min-w-[1rem] h-4 flex items-center justify-center px-1">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </div>
                        )}
                      </Button>
                    </NotificationBadge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Requirement View Modal */}
      {selectedViewRequirement && (
        <RequirementViewModal
          requirement={selectedViewRequirement}
          isOpen={!!selectedViewRequirement}
          onClose={() => setSelectedViewRequirement(null)}
        />
      )}
    </>
  );
};
