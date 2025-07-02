
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface User {
  id: string;
  company_name: string;
  website_url: string;
}

export const useUserDashboard = (user: User) => {
  const [showNewRequirement, setShowNewRequirement] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let requirementsChannel: any = null;

    const initializeDashboard = async () => {
      try {
        console.log('Initializing dashboard for user:', user.id);
        
        await fetchRequirements();
        
        if (mounted) {
          setupRealtimeSubscription();
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        if (mounted) {
          setError('Failed to load dashboard data');
          setLoading(false);
        }
      }
    };

    const setupRealtimeSubscription = () => {
      console.log('Setting up enhanced real-time subscriptions...');
      
      const timestamp = Date.now();
      const channelName = `user-requirements-enhanced-${user.id}-${timestamp}`;
      
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
            console.log('Requirements changed with enhanced sync:', payload);
            if (mounted) {
              // Immediate optimistic update for better UX
              if (payload.eventType === 'UPDATE' && payload.new) {
                setRequirements(prev => 
                  prev.map(req => 
                    req.id === payload.new.id ? { ...req, ...payload.new } : req
                  )
                );
              }
              // Still fetch fresh data to ensure consistency
              setTimeout(() => {
                if (mounted) {
                  fetchRequirements();
                }
              }, 100);
            }
          }
        )
        .subscribe((status) => {
          console.log('Enhanced user requirements subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time sync active for user dashboard');
          } else if (status === 'CLOSED') {
            console.log('❌ Real-time connection lost, attempting reconnect...');
            // Auto-reconnect after a delay
            setTimeout(() => {
              if (mounted) {
                setupRealtimeSubscription();
              }
            }, 5000);
          }
        });
    };

    initializeDashboard();
    
    return () => {
      console.log('Cleaning up enhanced dashboard subscriptions');
      mounted = false;
      if (requirementsChannel) {
        supabase.removeChannel(requirementsChannel);
      }
    };
  }, [user.id]);

  const fetchRequirements = async () => {
    try {
      console.log('Fetching requirements for user with enhanced error handling:', user.id);
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
      
      console.log('Requirements fetched successfully:', requirementsWithProfiles.length);
      setRequirements(requirementsWithProfiles);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setError('Failed to load requirements');
      setLoading(false);
      
      // Enhanced error feedback
      toast({
        title: "⚠️ Connection Issue",
        description: "Failed to load requirements. Retrying...",
        variant: "destructive"
      });
      
      // Auto-retry after 3 seconds
      setTimeout(() => {
        if (user.id) {
          fetchRequirements();
        }
      }, 3000);
    }
  };

  const handleSubmitRequirement = async () => {
    console.log('Requirement submitted successfully');
    await fetchRequirements();
    setShowNewRequirement(false);
    toast({
      title: "✅ Success!",
      description: "Your requirement has been submitted successfully.",
      className: "bg-green-50 border-green-200 text-green-800"
    });
  };

  // Enhanced update handler with immediate UI feedback
  const handleRequirementUpdate = () => {
    console.log('Triggering immediate requirement update...');
    // Force immediate refresh for critical updates
    fetchRequirements();
    
    toast({
      title: "🔄 Updated",
      description: "Status has been updated successfully.",
      className: "bg-blue-50 border-blue-200 text-blue-800"
    });
  };

  return {
    showNewRequirement,
    setShowNewRequirement,
    selectedRequirement,
    setSelectedRequirement,
    requirements,
    loading,
    error,
    setError,
    handleSubmitRequirement,
    handleRequirementUpdate
  };
};
