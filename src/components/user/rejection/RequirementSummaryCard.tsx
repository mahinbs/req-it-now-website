
import React from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementSummaryCardProps {
  requirement: Requirement;
}

export const RequirementSummaryCard = ({ requirement }: RequirementSummaryCardProps) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h3 className="font-semibold text-slate-800 mb-2">Requirement Details</h3>
      <div className="space-y-2">
        <div>
          <span className="font-medium text-slate-700">Title:</span> 
          <span className="text-slate-900 ml-2">{requirement.title}</span>
        </div>
        <div>
          <span className="font-medium text-slate-700">Description:</span>
          <p className="mt-1 text-sm text-slate-600">{requirement.description}</p>
        </div>
      </div>
    </div>
  );
};
