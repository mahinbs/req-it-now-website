
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
        title: "✅ Requirement Accepted",
        description: "You have successfully accepted this requirement. Our team will proceed with implementation.",
        className: "bg-green-50 border-green-200 text-green-800"
      });

      // Call onAccept first for immediate UI update
      onAccept();
      onClose();
    } catch (error) {
      console.error('Error accepting requirement:', error);
      toast({
        title: "❌ Error",
        description: "Failed to accept requirement. Please try again.",
        variant: "destructive"
      });
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl border-0 animate-in zoom-in-95 duration-300">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Accept & Confirm Requirement</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Requirement Summary */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approved Requirement
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-green-700">Title:</span>
                <span className="text-green-800 bg-white/50 px-3 py-1 rounded-lg">{requirement.title}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-green-700">Priority:</span>
                <span className="text-green-800 bg-white/50 px-3 py-1 rounded-lg capitalize">{requirement.priority}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="font-medium text-green-700">Description:</span>
                <p className="text-green-800 bg-white/50 px-3 py-2 rounded-lg text-sm leading-relaxed">{requirement.description}</p>
              </div>
              {requirement.approval_date && (
                <div className="flex items-center space-x-2 text-sm text-green-700 bg-white/50 px-3 py-1 rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span>Approved on: {new Date(requirement.approval_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Timeline */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-blue-800 mb-3">📋 Terms & Timeline</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Implementation will begin within 1-2 business days after acceptance
              </p>
              <p className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                You will receive regular updates on progress through our chat system
              </p>
              <p className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Timeline may vary based on requirement complexity and priority
              </p>
              <p className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Any changes to the approved requirement may affect timeline and cost
              </p>
            </div>
          </div>

          {/* Confirmation Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Important Notice</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  By clicking "Confirm Acceptance" below, you acknowledge that you have reviewed 
                  and agree to proceed with this requirement as approved. Our team will be 
                  notified to begin implementation.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isAccepting}
              className="hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
