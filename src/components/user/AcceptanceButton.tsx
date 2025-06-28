
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, AlertCircle, Clock } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface AcceptanceButtonProps {
  requirement: Requirement;
  onAcceptanceUpdate: () => void;
}

export const AcceptanceButton = ({ requirement, onAcceptanceUpdate }: AcceptanceButtonProps) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // Only show buttons if requirement is completed by admin but not yet decided by client
  if (!requirement.completed_by_admin) {
    if (requirement.approved_by_admin) {
      return (
        <div className="flex items-center space-x-2 text-blue-300 bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-500/30">
          <Clock className="h-4 w-4 animate-pulse" />
          <span className="text-sm font-medium">Work in Progress</span>
        </div>
      );
    }
    return null;
  }

  // Show final status if already decided
  if (requirement.accepted_by_client) {
    return (
      <div className="flex items-center space-x-2 text-green-300 bg-green-900/30 px-3 py-2 rounded-lg border border-green-500/30 shadow-sm">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Accepted & Confirmed</span>
      </div>
    );
  }

  if (requirement.rejected_by_client) {
    return (
      <div className="flex items-center space-x-2 text-red-300 bg-red-900/30 px-3 py-2 rounded-lg border border-red-500/30 shadow-sm">
        <X className="h-4 w-4" />
        <span className="text-sm font-medium">Rejected - Under Review</span>
      </div>
    );
  }

  // Enhanced accept/reject handlers
  const handleAcceptStart = () => {
    setIsProcessing(true);
    navigate(`/accept-requirement/${requirement.id}`);
  };

  const handleRejectStart = () => {
    navigate(`/reject-requirement/${requirement.id}`);
  };

  // Show Accept/Reject buttons only when work is completed but not yet decided
  return (
    <div className="max-w-full p-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg border border-slate-500/50 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <Button
          onClick={handleAcceptStart}
          size="sm"
          disabled={isProcessing}
          className="flex-1 min-w-0 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-medium"
        >
          <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">Accept Work</span>
        </Button>

        <Button
          onClick={handleRejectStart}
          size="sm"
          variant="outline"
          disabled={isProcessing}
          className="flex-1 min-w-0 bg-slate-700/50 border-red-400/50 text-red-300 hover:bg-red-900/30 hover:border-red-400 hover:text-red-200 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
        >
          <X className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">Request Changes</span>
        </Button>
      </div>
    </div>
  );
};
