
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

  // Only show buttons if requirement is completed by admin but not yet decided by client
  if (!requirement.completed_by_admin) {
    if (requirement.approved_by_admin) {
      return (
        <div className="flex items-center space-x-2 text-blue-600">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Work in Progress</span>
        </div>
      );
    }
    return null;
  }

  // Show final status if already decided
  if (requirement.accepted_by_client) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Accepted & Confirmed</span>
      </div>
    );
  }

  if (requirement.rejected_by_client) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <X className="h-4 w-4" />
        <span className="text-sm font-medium">Rejected - Under Review</span>
      </div>
    );
  }

  // Show Accept/Reject buttons only when work is completed but not yet decided
  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => setShowAcceptModal(true)}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Accept Work
        </Button>

        <Button
          onClick={() => setShowRejectModal(true)}
          size="sm"
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          <X className="h-4 w-4 mr-2" />
          Request Changes
        </Button>
      </div>

      {showAcceptModal && (
        <AcceptanceModal
          requirement={requirement}
          onClose={() => setShowAcceptModal(false)}
          onAccept={onAcceptanceUpdate}
        />
      )}

      {showRejectModal && (
        <RejectionModal
          requirement={requirement}
          onClose={() => setShowRejectModal(false)}
          onReject={onAcceptanceUpdate}
        />
      )}
    </>
  );
};
