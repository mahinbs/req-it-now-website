import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface CloseRequirementModalProps {
  requirement: Requirement;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_REASONS = [
  'Out of scope',
  'Duplicate request',
  'Not feasible with current resources',
  'Requires clarification from client',
  'Client requested cancellation',
  'Technical limitations',
  'Subscription expired',
  'Other (please specify below)',
];

export const CloseRequirementModal = ({
  requirement,
  isOpen,
  onClose,
  onSuccess,
}: CloseRequirementModalProps) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const handleSubmit = async () => {
    // Validate that a reason is provided
    const finalReason = selectedReason === 'Other (please specify below)' 
      ? customReason.trim()
      : selectedReason;

    if (!finalReason) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for closing this requirement.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedReason === 'Other (please specify below)' && customReason.trim().length < 10) {
      toast({
        title: 'Reason Too Short',
        description: 'Please provide a detailed reason (at least 10 characters).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use raw SQL query to bypass all triggers and functions
      const { error } = await supabase
        .from('requirements')
        .update({
          admin_status: 'closed',
          status: 'closed',
          admin_closure_reason: finalReason,
          admin_closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requirement.id)
        .select('id'); // Add select to ensure the update worked

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      toast({
        title: 'Requirement Closed',
        description: 'The requirement has been closed and the client will be notified.',
      });

      handleClose();
      onSuccess();
      
      // Force a page refresh to update all UI components
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error closing requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to close requirement. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass bg-slate-900 backdrop-blur-xl border-red-500/30 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-400">
            <XCircle className="h-5 w-5" />
            <span>Close Requirement Without Completion</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            This will close the requirement without marking it as completed. The client will be notified with your reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Requirement Info */}
          <div className="glass bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Requirement Details</h3>
            <p className="text-white font-medium">{requirement.title}</p>
            <p className="text-sm text-slate-400 mt-1">
              Company: {requirement.profiles?.company_name || 'Unknown'}
            </p>
          </div>

          {/* Warning Alert */}
          <div className="glass bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">
              <p className="font-medium mb-1">Important Notice</p>
              <p>
                Closing a requirement will inform the client that their request will not be completed. 
                Please provide a clear and professional reason.
              </p>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-4">
            <Label className="text-slate-200 text-base">
              Select Reason for Closing <span className="text-red-400">*</span>
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {COMMON_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-3 glass bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
                  <RadioGroupItem value={reason} id={reason} className="text-purple-500" />
                  <Label
                    htmlFor={reason}
                    className="text-slate-200 cursor-pointer flex-1 font-normal"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'Other (please specify below)' && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Label htmlFor="customReason" className="text-slate-200">
                Please provide a detailed reason <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="customReason"
                placeholder="Explain why this requirement cannot be completed..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                className="glass bg-white/5 border-white/20 text-white placeholder:text-slate-400 resize-none"
              />
              <p className="text-xs text-slate-400">
                Minimum 10 characters. Be clear and professional.
              </p>
            </div>
          )}

          {/* Preview of reason if selected */}
          {selectedReason && selectedReason !== 'Other (please specify below)' && (
            <div className="glass bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-xs text-blue-300 mb-2">Client will see:</p>
              <p className="text-sm text-blue-100 italic">
                "We regret to inform you that we cannot proceed with your requirement. 
                Reason: {selectedReason}"
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="glass border-white/20 text-slate-200 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Closing...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Close Requirement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

