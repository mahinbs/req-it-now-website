
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  
  const ITEMS_PER_PAGE = 12; // Show 12 items per page (4 rows of 3 cards)

  useEffect(() => {
    let mounted = true;
    let requirementsChannel: any = null;
    let profilesChannel: any = null;

    const initializeDashboard = async () => {
      try {
        await Promise.all([
          fetchRequirements(1, false),
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
                    fetchRequirements(1, false), // Always refresh to page 1 when data changes
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
            }, 5000);
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
                  Promise.all([
                    fetchRequirements(1, false), // Always refresh to page 1 when data changes
                    fetchStatusCounts() // Also refresh status counts
                  ]);
                }
              }, 200);
            }
          }
        )
        .subscribe();
    };

    initializeDashboard();

    return () => {
      console.log('Cleaning up admin dashboard subscriptions');
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (requirementsChannel) {
        supabase.removeChannel(requirementsChannel);
      }
      if (profilesChannel) {
        supabase.removeChannel(profilesChannel);
      }
    };
  }, []);

  const fetchStatusCounts = async () => {
    try {
      console.log('Fetching status counts...');
      const [pendingResult, inProgressResult, completedResult] = await Promise.all([
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
          .eq('admin_status', 'pending')
          .is('approved_by_admin', false)
          .is('completed_by_admin', false),
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
          .or('admin_status.eq.ongoing,approved_by_admin.eq.true')
          .is('completed_by_admin', false),
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
          .or('admin_status.eq.completed,completed_by_admin.eq.true,accepted_by_client.eq.true')
      ]);

      const pendingCount = pendingResult.count || 0;
      const inProgressCount = inProgressResult.count || 0;
      const completedCount = completedResult.count || 0;

      setStatusCounts({
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount
      });

      console.log('Status counts updated:', { pendingCount, inProgressCount, completedCount });
    } catch (error) {
      console.error('Error fetching status counts:', error);
      // Don't throw error here as it's not critical for main functionality
    }
  };

  const fetchRequirements = async (page: number = 1, append: boolean = false) => {
    try {
      console.log('Fetching requirements for page:', page);
      setError(null);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Current user:', user.id);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const [requirementsResult, profilesResult, countResult] = await Promise.all([
        supabase
          .from('requirements')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to),
        supabase
          .from('profiles')
          .select('id, company_name, website_url'),
        supabase
          .from('requirements')
          .select('*', { count: 'exact', head: true })
      ]);

      const { data: requirementsData, error: requirementsError } = requirementsResult;
      const { data: profilesData, error: profilesError } = profilesResult;
      const { count: totalCount, error: countError } = countResult;

      if (requirementsError) {
        console.error('Error fetching requirements:', requirementsError);
        throw requirementsError;
      }

      if (profilesError) {
        console.warn('Error fetching profiles (continuing without profile data):', profilesError);
      }

      if (countError) {
        console.warn('Error fetching count (continuing without count):', countError);
      }

      console.log('Requirements fetched:', requirementsData?.length || 0);
      console.log('Profiles fetched:', profilesData?.length || 0);
      console.log('Total count:', totalCount);

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
      
      if (append) {
        setRequirements(prev => [...prev, ...requirementsWithProfiles]);
      } else {
        setRequirements(requirementsWithProfiles);
      }
      
      setTotalCount(totalCount || 0);
      setHasMore((requirementsWithProfiles.length === ITEMS_PER_PAGE) && (from + ITEMS_PER_PAGE < (totalCount || 0)));
      setCurrentPage(page);
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
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('Manual refresh triggered');
    await Promise.all([
      fetchRequirements(1, false),
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
          fetchRequirements(1, false),
          fetchStatusCounts()
        ]);
        console.log('Data refreshed successfully after approval update');
      } catch (error) {
        console.error('Error refreshing data after approval update:', error);
      }
    }, 100);
  };

  const loadMoreRequirements = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    await fetchRequirements(nextPage, true);
  };

  const goToPage = async (page: number) => {
    if (page === currentPage || page < 1) return;
    
    setLoading(true);
    await fetchRequirements(page, false);
  };

  return {
    requirements,
    loading,
    refreshing,
    error,
    setError,
    handleRefresh,
    handleApprovalUpdate,
    currentPage,
    totalCount,
    hasMore,
    isLoadingMore,
    loadMoreRequirements,
    goToPage,
    ITEMS_PER_PAGE,
    statusCounts
  };
};
