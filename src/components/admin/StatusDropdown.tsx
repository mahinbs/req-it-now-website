
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Clock, Play, CheckCircle, Loader2, AlertTriangle, RotateCcw, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { adminStatusConfig } from '@/utils/requirementUtils';
import { useAutoCompletion } from '@/hooks/useAutoCompletion';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface StatusDropdownProps {
  requirement: Requirement;
  onStatusUpdate?: () => void;
}

const statusIcons = {
  pending: Clock,
  ongoing: Play,
  completed: CheckCircle,
  closed: XCircle
};

export const StatusDropdown = ({ requirement, onStatusUpdate }: StatusDropdownProps) => {
  const [updating, setUpdating] = useState(false);
  // Use local state to handle optimistic updates
  const [currentStatus, setCurrentStatus] = useState(requirement.admin_status || 'pending');
  
  // Auto-completion hook
  const { autoCompletionInfo } = useAutoCompletion(requirement);
  
  // Update local state when requirement prop changes (real-time updates)
  useEffect(() => {
    setCurrentStatus(requirement.admin_status || 'pending');
  }, [requirement.admin_status]);

  const CurrentIcon = statusIcons[currentStatus as keyof typeof statusIcons] || Clock;

  // Check if task was recently reopened
  const wasRecentlyReopened = requirement.admin_response_to_rejection && 
                              !requirement.rejected_by_client && 
                              requirement.rejection_reason;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || updating) return;
    
    // Don't allow status changes on rejected requirements through this dropdown
    if (requirement.rejected_by_client) {
      toast({
        title: "Cannot Change Status",
        description: "This requirement was rejected by the client. Use the 'Respond' button to address the rejection.",
        variant: "destructive"
      });
      return;
    }
    
    setUpdating(true);
    console.log('Updating requirement status:', {
      requirementId: requirement.id,
      currentStatus,
      newStatus,
      userId: requirement.user_id,
      wasReopened: wasRecentlyReopened
    });

    // Optimistic update - immediately show the new status
    const previousStatus = currentStatus;
    setCurrentStatus(newStatus);

    try {
      // The database trigger will handle all the status synchronization
      // We just need to update the admin_status field
      const { error } = await supabase
        .from('requirements')
        .update({ 
          admin_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Supabase error updating requirement status:', error);
        // Revert optimistic update on error
        setCurrentStatus(previousStatus);
        throw error;
      }

      console.log('Requirement status updated successfully - database trigger handled synchronization');
      const statusLabel = adminStatusConfig[newStatus as keyof typeof adminStatusConfig]?.label || newStatus;
      toast({
        title: "Status Updated",
        description: `Requirement status changed to ${statusLabel}${wasRecentlyReopened ? ' (Reopened Task)' : ''}`,
      });

      // Call the callback to refresh data in parent components
      if (onStatusUpdate) {
        console.log('Calling onStatusUpdate callback after status change');
        onStatusUpdate();
      }
    } catch (error: any) {
      console.error('Failed to update requirement status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update requirement status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  // Show rejection status if requirement is rejected
  if (requirement.rejected_by_client) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Rejected by Client
      </Badge>
    );
  }

  // Show auto-completion status if applicable
  if (autoCompletionInfo.isAwaitingReview && autoCompletionInfo.shouldAutoComplete) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Auto-Completed
      </Badge>
    );
  }

  const currentConfig = adminStatusConfig[currentStatus as keyof typeof adminStatusConfig];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={updating}
          className={`flex items-center space-x-2 ${updating ? 'opacity-75' : ''}`}
        >
          {updating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </>
          ) : (
            <>
              <Badge 
                variant="outline" 
                className={`${currentConfig?.color || adminStatusConfig.pending.color} ${
                  wasRecentlyReopened ? 'ring-2 ring-green-200' : ''
                }`}
              >
                {wasRecentlyReopened && <RotateCcw className="h-3 w-3 mr-1" />}
                <CurrentIcon className="h-3 w-3 mr-1" />
                {wasRecentlyReopened ? 'Reopened' : currentConfig?.label || 'Pending'}
              </Badge>
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-white border shadow-lg z-50">
        {Object.entries(adminStatusConfig).map(([status, config]) => {
          const Icon = statusIcons[status as keyof typeof statusIcons];
          const isActive = status === currentStatus;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`flex items-center space-x-2 cursor-pointer ${
                isActive ? 'bg-slate-100 font-medium' : ''
              }`}
              disabled={isActive || updating}
            >
              <Icon className="h-4 w-4" />
              <span>{config.label}</span>
              {isActive && <span className="text-xs text-slate-500">(Current)</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
