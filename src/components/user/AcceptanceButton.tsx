
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, AlertCircle, Clock } from 'lucide-react';
import { AcceptanceModal } from './AcceptanceModal';
import { RejectionModal } from './RejectionModal';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface AcceptanceButtonProps {
  requirement: Requirement;
  onAcceptanceUpdate: () => void;
}

export const AcceptanceButton = ({ requirement, onAcceptanceUpdate }: AcceptanceButtonProps) => {
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
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

  // Enhanced accept/reject handlers with optimistic updates
  const handleAcceptStart = () => {
    setIsProcessing(true);
    setShowAcceptModal(true);
  };

  const handleRejectStart = () => {
    setIsProcessing(true);
    setShowRejectModal(true);
  };

  const handleModalClose = () => {
    setIsProcessing(false);
    setShowAcceptModal(false);
    setShowRejectModal(false);
  };

  const handleAcceptanceComplete = () => {
    setIsProcessing(false);
    setShowAcceptModal(false);
    // Trigger immediate update
    onAcceptanceUpdate();
  };

  const handleRejectionComplete = () => {
    setIsProcessing(false);
    setShowRejectModal(false);
    // Trigger immediate update
    onAcceptanceUpdate();
  };

  // Show Accept/Reject buttons only when work is completed but not yet decided
  return (
    <>
      <div className="w-full p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg border border-slate-500/50 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            onClick={handleAcceptStart}
            size="sm"
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-medium"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Accept Work
          </Button>

          <Button
            onClick={handleRejectStart}
            size="sm"
            variant="outline"
            disabled={isProcessing}
            className="flex-1 bg-slate-700/50 border-red-400/50 text-red-300 hover:bg-red-900/30 hover:border-red-400 hover:text-red-200 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <X className="h-4 w-4 mr-2" />
            Request Changes
          </Button>
        </div>
      </div>

      {showAcceptModal && (
        <AcceptanceModal
          requirement={requirement}
          onClose={handleModalClose}
          onAccept={handleAcceptanceComplete}
        />
      )}

      {showRejectModal && (
        <RejectionModal
          requirement={requirement}
          onClose={handleModalClose}
          onReject={handleRejectionComplete}
        />
      )}
    </>
  );
};
