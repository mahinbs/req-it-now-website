
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
  const [showGeneralChat, setShowGeneralChat] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;

    const initializeDashboard = async () => {
      try {
        console.log('Initializing dashboard for user:', user.id);
        
        // Set timeout to prevent infinite loading
        loadingTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.warn('User dashboard loading timeout');
            setLoading(false);
            setError('Loading timeout. Please refresh to try again.');
          }
        }, 10000);

        await fetchRequirements();
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
    
    // Set up real-time subscription with unique channel name
    console.log('Setting up real-time subscriptions...');
    
    const timestamp = Date.now();
    const requirementsChannel = supabase
      .channel(`user-requirements-${user.id}-${timestamp}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requirements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Requirements changed:', payload);
          if (mounted) {
            fetchRequirements();
          }
        }
      )
      .subscribe((status) => {
        console.log('User requirements subscription status:', status);
      });

    return () => {
      console.log('Cleaning up dashboard subscriptions');
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      supabase.removeChannel(requirementsChannel);
    };
  }, [user.id]);

  const fetchRequirements = async () => {
    try {
      console.log('Fetching requirements for user:', user.id);
      setError(null);
      
      // Add timeout to prevent hanging
      const fetchPromise = supabase
        .from('requirements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 8000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Error fetching requirements:', error);
        throw error;
      }
      
      console.log('Requirements fetched successfully:', data?.length || 0);
      setRequirements(data || []);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setError('Failed to load requirements');
      toast({
        title: "Error",
        description: "Failed to load requirements. Please refresh the page.",
        variant: "destructive"
      });
      setRequirements([]);
    }
  };

  const handleSubmitRequirement = async () => {
    console.log('Requirement submitted successfully');
    await fetchRequirements();
    setShowNewRequirement(false);
    toast({
      title: "Success!",
      description: "Your requirement has been submitted successfully."
    });
  };

  return {
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
    handleSubmitRequirement
  };
};
