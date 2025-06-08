
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, HelpCircle } from 'lucide-react';
import { Logo } from '../ui/logo';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { NotificationBadge } from '@/components/ui/NotificationBadge';

interface User {
  company_name: string;
}

interface UserDashboardHeaderProps {
  user: User;
  onShowGeneralChat: () => void;
  onLogout: () => void;
}

export const UserDashboardHeader = ({ user, onShowGeneralChat, onLogout }: UserDashboardHeaderProps) => {
  const { unreadCount, hasNewMessage } = useMessageNotifications('', false); // Empty string for general chat

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Logo size="md" className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">req-it-now</h1>
              <p className="text-slate-600">{user.company_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <NotificationBadge count={unreadCount} pulse={hasNewMessage}>
              <Button 
                onClick={onShowGeneralChat}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Chat with Admin</span>
              </Button>
            </NotificationBadge>
            <Button variant="outline" onClick={onLogout} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
