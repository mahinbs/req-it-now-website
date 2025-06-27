
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye } from 'lucide-react';
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
  onViewRequirement: () => void;
}

export const RequirementCardActions = ({ 
  requirement, 
  unreadCount, 
  onOpenChat, 
  onStatusUpdate,
  onViewRequirement 
}: RequirementCardActionsProps) => {
  const handleOpenChat = () => {
    console.log('Opening chat for requirement:', requirement.id, 'Unread count:', unreadCount);
    onOpenChat(requirement);
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <StatusDropdown 
          requirement={requirement} 
          onStatusUpdate={onStatusUpdate} 
        />
      </div>
      
      <div className="flex items-center space-x-2 w-full">
        <Button
          onClick={onViewRequirement}
          size="sm"
          variant="outline"
          className="flex-1 glass border-white/20 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300"
        >
          <Eye className="h-4 w-4 mr-2" />
          <span>View</span>
        </Button>
        
        <div className="flex-1 relative">
          <Button
            onClick={handleOpenChat}
            size="sm"
            className={cn(
              "w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg transition-all duration-300",
              unreadCount > 0 && "ring-2 ring-yellow-400/50 shadow-yellow-400/20"
            )}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            <span className="truncate">{unreadCount > 0 ? 'New Messages' : 'Open Chat'}</span>
            {unreadCount > 0 && (
              <div className="ml-2 bg-yellow-400 text-black rounded-full text-xs font-bold min-w-[1rem] h-4 flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
