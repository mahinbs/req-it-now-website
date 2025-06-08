
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, FileText, Paperclip, AlertTriangle } from 'lucide-react';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { AcceptanceButton } from './AcceptanceButton';
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
    } else if (requirement.completed_by_admin) {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else if (requirement.approved_by_admin) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    return getStatusColor(requirement.status);
  };

  const getStatusText = (requirement: Requirement) => {
    if (requirement.rejected_by_client) {
      return 'You Rejected This Work';
    } else if (requirement.accepted_by_client) {
      return 'Completed & Approved';
    } else if (requirement.completed_by_admin) {
      return 'Awaiting Your Review';
    } else if (requirement.approved_by_admin) {
      return 'Work in Progress';
    }
    return requirement.status.replace('_', ' ');
  };

  const getAdminStatusDisplay = (requirement: Requirement) => {
    const adminStatus = requirement.admin_status || 'pending';
    const config = adminStatusConfig[adminStatus as keyof typeof adminStatusConfig];
    return config || adminStatusConfig.pending;
  };

  if (requirements.length === 0) {
    return (
      <Card className="border-dashed border-2 border-slate-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No requirements yet</h3>
          <p className="text-sm text-slate-600 text-center mb-6 max-w-md">
            Get started by submitting your first website requirement. Our team will review it and get back to you soon.
          </p>
          <Button onClick={onShowNewRequirement} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Submit Your First Requirement
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notificationsLoading && (
        <div className="text-center text-sm text-slate-600 py-2">
          Loading notification status...
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requirements.map((requirement) => {
          const attachmentCount = getAttachmentCount(requirement);
          const unreadCount = getUnreadCount(requirement.id);
          const adminStatus = getAdminStatusDisplay(requirement);
          const AdminStatusIcon = adminStatus.icon;
          
          return (
            <Card key={requirement.id} className="hover:shadow-md transition-shadow relative">
              {/* Rejection indicator */}
              {requirement.rejected_by_client && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-red-500 text-white rounded-full p-1">
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-medium text-slate-900 leading-tight">
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
                  <span className="text-xs text-slate-500">
                    {formatDate(requirement.created_at)}
                  </span>
                </div>

                {/* Admin Status Section */}
                <div className="mt-3 p-2 bg-slate-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Admin Status:</span>
                    <Badge variant="outline" className={adminStatus.color}>
                      <AdminStatusIcon className="h-3 w-3 mr-1" />
                      {adminStatus.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {requirement.description}
                </p>

                {/* Show rejection reason if client rejected */}
                {requirement.rejected_by_client && requirement.rejection_reason && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-orange-800 mb-1">Your Rejection Reason:</h4>
                    <p className="text-sm text-orange-700">{requirement.rejection_reason}</p>
                    {requirement.admin_response_to_rejection && (
                      <>
                        <h4 className="text-sm font-medium text-orange-800 mb-1 mt-2">Admin Response:</h4>
                        <p className="text-sm text-orange-700">{requirement.admin_response_to_rejection}</p>
                      </>
                    )}
                  </div>
                )}
                
                {attachmentCount > 0 && (
                  <div className="flex items-center text-xs text-slate-500 mb-4">
                    <Paperclip className="h-3 w-3 mr-1" />
                    {attachmentCount} attachment{attachmentCount !== 1 ? 's' : ''}
                  </div>
                )}
                
                {/* Show acceptance button for completed work that needs review */}
                {requirement.completed_by_admin && !requirement.accepted_by_client && !requirement.rejected_by_client && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Work Completed - Please Review</h4>
                    <AcceptanceButton 
                      requirement={requirement} 
                      onAcceptanceUpdate={onRequirementUpdate || (() => {})} 
                    />
                  </div>
                )}
                
                <NotificationBadge count={unreadCount} pulse={unreadCount > 0}>
                  <Button
                    onClick={() => handleSelectRequirement(requirement)}
                    variant="outline"
                    size="sm"
                    className={`w-full flex items-center justify-center space-x-2 hover:bg-blue-50 hover:border-blue-300 ${
                      unreadCount > 0 ? 'ring-2 ring-blue-200 ring-offset-1 shadow-lg bg-blue-50' : ''
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{unreadCount > 0 ? 'New Messages' : 'Open Chat'}</span>
                    {unreadCount > 0 && (
                      <div className="ml-1 bg-blue-500 text-white rounded-full text-xs font-bold min-w-[1rem] h-4 flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </Button>
                </NotificationBadge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
