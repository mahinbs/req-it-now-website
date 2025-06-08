
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface RequirementCardActionsProps {
  requirement: Requirement;
  unreadCount: number;
  onOpenChat: (requirement: Requirement) => void;
  onStatusUpdate: () => void;
}

export const RequirementCardActions = ({ 
  requirement, 
  unreadCount, 
  onOpenChat, 
  onStatusUpdate 
}: RequirementCardActionsProps) => {
  const handleOpenChat = () => {
    console.log('Opening chat for requirement:', requirement.id, 'Unread count:', unreadCount);
    onOpenChat(requirement);
  };

  return (
    <div className="flex items-center justify-between space-x-3">
      <StatusDropdown 
        requirement={requirement} 
        onStatusUpdate={onStatusUpdate} 
      />
      
      <div className="relative">
        <Button
          onClick={handleOpenChat}
          size="sm"
          className={cn(
            "bg-blue-600 hover:bg-blue-700 flex items-center space-x-2",
            unreadCount > 0 && "ring-2 ring-red-200 ring-offset-1 shadow-lg"
          )}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{unreadCount > 0 ? 'New Messages' : 'Open Chat'}</span>
          {unreadCount > 0 && (
            <div className="ml-1 bg-red-500 text-white rounded-full text-xs font-bold min-w-[1rem] h-4 flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};
