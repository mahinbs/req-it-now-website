
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChatBox } from '../chat/ChatBox';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface ChatModalProps {
  requirement: Requirement | null;
  onClose: () => void;
  onMarkAsRead?: (requirementId: string) => void;
}

export const ChatModal = ({ requirement, onClose, onMarkAsRead }: ChatModalProps) => {
  if (!requirement) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-white font-space-grotesk">
              Chat: {requirement.title}
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              {requirement.profiles?.company_name || 'Unknown Company'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 text-xl h-8 w-8 p-0"
          >
            ×
          </Button>
        </div>
        
        <div className="min-h-[500px]">
          <ChatBox
            requirementId={requirement.id}
            currentUserName="Admin"
            isAdmin={true}
            isCurrentChat={true}
            onMarkAsRead={onMarkAsRead}
          />
        </div>
      </div>
    </div>
  );
};
