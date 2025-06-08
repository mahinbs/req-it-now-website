
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

export const useAdminDashboard = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let requirementsChannel: any = null;
    let profilesChannel: any = null;

    const initializeDashboard = async () => {
      try {
        await fetchRequirements();
        
        if (mounted) {
          setupRealtimeSubscriptions();
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        if (mounted) {
          setError('Failed to load dashboard data');
          setLoading(false);
        }
      }
    };

    const setupRealtimeSubscriptions = () => {
      console.log('Setting up real-time subscriptions...');
      
      const timestamp = Date.now();
      
      requirementsChannel = supabase
        .channel(`admin-requirements-${timestamp}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'requirements'
          },
          (payload) => {
            console.log('Requirements table changed:', payload);
            if (mounted) {
              fetchRequirements();
            }
          }
        )
        .subscribe();

      profilesChannel = supabase
        .channel(`admin-profiles-${timestamp}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            console.log('Profiles table changed:', payload);
            if (mounted) {
              fetchRequirements();
            }
          }
        )
        .subscribe();
    };

    initializeDashboard();

    return () => {
      console.log('Cleaning up admin dashboard subscriptions');
      mounted = false;
      if (requirementsChannel) {
        supabase.removeChannel(requirementsChannel);
      }
      if (profilesChannel) {
        supabase.removeChannel(profilesChannel);
      }
    };
  }, []);

  const fetchRequirements = async () => {
    try {
      console.log('Fetching requirements...');
      setError(null);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Current user:', user.id);

      const [requirementsResult, profilesResult] = await Promise.all([
        supabase
          .from('requirements')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, company_name, website_url')
      ]);

      const { data: requirementsData, error: requirementsError } = requirementsResult;
      const { data: profilesData, error: profilesError } = profilesResult;

      if (requirementsError) {
        console.error('Error fetching requirements:', requirementsError);
        throw requirementsError;
      }

      if (profilesError) {
        console.warn('Error fetching profiles (continuing without profile data):', profilesError);
      }

      console.log('Requirements fetched:', requirementsData?.length || 0);
      console.log('Profiles fetched:', profilesData?.length || 0);

      const requirementsWithProfiles: Requirement[] = requirementsData?.map(requirement => {
        const profile = profilesData?.find(p => p.id === requirement.user_id);
        return {
          ...requirement,
          profiles: profile ? {
            company_name: profile.company_name,
            website_url: profile.website_url
          } : null
        };
      }) || [];

      console.log('Final requirements with profiles:', requirementsWithProfiles.length);
      setRequirements(requirementsWithProfiles);
      setLoading(false);
    } catch (error: any) {
      console.error('Error in fetchRequirements:', error);
      const errorMessage = error.message || 'Failed to load requirements data';
      setError(errorMessage);
      setLoading(false);
      
      // Only show toast for non-auth errors to avoid spam
      if (!errorMessage.includes('authenticated')) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('Manual refresh triggered');
    await fetchRequirements();
    toast({
      title: "Refreshed",
      description: "Requirements data has been refreshed"
    });
  };

  const handleApprovalUpdate = async () => {
    console.log('Approval status updated, refreshing data...');
    await fetchRequirements();
  };

  return {
    requirements,
    loading,
    refreshing,
    error,
    setError,
    handleRefresh,
    handleApprovalUpdate
  };
};
