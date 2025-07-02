
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface User {
  id: string;
  company_name: string;
  website_url: string;
}

export const useUserDashboardOptimized = (user: User) => {
  const [showNewRequirement, setShowNewRequirement] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [showGeneralChat, setShowGeneralChat] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchRequirements = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setRefreshing(true);
      setError(null);
      
      const [requirementsResult, profileResult] = await Promise.all([
        supabase
          .from('requirements')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, company_name, website_url')
          .eq('id', user.id)
          .single()
      ]);

      const { data: requirementsData, error: requirementsError } = requirementsResult;
      const { data: profileData, error: profileError } = profileResult;

      if (requirementsError) {
        console.error('Error fetching requirements:', requirementsError);
        throw requirementsError;
      }

      if (profileError) {
        console.warn('Error fetching profile data:', profileError);
      }

      // Add profile data to each requirement
      const requirementsWithProfiles = (requirementsData || []).map(requirement => ({
        ...requirement,
        profiles: profileData || null
      }));
      
      setRequirements(requirementsWithProfiles);
      
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setError('Failed to load requirements');
      
      // Show user-friendly error with retry
      toast({
        title: "⚠️ Connection Issue",
        description: "Failed to load requirements. Retrying...",
        variant: "destructive"
      });
      
      // Auto-retry after 2 seconds
      setTimeout(() => {
        if (user.id) {
          fetchRequirements();
        }
      }, 2000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  // Optimized real-time subscription with debouncing
  useEffect(() => {
    let mounted = true;
    let requirementsChannel: any = null;
    let debounceTimer: NodeJS.Timeout;

    const initializeDashboard = async () => {
      try {
        await fetchRequirements();
        
        if (mounted) {
          setupOptimizedRealtimeSubscription();
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        if (mounted) {
          setError('Failed to load dashboard data');
          setLoading(false);
        }
      }
    };

    const setupOptimizedRealtimeSubscription = () => {
      const timestamp = Date.now();
      const channelName = `user-requirements-optimized-${user.id}-${timestamp}`;
      
      requirementsChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'requirements',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (!mounted) return;

            // Debounce updates to prevent excessive re-renders
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              console.log('Optimized requirements update:', payload);
              
              // Optimistic update for better UX
              if (payload.eventType === 'UPDATE' && payload.new) {
                setRequirements(prev => 
                  prev.map(req => 
                    req.id === payload.new.id ? { ...req, ...payload.new } : req
                  )
                );
              } else if (payload.eventType === 'INSERT' && payload.new) {
                setRequirements(prev => [payload.new as Requirement, ...prev]);
              } else if (payload.eventType === 'DELETE' && payload.old) {
                setRequirements(prev => prev.filter(req => req.id !== payload.old.id));
              }
              
              // Still fetch fresh data for consistency, but after a delay
              setTimeout(() => {
                if (mounted) {
                  fetchRequirements();
                }
              }, 500);
            }, 100);
          }
        )
        .subscribe((status) => {
          console.log('Optimized subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time sync active (optimized)');
          } else if (status === 'CLOSED') {
            console.log('❌ Connection lost, attempting reconnect...');
            // Auto-reconnect with exponential backoff
            setTimeout(() => {
              if (mounted) {
                setupOptimizedRealtimeSubscription();
              }
            }, 3000);
          }
        });
    };

    initializeDashboard();
    
    return () => {
      mounted = false;
      clearTimeout(debounceTimer);
      if (requirementsChannel) {
        supabase.removeChannel(requirementsChannel);
      }
    };
  }, [user.id, fetchRequirements]);

  const handleSubmitRequirement = useCallback(async () => {
    console.log('Requirement submitted successfully');
    await fetchRequirements(true);
    setShowNewRequirement(false);
    toast({
      title: "✅ Success!",
      description: "Your requirement has been submitted successfully.",
      className: "bg-green-50 border-green-200 text-green-800"
    });
  }, [fetchRequirements]);

  const handleRequirementUpdate = useCallback(() => {
    console.log('Triggering optimized requirement update...');
    fetchRequirements(true);
    
    toast({
      title: "🔄 Updated",
      description: "Status has been updated successfully.",
      className: "bg-blue-50 border-blue-200 text-blue-800"
    });
  }, [fetchRequirements]);

  const handleRefresh = useCallback(() => {
    fetchRequirements(true);
  }, [fetchRequirements]);

  // Memoized values to prevent unnecessary re-renders
  const memoizedValues = useMemo(() => ({
    showNewRequirement,
    setShowNewRequirement,
    selectedRequirement,
    setSelectedRequirement,
    showGeneralChat,
    setShowGeneralChat,
    requirements,
    loading,
    error,
    setError,
    refreshing,
    handleSubmitRequirement,
    handleRequirementUpdate,
    handleRefresh
  }), [
    showNewRequirement,
    selectedRequirement,
    showGeneralChat,
    requirements,
    loading,
    error,
    refreshing,
    handleSubmitRequirement,
    handleRequirementUpdate,
    handleRefresh
  ]);

  return memoizedValues;
};
