import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, MessageSquare, RotateCcw, Send } from 'lucide-react';
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

export const RejectionResponseModal = ({ requirement, onClose, onUpdate }: RejectionResponseModalProps) => {
  const [response, setResponse] = useState(requirement.admin_response_to_rejection || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'respond' | 'reopen' | null>(null);

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      toast({
        title: "Response Required",
        description: "Please provide a response to the client's rejection.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setActionType('respond');

      const { error } = await supabase
        .from('requirements')
        .update({
          admin_response_to_rejection: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', requirement.id);

      if (error) throw error;

      toast({
        title: "Response Sent",
        description: "Your response has been sent to the client."
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: "Error",
        description: "Failed to send response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  const handleReopenTask = async () => {
    try {
      setIsSubmitting(true);
      setActionType('reopen');

      const updateData: any = {
        rejected_by_client: false,
        rejection_reason: null,
        admin_status: 'pending',
        status: 'pending',
        updated_at: new Date().toISOString()
      };

      // Keep the admin response if provided
      if (response.trim()) {
        updateData.admin_response_to_rejection = response;
      }

      const { error } = await supabase
        .from('requirements')
        .update(updateData)
        .eq('id', requirement.id);

      if (error) throw error;

      // Send a message to the client about the reopening
      if (response.trim()) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            requirement_id: requirement.id,
            sender_id: (await supabase.auth.getUser()).data.user?.id!,
            content: `Task has been reopened. Admin response: ${response}`,
            is_admin: true
          });

        if (messageError) {
          console.error('Error sending reopening message:', messageError);
        }
      }

      toast({
        title: "Task Reopened",
        description: "The task has been reopened and reset to pending status."
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error reopening task:', error);
      toast({
        title: "Error",
        description: "Failed to reopen task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <span>Respond to Client Rejection</span>
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
        <CardContent className="space-y-6">
          {/* Requirement Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-800 mb-2">Requirement Details</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Title:</span> {requirement.title}
              </div>
              <div>
                <span className="font-medium">Description:</span>
                <p className="mt-1 text-sm">{requirement.description}</p>
              </div>
            </div>
          </div>

          {/* Client Rejection Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                Rejected by Client
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="font-semibold text-red-800 mb-1">Client's Rejection Reason:</h3>
              <p className="text-sm text-red-700 bg-white p-3 rounded border">
                {requirement.rejection_reason || 'No specific reason provided'}
              </p>
            </div>
          </div>

          {/* Existing Admin Response (if any) */}
          {requirement.admin_response_to_rejection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-1">Previous Admin Response:</h3>
              <p className="text-sm text-blue-700 bg-white p-3 rounded border">
                {requirement.admin_response_to_rejection}
              </p>
            </div>
          )}

          {/* Admin Response Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Your Response to Client:
            </label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Explain how you will address the client's concerns, what changes you'll make, or provide clarification..."
              className="min-h-[120px]"
            />
            <p className="text-xs text-slate-500">
              This response will be visible to the client and will help them understand your plan to address their concerns.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleSubmitResponse}
                disabled={isSubmitting || !response.trim()}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {isSubmitting && actionType === 'respond' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Send Response Only</span>
              </Button>
              
              <Button
                onClick={handleReopenTask}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
              >
                {isSubmitting && actionType === 'reopen' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                <span>Reopen Task</span>
              </Button>
            </div>
          </div>

          {/* Action Explanation */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-amber-800 mb-2">Action Options:</h3>
            <ul className="space-y-1 text-amber-700">
              <li><strong>Send Response Only:</strong> Your response will be sent to the client, but the task remains in rejected status.</li>
              <li><strong>Reopen Task:</strong> Resets the rejection, sets status back to pending, and optionally sends your response to the client.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
