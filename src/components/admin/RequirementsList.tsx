
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { RequirementCard } from './RequirementCard';
import { useUnifiedNotificationContext } from '@/hooks/useUnifiedNotifications';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface RequirementsListProps {
  requirements: Requirement[];
  onChatClick: (requirement: Requirement) => void;
  onDownloadAttachment: (url: string, fileName: string) => void;
  onRefresh: () => void;
  onApprovalUpdate?: () => void;
}

export const RequirementsList = ({ 
  requirements, 
  onChatClick, 
  onDownloadAttachment, 
  onRefresh,
  onApprovalUpdate 
}: RequirementsListProps) => {
  const { getUnreadCount, markAsRead, loading: notificationsLoading } = useUnifiedNotificationContext();

  const handleRefresh = () => {
    onRefresh();
  };

  if (requirements.length === 0) {
    return (
      <Card className="border-slate-600/50">
        <CardContent className="text-center py-12">
          <div className="bg-blue-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-white">No requirements yet</h3>
          <p className="text-slate-300">
            Waiting for users to submit their first requirements
          </p>
          <Button onClick={handleRefresh} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notificationsLoading && (
        <div className="text-center text-sm text-slate-300 py-2">
          Loading notification status...
        </div>
      )}
      
      <div className="grid gap-6 auto-rows-fr">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {requirements.map((requirement) => (
            <RequirementCard
              key={requirement.id}
              requirement={requirement}
              onOpenChat={onChatClick}
              unreadCount={getUnreadCount(requirement.id)}
              onMarkAsRead={markAsRead}
              onApprovalUpdate={onApprovalUpdate}
              onDownloadAttachment={onDownloadAttachment}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
