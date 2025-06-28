
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { RejectionReasonSelector } from './rejection/RejectionReasonSelector';
import { RequirementSummaryCard } from './rejection/RequirementSummaryCard';
import { RejectionFormActions } from './rejection/RejectionFormActions';
import { RejectionNextStepsInfo } from './rejection/RejectionNextStepsInfo';

type Requirement = Tables<'requirements'>;

interface RejectionModalProps {
  requirement: Requirement;
  onClose: () => void;
  onReject: () => void;
}

export const RejectionModal = ({
  requirement,
  onClose,
  onReject
}: RejectionModalProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const handleReject = async () => {
    const finalReason = selectedReason === 'Other (please specify)' ? customReason : selectedReason;
    
    if (!finalReason.trim()) {
      toast({
        title: "Please select a reason",
        description: "A rejection reason is required to help us improve.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRejecting(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to reject requirements');
      }

      const { error } = await supabase
        .from('requirements')
        .update({
          rejected_by_client: true,
          rejection_reason: finalReason,
          status: 'rejected_by_client'
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error rejecting requirement:', error);
        throw error;
      }

      toast({
        title: "Requirement Rejected",
        description: "Your feedback has been sent to the admin team. They will review and respond."
      });

      onReject();
      onClose();
    } catch (error) {
      console.error('Error rejecting requirement:', error);
      toast({
        title: "Error",
        description: "Failed to reject requirement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Reject Requirement</span>
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <RequirementSummaryCard requirement={requirement} />
            
            <RejectionReasonSelector
              selectedReason={selectedReason}
              customReason={customReason}
              onReasonChange={setSelectedReason}
              onCustomReasonChange={setCustomReason}
            />

            <RejectionNextStepsInfo />
          </div>
        </CardContent>

        <div className="flex-shrink-0 border-t bg-white p-6">
          <RejectionFormActions
            onCancel={onClose}
            onReject={handleReject}
            isRejecting={isRejecting}
            isDisabled={!selectedReason}
          />
        </div>
      </Card>
    </div>
  );
};
