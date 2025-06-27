
import React from 'react';
import { Button } from '@/components/ui/button';
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
              <h3 className="text-lg font-semibold text-slate-900">Submit New Requirement</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseNewRequirement}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </Button>
            </div>
            <RequirementForm onSubmit={onSubmitRequirement} />
          </div>
        </div>
      )}

      {/* Requirement Chat Modal */}
      {selectedRequirement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Chat: {selectedRequirement.title}
                </h3>
                <p className="text-sm text-slate-600">Communicate with admin about this requirement</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseRequirementChat}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
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
