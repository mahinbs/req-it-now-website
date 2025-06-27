
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Logo } from '../ui/logo';

interface User {
  company_name: string;
}

interface UserDashboardHeaderProps {
  user: User;
  onLogout: () => void;
}

export const UserDashboardHeader = ({ 
  user, 
  onLogout 
}: UserDashboardHeaderProps) => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Logo size="sm" className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">BoostMySites</h1>
              <p className="text-slate-600">{user.company_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
