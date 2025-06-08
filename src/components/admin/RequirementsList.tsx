
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { RequirementCard } from './RequirementCard';
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
}

export const RequirementsList = ({ 
  requirements, 
  onChatClick, 
  onDownloadAttachment, 
  onRefresh 
}: RequirementsListProps) => {
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
          <Button onClick={onRefresh} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {requirements.map((requirement) => (
        <RequirementCard
          key={requirement.id}
          requirement={requirement}
          onChatClick={onChatClick}
          onDownloadAttachment={onDownloadAttachment}
        />
      ))}
    </div>
  );
};
