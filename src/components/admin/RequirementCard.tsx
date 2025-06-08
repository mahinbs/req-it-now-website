
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Calendar, Paperclip, Video } from 'lucide-react';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useNotificationContext } from '@/hooks/useGlobalNotifications';
import { getStatusColor, getPriorityColor, formatDate, getUniqueAttachments } from '@/utils/requirementUtils';
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
  isCurrentChat?: boolean;
}

export const RequirementCard = ({ requirement, onOpenChat, isCurrentChat = false }: RequirementCardProps) => {
  const attachments = getUniqueAttachments(requirement);
  const { getUnreadCount, clearNotifications } = useNotificationContext();
  const unreadCount = getUnreadCount(requirement.id);
  
  const handleOpenChat = () => {
    console.log('Opening chat for requirement:', requirement.id);
    // Clear notifications when opening chat
    clearNotifications(requirement.id);
    onOpenChat(requirement);
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 leading-tight">
            {requirement.title}
          </CardTitle>
          <div className="flex items-center space-x-2 ml-4">
            <Badge variant="outline" className={getPriorityColor(requirement.priority)}>
              {requirement.priority}
            </Badge>
            <Badge variant="outline" className={getStatusColor(requirement.status)}>
              {requirement.status.replace('_', ' ')}
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
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Website: {requirement.profiles?.website_url || 'Not provided'}
          </span>
          <NotificationBadge count={unreadCount} pulse={unreadCount > 0}>
            <Button
              onClick={handleOpenChat}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Open Chat</span>
            </Button>
          </NotificationBadge>
        </div>
      </CardContent>
    </Card>
  );
};
