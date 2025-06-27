
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { RequirementForm } from '../requirements/RequirementForm';
import { ChatBox } from '../chat/ChatBox';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface User {
  id: string;
  company_name: string;
  website_url: string;
}

interface UserModalsProps {
  user: User;
  showNewRequirement: boolean;
  selectedRequirement: Requirement | null;
  onCloseNewRequirement: () => void;
  onCloseRequirementChat: () => void;
  onSubmitRequirement: () => void;
}

export const UserModals = ({
  user,
  showNewRequirement,
  selectedRequirement,
  onCloseNewRequirement,
  onCloseRequirementChat,
  onSubmitRequirement
}: UserModalsProps) => {
  return (
    <>
      {/* New Requirement Modal */}
      {showNewRequirement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 scale-in">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-6">
              <div>
                <h3 className="text-2xl font-bold text-white font-space-grotesk">Submit New Requirement</h3>
                <p className="text-slate-300 mt-1">Tell us about your project vision</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseNewRequirement}
                className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <RequirementForm onSubmit={onSubmitRequirement} />
          </div>
        </div>
      )}

      {/* Requirement Chat Modal */}
      {selectedRequirement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-white/20 scale-in">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-6">
              <div>
                <h3 className="text-2xl font-bold text-white font-space-grotesk">
                  Chat: {selectedRequirement.title}
                </h3>
                <p className="text-slate-300 mt-1">Communicate with admin about this requirement</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseRequirementChat}
                className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ChatBox
              requirementId={selectedRequirement.id}
              currentUserName={user.company_name}
              isCurrentChat={true}
              isAdmin={false}
            />
          </div>
        </div>
      )}
    </>
  );
};
