
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
    <div className="space-y-4 mt-6">
      {/* Status Dropdown - Full Width */}
      <div className="flex justify-start">
        <StatusDropdown 
          requirement={requirement} 
          onStatusUpdate={onStatusUpdate} 
        />
      </div>
      
      {/* Action Buttons - Fixed Grid Layout */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={onViewRequirement}
          size="sm"
          variant="outline"
          className="w-full h-10 bg-slate-700/60 border-slate-500 text-slate-100 hover:bg-slate-600/80 hover:border-slate-400 hover:text-white transition-all duration-200 font-medium"
        >
          <Eye className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">View Details</span>
        </Button>
        
        <div className="relative">
          <Button
            onClick={handleOpenChat}
            size="sm"
            className={cn(
              "w-full h-10 text-white shadow-lg transition-all duration-200 font-medium",
              unreadCount > 0 
                ? "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 ring-2 ring-yellow-400/50 shadow-yellow-400/20 animate-pulse" 
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            )}
          >
            <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">
              {unreadCount > 0 ? 'New Messages' : 'Open Chat'}
            </span>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
