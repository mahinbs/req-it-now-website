
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Zap, CheckCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface AnalyticsCardsProps {
  requirements: Requirement[];
}

export const AnalyticsCards = ({ requirements }: AnalyticsCardsProps) => {
  // Count requirements by admin status for more accurate analytics
  const getInProgressCount = () => {
    return requirements.filter(r => 
      r.admin_status === 'ongoing' || 
      (r.approved_by_admin && !r.completed_by_admin)
    ).length;
  };

  const getCompletedCount = () => {
    return requirements.filter(r => 
      r.admin_status === 'completed' || 
      r.completed_by_admin || 
      r.accepted_by_client
    ).length;
  };

  const getPendingCount = () => {
    return requirements.filter(r => 
      r.admin_status === 'pending' && 
      !r.approved_by_admin && 
      !r.completed_by_admin
    ).length;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="glass bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-400/20 hover:border-blue-400/40 transition-all duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-cyan-400/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="text-lg text-blue-300 font-space-grotesk flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Total Requirements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-white font-space-grotesk mb-2">
            {requirements.length}
          </div>
          <p className="text-sm text-blue-200">All time submissions</p>
          <div className="mt-3 h-1 bg-blue-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-400/20 hover:border-yellow-400/40 transition-all duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-orange-400/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="text-lg text-yellow-300 font-space-grotesk flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Pending</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-white font-space-grotesk mb-2">
            {getPendingCount()}
          </div>
          <p className="text-sm text-yellow-200">Awaiting review</p>
          <div className="mt-3 h-1 bg-yellow-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-pink-400/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="text-lg text-purple-300 font-space-grotesk flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>In Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-white font-space-grotesk mb-2">
            {getInProgressCount()}
          </div>
          <p className="text-sm text-purple-200">Being worked on</p>
          <div className="mt-3 h-1 bg-purple-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-400/20 hover:border-green-400/40 transition-all duration-300 group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-emerald-400/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="text-lg text-green-300 font-space-grotesk flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Completed</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-white font-space-grotesk mb-2">
            {getCompletedCount()}
          </div>
          <p className="text-sm text-green-200">Successfully finished</p>
          <div className="mt-3 h-1 bg-green-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
