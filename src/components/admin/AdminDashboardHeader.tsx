
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw } from 'lucide-react';
import { Logo } from '../ui/logo';

interface AdminDashboardHeaderProps {
  onRefresh: () => void;
  onLogout: () => void;
  refreshing: boolean;
}

export const AdminDashboardHeader = ({ onRefresh, onLogout, refreshing }: AdminDashboardHeaderProps) => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Logo size="md" className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">req-it-now Admin</h1>
              <p className="text-slate-600">Manage website requirements and communicate with clients</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={onRefresh} 
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
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
