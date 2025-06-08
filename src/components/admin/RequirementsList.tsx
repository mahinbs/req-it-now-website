
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { RequirementCard } from './RequirementCard';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
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
  const { getUnreadCount, markAsRead, loading: notificationsLoading } = useAdminNotifications();

  const handleRefresh = () => {
    onRefresh();
  };

  if (requirements.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="text-center py-12">
          <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-slate-900">No requirements yet</h3>
          <p className="text-slate-600">
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

  // Sort requirements to prioritize rejected ones and in-progress work
  const sortedRequirements = [...requirements].sort((a, b) => {
    // Rejected requirements first
    if (a.rejected_by_client && !b.rejected_by_client) return -1;
    if (!a.rejected_by_client && b.rejected_by_client) return 1;
    
    // Then completed and awaiting review
    if (a.completed_by_admin && !a.accepted_by_client && !a.rejected_by_client) return -1;
    if (b.completed_by_admin && !b.accepted_by_client && !b.rejected_by_client) return 1;
    
    // Then by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-4">
      {notificationsLoading && (
        <div className="text-center text-sm text-slate-600 py-2">
          Loading notification status...
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedRequirements.map((requirement) => (
          <RequirementCard
            key={requirement.id}
            requirement={requirement}
            onOpenChat={onChatClick}
            unreadCount={getUnreadCount(requirement.id)}
            onMarkAsRead={markAsRead}
            onApprovalUpdate={onApprovalUpdate}
          />
        ))}
      </div>
    </div>
  );
};
