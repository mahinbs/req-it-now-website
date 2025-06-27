
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface CompletionButtonProps {
  requirement: Requirement;
  onCompletionUpdate: () => void;
}

export const CompletionButton = ({ requirement, onCompletionUpdate }: CompletionButtonProps) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleMarkComplete = async () => {
    try {
      setIsCompleting(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to mark requirements as complete');
      }

      const { error } = await supabase
        .from('requirements')
        .update({
          completed_by_admin: true,
          completion_date: new Date().toISOString(),
          status: 'completed_by_admin'
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error marking requirement as complete:', error);
        throw error;
      }

      toast({
        title: "Work Completed",
        description: `${requirement.title} has been marked as completed. Client will be notified to review and approve the work.`
      });

      onCompletionUpdate();
    } catch (error) {
      console.error('Error completing requirement:', error);
      toast({
        title: "Error",
        description: "Failed to mark requirement as complete. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Show completion status if already completed
  if (requirement.completed_by_admin) {
    return (
      <div className="flex items-center space-x-2 text-green-300">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Work Completed</span>
        {requirement.accepted_by_client && (
          <span className="text-xs text-green-400 font-medium">& Approved</span>
        )}
        {requirement.rejected_by_client && (
          <span className="text-xs text-orange-400 font-medium">& Needs Changes</span>
        )}
      </div>
    );
  }

  // Only show completion button if approved by admin but not yet completed
  if (!requirement.approved_by_admin) {
    return null;
  }

  return (
    <Button
      onClick={handleMarkComplete}
      disabled={isCompleting}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
    >
      {isCompleting ? (
        <div className="flex items-center space-x-1">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          <span>Completing...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>Mark Work Complete</span>
        </div>
      )}
    </Button>
  );
};
