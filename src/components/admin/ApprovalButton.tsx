
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface ApprovalButtonProps {
  requirement: Requirement;
  onApprovalUpdate: () => void;
}

export const ApprovalButton = ({ requirement, onApprovalUpdate }: ApprovalButtonProps) => {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to approve requirements');
      }

      const { error } = await supabase
        .from('requirements')
        .update({
          approved_by_admin: true,
          approved_by_admin_id: user.id,
          approval_date: new Date().toISOString(),
          status: 'approved_by_admin'
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error approving requirement:', error);
        throw error;
      }

      toast({
        title: "Requirement Approved",
        description: `${requirement.title} has been approved and client will be notified.`
      });

      onApprovalUpdate();
    } catch (error) {
      console.error('Error approving requirement:', error);
      toast({
        title: "Error",
        description: "Failed to approve requirement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (requirement.approved_by_admin) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Approved</span>
        {requirement.accepted_by_client && (
          <span className="text-xs text-green-700 font-medium">& Accepted</span>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={handleApprove}
      disabled={isApproving}
      size="sm"
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      {isApproving ? (
        <div className="flex items-center space-x-1">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          <span>Approving...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-4 w-4" />
          <span>Approve</span>
        </div>
      )}
    </Button>
  );
};
