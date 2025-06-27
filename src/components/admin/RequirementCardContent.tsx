
import React from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementCardContentProps {
  requirement: Requirement;
}

export const RequirementCardContent = ({ requirement }: RequirementCardContentProps) => {
  return (
    <div className="space-y-4">
      <p className="text-slate-200 leading-relaxed line-clamp-4">
        {requirement.description}
      </p>

      {/* Show rejection reason if rejected */}
      {requirement.rejected_by_client && requirement.rejection_reason && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-200 mb-2">Client Rejection Reason:</h4>
          <p className="text-sm text-red-100 leading-relaxed">{requirement.rejection_reason}</p>
        </div>
      )}
    </div>
  );
};
