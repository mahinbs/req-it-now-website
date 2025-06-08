
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Plus, FileText, Paperclip } from 'lucide-react';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useNotificationContext } from '@/hooks/useGlobalNotifications';
import { getStatusColor, getPriorityColor, formatDate, getAttachmentCount } from '@/utils/requirementUtils';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementsListProps {
  requirements: Requirement[];
  onSelectRequirement: (requirement: Requirement) => void;
  onShowNewRequirement: () => void;
}

export const RequirementsList = ({ 
  requirements, 
  onSelectRequirement, 
  onShowNewRequirement 
}: RequirementsListProps) => {
  const { getUnreadCount, clearNotifications } = useNotificationContext();

  const handleSelectRequirement = (requirement: Requirement) => {
    console.log('Selecting requirement for chat:', requirement.id);
    // Clear notifications when opening chat
    clearNotifications(requirement.id);
    onSelectRequirement(requirement);
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {requirements.map((requirement) => {
        const attachmentCount = getAttachmentCount(requirement);
        const unreadCount = getUnreadCount(requirement.id);
        
        return (
          <Card key={requirement.id} className="hover:shadow-md transition-shadow">
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
                <Badge variant="outline" className={getStatusColor(requirement.status)}>
                  {requirement.status.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-slate-500">
                  {formatDate(requirement.created_at)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                {requirement.description}
              </p>
              
              {attachmentCount > 0 && (
                <div className="flex items-center text-xs text-slate-500 mb-4">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachmentCount} attachment{attachmentCount !== 1 ? 's' : ''}
                </div>
              )}
              
              <NotificationBadge count={unreadCount} pulse={unreadCount > 0}>
                <Button
                  onClick={() => handleSelectRequirement(requirement)}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center space-x-2 hover:bg-blue-50 hover:border-blue-300"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Open Chat</span>
                </Button>
              </NotificationBadge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
