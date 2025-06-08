
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Clock, Play, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { adminStatusConfig } from '@/utils/requirementUtils';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface StatusDropdownProps {
  requirement: Requirement;
  onStatusUpdate?: () => void;
}

const statusIcons = {
  pending: Clock,
  ongoing: Play,
  completed: CheckCircle
};

export const StatusDropdown = ({ requirement, onStatusUpdate }: StatusDropdownProps) => {
  const [updating, setUpdating] = useState(false);
  const currentStatus = requirement.admin_status || 'pending';
  const CurrentIcon = statusIcons[currentStatus as keyof typeof statusIcons] || Clock;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || updating) return;
    
    setUpdating(true);
    console.log('Updating requirement status:', {
      requirementId: requirement.id,
      currentStatus,
      newStatus,
      userId: requirement.user_id
    });

    try {
      const { error } = await supabase
        .from('requirements')
        .update({ 
          admin_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Supabase error updating requirement status:', error);
        throw error;
      }

      console.log('Requirement status updated successfully');
      toast({
        title: "Status Updated",
        description: `Requirement status changed to ${adminStatusConfig[newStatus as keyof typeof adminStatusConfig]?.label || newStatus}`,
      });

      // Call the callback to refresh data
      if (onStatusUpdate) {
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

  const currentConfig = adminStatusConfig[currentStatus as keyof typeof adminStatusConfig];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={updating}
          className="flex items-center space-x-2"
        >
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Badge variant="outline" className={currentConfig?.color || adminStatusConfig.pending.color}>
                <CurrentIcon className="h-3 w-3 mr-1" />
                {currentConfig?.label || 'Pending'}
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
