
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, X, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface AcceptanceModalProps {
  requirement: Requirement;
  onClose: () => void;
  onAccept: () => void;
}

export const AcceptanceModal = ({ requirement, onClose, onAccept }: AcceptanceModalProps) => {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to accept requirements');
      }

      const { error } = await supabase
        .from('requirements')
        .update({
          accepted_by_client: true,
          acceptance_date: new Date().toISOString(),
          status: 'accepted_by_client'
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error accepting requirement:', error);
        throw error;
      }

      toast({
        title: "Requirement Accepted",
        description: "You have successfully accepted this requirement. Our team will proceed with implementation."
      });

      onAccept();
      onClose();
    } catch (error) {
      console.error('Error accepting requirement:', error);
      toast({
        title: "Error",
        description: "Failed to accept requirement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Accept & Confirm Requirement</span>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">✅ Approved Requirement</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Title:</span> {requirement.title}
              </div>
              <div>
                <span className="font-medium">Priority:</span> {requirement.priority}
              </div>
              <div>
                <span className="font-medium">Description:</span>
                <p className="mt-1 text-sm">{requirement.description}</p>
              </div>
              {requirement.approval_date && (
                <div className="flex items-center space-x-1 text-sm text-green-700">
                  <Calendar className="h-4 w-4" />
                  <span>Approved on: {new Date(requirement.approval_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Timeline */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Terms & Timeline</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• Implementation will begin within 1-2 business days after acceptance</p>
              <p>• You will receive regular updates on progress through our chat system</p>
              <p>• Timeline may vary based on requirement complexity and priority</p>
              <p>• Any changes to the approved requirement may affect timeline and cost</p>
            </div>
          </div>

          {/* Confirmation Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Important Notice</h3>
                <p className="text-sm text-amber-700">
                  By clicking "Confirm Acceptance" below, you acknowledge that you have reviewed 
                  and agree to proceed with this requirement as approved. Our team will be 
                  notified to begin implementation.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isAccepting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAccepting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Confirming...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Acceptance</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
