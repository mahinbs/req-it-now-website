
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
      console.log('Setting up real-time subscriptions...');
      
      const timestamp = Date.now();
      requirementsChannel = supabase
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
    };

    initializeDashboard();
    
    return () => {
      console.log('Cleaning up dashboard subscriptions');
      mounted = false;
      if (requirementsChannel) {
        supabase.removeChannel(requirementsChannel);
      }
    };
  }, [user.id]);

  const fetchRequirements = async () => {
    try {
      console.log('Fetching requirements for user:', user.id);
      setError(null);
      
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requirements:', error);
        throw error;
      }
      
      console.log('Requirements fetched successfully:', data?.length || 0);
      setRequirements(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setError('Failed to load requirements');
      setLoading(false);
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
