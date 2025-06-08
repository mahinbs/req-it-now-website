
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
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface StatusDropdownProps {
  requirement: Requirement;
  onStatusUpdate?: () => void;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
  },
  ongoing: {
    label: 'Ongoing',
    icon: Play,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-300',
    buttonColor: 'bg-green-600 hover:bg-green-700'
  }
};

export const StatusDropdown = ({ requirement, onStatusUpdate }: StatusDropdownProps) => {
  const [updating, setUpdating] = useState(false);
  const currentStatus = requirement.admin_status || 'pending';
  const CurrentIcon = statusConfig[currentStatus as keyof typeof statusConfig]?.icon || Clock;

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    setUpdating(true);
    console.log('Updating requirement status:', requirement.id, 'to:', newStatus);

    try {
      const { error } = await supabase
        .from('requirements')
        .update({ 
          admin_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error updating requirement status:', error);
        throw error;
      }

      console.log('Requirement status updated successfully');
      toast({
        title: "Status Updated",
        description: `Requirement status changed to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`,
      });

      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Failed to update requirement status:', error);
      toast({
        title: "Error",
        description: "Failed to update requirement status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig];

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className={currentConfig?.color || statusConfig.pending.color}>
        <CurrentIcon className="h-3 w-3 mr-1" />
        {currentConfig?.label || 'Pending'}
      </Badge>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={updating}
            className="flex items-center space-x-1"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Change Status</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const isActive = status === currentStatus;
            
            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`flex items-center space-x-2 cursor-pointer ${
                  isActive ? 'bg-slate-100 font-medium' : ''
                }`}
                disabled={isActive}
              >
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
                {isActive && <span className="text-xs text-slate-500">(Current)</span>}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
