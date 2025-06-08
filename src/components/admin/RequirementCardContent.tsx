
import React from 'react';
import { CardContent } from '@/components/ui/card';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementCardContentProps {
  requirement: Requirement;
}

export const RequirementCardContent = ({ requirement }: RequirementCardContentProps) => {
  return (
    <div>
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
    </div>
  );
};
