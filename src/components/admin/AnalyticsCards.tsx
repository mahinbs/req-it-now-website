
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-blue-900">Total Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-700">{requirements.length}</div>
          <p className="text-sm text-blue-600 mt-1">All time</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-yellow-900">Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-700">
            {requirements.filter(r => r.status === 'pending').length}
          </div>
          <p className="text-sm text-yellow-600 mt-1">Awaiting review</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-orange-900">In Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-700">
            {requirements.filter(r => r.status === 'in-progress').length}
          </div>
          <p className="text-sm text-orange-600 mt-1">Being worked on</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-green-900">Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-700">
            {requirements.filter(r => r.status === 'completed').length}
          </div>
          <p className="text-sm text-green-600 mt-1">Finished</p>
        </CardContent>
      </Card>
    </div>
  );
};
