
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Zap } from 'lucide-react';
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
    <div className="glass border-b border-white/10 shadow-2xl relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 animated-gradient opacity-5"></div>
      
      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg neon-glow float">
                <Logo size="sm" className="text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent font-space-grotesk">
                  BoostMySites
                </h1>
                <div className="flex items-center space-x-1 bg-gradient-to-r from-green-400 to-emerald-500 px-3 py-1 rounded-full text-xs font-medium text-white shadow-lg">
                  <Zap className="h-3 w-3" />
                  <span>ACTIVE</span>
                </div>
              </div>
              <p className="text-slate-400 font-medium tracking-wide">{user.company_name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 glass px-4 py-2 rounded-xl border border-white/10">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300 font-medium">Online</span>
            </div>
            
            <Button 
              variant="outline" 
              onClick={onLogout} 
              className="glass border-white/20 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              <LogOut className="h-4 w-4 mr-2 relative z-10" />
              <span className="relative z-10">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
