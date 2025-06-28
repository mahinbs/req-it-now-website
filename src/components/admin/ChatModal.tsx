
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatBoxUltraFast } from '@/components/chat/ChatBoxUltraFast';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  requirementTitle: string;
  currentUserName: string;
  onMarkAsRead?: (requirementId: string) => void;
}

export const ChatModal = ({
  isOpen,
  onClose,
  requirementId,
  requirementTitle,
  currentUserName,
  onMarkAsRead
}: ChatModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold truncate">
            Chat: {requirementTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ChatBoxUltraFast
            requirementId={requirementId}
            currentUserName={currentUserName}
            isAdmin={true}
            isCurrentChat={isOpen}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
