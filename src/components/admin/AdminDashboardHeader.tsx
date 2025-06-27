
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw, Shield, Activity } from 'lucide-react';
import { Logo } from '../ui/logo';

interface AdminDashboardHeaderProps {
  onRefresh: () => void;
  onLogout: () => void;
  refreshing: boolean;
}

export const AdminDashboardHeader = ({ onRefresh, onLogout, refreshing }: AdminDashboardHeaderProps) => {
  return (
    <div className="glass border-b border-white/10 shadow-2xl relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 animated-gradient opacity-5"></div>
      
      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="bg-gradient-to-br from-red-500 to-purple-600 p-3 rounded-2xl shadow-lg neon-glow-purple float">
                <Logo size="sm" className="text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-purple-500 to-pink-400 bg-clip-text text-transparent font-space-grotesk">
                  BoostMySites Admin
                </h1>
                <div className="flex items-center space-x-1 bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full text-xs font-medium text-white shadow-lg">
                  <Shield className="h-3 w-3" />
                  <span>ADMIN</span>
                </div>
              </div>
              <p className="text-slate-400 font-medium tracking-wide">Manage website requirements and communicate with clients</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 glass px-4 py-2 rounded-xl border border-white/10">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300 font-medium">System Active</span>
            </div>
            
            <Button 
              variant="outline" 
              onClick={onRefresh} 
              disabled={refreshing}
              className="glass border-white/20 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              <RefreshCw className={`h-4 w-4 mr-2 relative z-10 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="relative z-10">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            
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
