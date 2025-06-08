
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

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up real-time subscriptions...');
    
    const timestamp = Date.now();
    
    const requirementsChannel = supabase
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
          fetchRequirements();
        }
      )
      .subscribe();

    const profilesChannel = supabase
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
          fetchRequirements();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(requirementsChannel);
      supabase.removeChannel(profilesChannel);
    };
  };

  const fetchRequirements = async () => {
    try {
      console.log('Fetching requirements...');
      setError(null);
      
      const fetchPromise = Promise.all([
        supabase
          .from('requirements')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, company_name, website_url')
      ]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 10000)
      );

      const [requirementsResult, profilesResult] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

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
    } catch (error) {
      console.error('Error in fetchRequirements:', error);
      setError('Failed to load requirements data');
      toast({
        title: "Error",
        description: "Failed to load requirements",
        variant: "destructive"
      });
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

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;

    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Admin dashboard loading timeout');
        setLoading(false);
        setError('Loading timeout. Please refresh to try again.');
      }
    }, 15000);

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
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  return {
    requirements,
    loading,
    refreshing,
    error,
    setError,
    handleRefresh
  };
};
