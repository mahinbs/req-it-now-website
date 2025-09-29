
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Extend Window interface to include refreshTimeout
declare global {
  interface Window {
    refreshTimeout?: NodeJS.Timeout;
  }
}

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
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0
  });

  useEffect(() => {
    let mounted = true;
    let requirementsChannel: RealtimeChannel | null = null;
    let profilesChannel: RealtimeChannel | null = null;

    const initializeDashboard = async () => {
      try {
        await Promise.all([
          fetchRequirements(),
          fetchStatusCounts()
        ]);
        
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

    // Fix for window focus issue - prevent unnecessary reloads
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted && requirements.length === 0) {
        // Only reload if we have no data and the page becomes visible
        initializeDashboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

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
              // Debounce the refresh to avoid excessive calls
              clearTimeout(window.refreshTimeout);
              window.refreshTimeout = setTimeout(() => {
                if (mounted) {
                  console.log('Triggering debounced refresh due to real-time update');
                  Promise.all([
                    fetchRequirements(), // Always refresh all requirements when data changes
                    fetchStatusCounts() // Also refresh status counts
                  ]);
                }
              }, 200);
            }
          }
        )
        .subscribe((status) => {
          console.log('Requirements subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('Requirements subscription error, attempting to reconnect...');
            setTimeout(() => {
              if (mounted) {
                setupRealtimeSubscriptions();
              }
            }, 1000);
          }
        });

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
              // Debounce the refresh to avoid excessive calls
              clearTimeout(window.refreshTimeout);
              window.refreshTimeout = setTimeout(() => {
                if (mounted) {
                  console.log('Triggering debounced refresh due to profile update');
                  fetchRequirements(); // Refresh requirements to get updated profile data
                }
              }, 200);
            }
          }
        )
        .subscribe((status) => {
          console.log('Profiles subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('Profiles subscription error, attempting to reconnect...');
            setTimeout(() => {
              if (mounted) {
                setupRealtimeSubscriptions();
              }
            }, 1000);
          }
        });
    };

    initializeDashboard();

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (requirementsChannel) {
        supabase.removeChannel(requirementsChannel);
      }
      if (profilesChannel) {
        supabase.removeChannel(profilesChannel);
      }
      
      if (window.refreshTimeout) {
        clearTimeout(window.refreshTimeout);
      }
    };
  }, []);

  const fetchStatusCounts = async () => {
    try {
      console.log('Fetching status counts...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const [pendingResult, inProgressResult, completedResult, rejectedResult] = await Promise.all([
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
          .eq('admin_status', 'pending')
          .eq('rejected_by_client', false),
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
          .eq('admin_status', 'ongoing'),
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
          .eq('admin_status', 'completed'),
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
          .eq('rejected_by_client', true)
      ]);

      const pendingCount = pendingResult.count || 0;
      const inProgressCount = inProgressResult.count || 0;
      const completedCount = completedResult.count || 0;
      const rejectedCount = rejectedResult.count || 0;

      console.log('Status counts:', { pending: pendingCount, inProgress: inProgressCount, completed: completedCount, rejected: rejectedCount });
      console.log('Pending query details:', { 
        pendingResult: pendingResult.count, 
        inProgressResult: inProgressResult.count,
        completedResult: completedResult.count,
        rejectedResult: rejectedResult.count
      });
      
      // Debug: Let's also check what the actual data looks like
      const { data: sampleData } = await supabase
        .from('requirements')
        .select('id, admin_status, status, approved_by_admin, completed_by_admin, rejected_by_client')
        .limit(10);
      console.log('Sample requirements data:', sampleData);
      
      // Debug: Check all unique admin_status values
      const { data: allRequirements } = await supabase
        .from('requirements')
        .select('admin_status, status, approved_by_admin, completed_by_admin, rejected_by_client');
      console.log('All requirements status data:', allRequirements);

      setStatusCounts({
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        rejected: rejectedCount
      });
    } catch (error: unknown) {
      console.error('Error fetching status counts:', error);
      // Don't throw error for status counts as it's not critical
    }
  };

  const fetchRequirements = async () => {
    try {
      console.log('Fetching all requirements...');
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
    } catch (error: unknown) {
      console.error('Error in fetchRequirements:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load requirements data';
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
    await Promise.all([
      fetchRequirements(),
      fetchStatusCounts()
    ]);
    toast({
      title: "Refreshed",
      description: "Requirements data has been refreshed"
    });
  };

  const handleApprovalUpdate = async () => {
    console.log('Approval status updated, refreshing data...');
    // Add a small delay to ensure database update has been processed
    setTimeout(async () => {
      try {
        await Promise.all([
          fetchRequirements(),
          fetchStatusCounts()
        ]);
        console.log('Data refreshed successfully after approval update');
      } catch (error) {
        console.error('Error refreshing data after approval update:', error);
      }
    }, 100);
  };

  return {
    requirements,
    loading,
    refreshing,
    error,
    setError,
    handleRefresh,
    handleApprovalUpdate,
    statusCounts
  };
};
