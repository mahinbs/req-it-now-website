
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RejectionResponseModalProps {
  requirement: Requirement;
  onClose: () => void;
  onUpdate: () => void;
}

export const RejectionResponseModal = ({ 
  requirement, 
  onClose, 
  onUpdate 
}: RejectionResponseModalProps) => {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) {
      toast({
        title: "Error",
        description: "Please provide a response to the client's rejection.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    console.log('Submitting response to rejection for requirement:', requirement.id);

    try {
      // When reopening a task, set it to 'ongoing' status with proper cleanup
      const { error } = await supabase
        .from('requirements')
        .update({
          admin_response_to_rejection: response,
          rejected_by_client: false,
          rejection_reason: null, // Clear the rejection reason since it's been addressed
          admin_status: 'ongoing', // Set to ongoing since work is continuing
          status: 'approved_by_admin', // Set main status to approved for consistency
          approved_by_admin: true,
          completed_by_admin: false, // Reset completion flag
          accepted_by_client: false, // Reset acceptance flag
          completion_date: null, // Clear old completion date
          acceptance_date: null, // Clear old acceptance date
          updated_at: new Date().toISOString()
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error updating requirement:', error);
        throw error;
      }

      console.log('Requirement reopened successfully with ongoing status');
      toast({
        title: "Task Reopened",
        description: "Your response has been sent and the task has been reopened for continued work.",
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Failed to submit response:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Respond to Client Rejection
            </h3>
            <p className="text-sm text-slate-600">
              Address the client's concerns and reopen the task
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">Client's Rejection Reason:</h4>
            <p className="text-sm text-red-700">
              {requirement.rejection_reason || 'No specific reason provided'}
            </p>
          </div>

          <div>
            <label htmlFor="response" className="block text-sm font-medium text-slate-700 mb-2">
              Your Response to Client
            </label>
            <Textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Explain how you will address the client's concerns and what changes you'll make..."
              rows={6}
              className="w-full"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-1">What happens next:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• The task will be reopened and set to "Ongoing" status</li>
              <li>• Your response will be visible to the client</li>
              <li>• You can continue working on the task and mark it complete when ready</li>
              <li>• The client will be notified of your response</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? 'Sending Response...' : 'Send Response & Reopen Task'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
