
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Calendar, Paperclip, Video, AlertTriangle } from 'lucide-react';
import { getStatusColor, getPriorityColor, formatDate, getUniqueAttachments } from '@/utils/requirementUtils';
import { StatusDropdown } from './StatusDropdown';
import { cn } from '@/lib/utils';
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
  const attachments = getUniqueAttachments(requirement);
  
  const handleOpenChat = () => {
    console.log('Opening chat for requirement:', requirement.id, 'Unread count:', unreadCount);
    
    // Mark as read when opening chat
    if (unreadCount > 0 && onMarkAsRead) {
      onMarkAsRead(requirement.id);
    }
    
    onOpenChat(requirement);
  };

  const getStatusBadgeVariant = () => {
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

  const getStatusText = () => {
    if (requirement.rejected_by_client) {
      return 'Rejected by Client';
    } else if (requirement.accepted_by_client) {
      return 'Accepted by Client';
    } else if (requirement.completed_by_admin) {
      return 'Awaiting Client Review';
    } else if (requirement.approved_by_admin) {
      return 'Work in Progress';
    }
    return requirement.status.replace('_', ' ');
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow relative">
      {/* Top-right notification indicator */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-red-500 text-white rounded-full text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-lg border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        </div>
      )}

      {/* Rejection indicator */}
      {requirement.rejected_by_client && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-red-500 text-white rounded-full p-1">
            <AlertTriangle className="h-3 w-3" />
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 leading-tight">
            {requirement.title}
          </CardTitle>
          <div className="flex items-center space-x-2 ml-4">
            <Badge variant="outline" className={getPriorityColor(requirement.priority)}>
              {requirement.priority}
            </Badge>
            <Badge variant="outline" className={getStatusBadgeVariant()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-slate-600 mt-2">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            {requirement.profiles?.company_name || 'Unknown Company'}
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(requirement.created_at, true)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-slate-700 mb-4 leading-relaxed">
          {requirement.description}
        </p>

        {/* Show rejection reason if rejected */}
        {requirement.rejected_by_client && requirement.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-red-800 mb-1">Client Rejection Reason:</h4>
            <p className="text-sm text-red-700">{requirement.rejection_reason}</p>
          </div>
        )}
        
        {attachments.length > 0 && (
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
        )}
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500">
            Website: {requirement.profiles?.website_url || 'Not provided'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between space-x-3">
          <StatusDropdown 
            requirement={requirement} 
            onStatusUpdate={onApprovalUpdate || (() => {})} 
          />
          
          <div className="relative">
            <Button
              onClick={handleOpenChat}
              size="sm"
              className={cn(
                "bg-blue-600 hover:bg-blue-700 flex items-center space-x-2",
                unreadCount > 0 && "ring-2 ring-red-200 ring-offset-1 shadow-lg"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{unreadCount > 0 ? 'New Messages' : 'Open Chat'}</span>
              {unreadCount > 0 && (
                <div className="ml-1 bg-red-500 text-white rounded-full text-xs font-bold min-w-[1rem] h-4 flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
