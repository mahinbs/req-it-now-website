
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, MessageCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RejectionModalProps {
  requirement: Requirement;
  onClose: () => void;
  onReject: () => void;
}

const rejectionReasons = [
  'Not as per requirements', 
  'Quality issues', 
  'Missing functionality', 
  'Design concerns', 
  'Performance issues', 
  'Other (please specify)'
];

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
        {/* Fixed Header */}
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

        {/* Scrollable Content */}
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Requirement Summary */}
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

            {/* Rejection Reasons */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">Please select a reason for rejection:</h3>
              <div className="grid gap-2">
                {rejectionReasons.map(reason => (
                  <label key={reason} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                    <input 
                      type="radio" 
                      name="rejectionReason" 
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="text-red-600" 
                    />
                    <span className="text-sm text-slate-700">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            {selectedReason === 'Other (please specify)' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Please specify the reason:
                </label>
                <Textarea 
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please describe the specific issues you found..."
                  className="min-h-[100px]"
                />
              </div>
            )}

            {/* Communication Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-800 mb-1">Next Steps</h3>
                  <p className="text-sm text-blue-700">
                    After rejection, our admin team will review your feedback and either:
                    <br />• Make the necessary revisions
                    <br />• Contact you via chat for clarification
                    <br />• Provide an updated version for review
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Fixed Action Buttons */}
        <div className="flex-shrink-0 border-t bg-white p-6">
          <div className="flex items-center justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={isRejecting || !selectedReason} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRejecting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Rejecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Confirm Rejection</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
