
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { AcceptanceModal } from './AcceptanceModal';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface AcceptanceButtonProps {
  requirement: Requirement;
  onAcceptanceUpdate: () => void;
}

export const AcceptanceButton = ({ requirement, onAcceptanceUpdate }: AcceptanceButtonProps) => {
  const [showModal, setShowModal] = useState(false);

  if (!requirement.approved_by_admin) {
    return null;
  }

  if (requirement.accepted_by_client) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Accepted & Confirmed</span>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Accept & Confirm
      </Button>

      {showModal && (
        <AcceptanceModal
          requirement={requirement}
          onClose={() => setShowModal(false)}
          onAccept={onAcceptanceUpdate}
        />
      )}
    </>
  );
};
