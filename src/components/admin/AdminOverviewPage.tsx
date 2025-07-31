import React from 'react';
import { Zap } from 'lucide-react';
import { AnalyticsCards } from './AnalyticsCards';
import { RequirementsList } from './RequirementsList';
import { NotificationDebugger } from './NotificationDebugger';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface AdminOverviewPageProps {
  requirements: Requirement[];
  totalCount: number;
  statusCounts: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  onChatClick: (requirement: Requirement) => void;
  onDownloadAttachment: (url: string, fileName: string) => void;
  onRefresh: () => void;
}

export const AdminOverviewPage = ({
  requirements,
  totalCount,
  statusCounts,
  onChatClick,
  onDownloadAttachment,
  onRefresh
}: AdminOverviewPageProps) => {
  // Memoized recent requirements for overview tab
  const recentRequirements = React.useMemo(() => {
    return requirements.slice(0, 6);
  }, [requirements]);

  return (
    <>
      <div className="scale-in">
        <AnalyticsCards 
          requirements={requirements}
          totalCount={totalCount}
          pendingCount={statusCounts.pending}
          inProgressCount={statusCounts.inProgress}
          completedCount={statusCounts.completed}
        />
      </div>
      
      <div className="glass bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
        <div className="flex items-center space-x-3 mb-6">
          <Zap className="h-6 w-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white font-space-grotesk">Recent Requirements</h2>
        </div>
        <RequirementsList
          requirements={recentRequirements}
          onChatClick={onChatClick}
          onDownloadAttachment={onDownloadAttachment}
          onRefresh={onRefresh}
        />
      </div>

      {/* Debug tool for troubleshooting notifications */}
      <NotificationDebugger />
    </>
  );
}; 