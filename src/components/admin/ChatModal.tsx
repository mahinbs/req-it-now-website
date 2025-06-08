
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
}

export const ChatModal = ({ requirement, onClose }: ChatModalProps) => {
  if (!requirement) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Chat: {requirement.title}
            </h3>
            <p className="text-sm text-slate-600">{requirement.profiles?.company_name || 'Unknown Company'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </Button>
        </div>
        <ChatBox
          requirementId={requirement.id}
          currentUserName="Admin"
          isAdmin={true}
          isCurrentChat={true}
        />
      </div>
    </div>
  );
};
