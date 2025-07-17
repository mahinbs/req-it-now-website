import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAutoCompletionInfo } from '@/utils/requirementUtils';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

export const useAutoCompletion = (requirement: Requirement) => {
  const [autoCompletionInfo, setAutoCompletionInfo] = useState(() => 
    getAutoCompletionInfo(requirement)
  );

  const updateAutoCompletionInfo = useCallback(() => {
    const newInfo = getAutoCompletionInfo(requirement);
    setAutoCompletionInfo(newInfo);
  }, [requirement]);

  // Update info when requirement changes
  useEffect(() => {
    updateAutoCompletionInfo();
  }, [updateAutoCompletionInfo]);

  // Set up interval to update countdown timer
  useEffect(() => {
    if (!autoCompletionInfo.isAwaitingReview || autoCompletionInfo.shouldAutoComplete) {
      return;
    }

    const interval = setInterval(updateAutoCompletionInfo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [autoCompletionInfo.isAwaitingReview, autoCompletionInfo.shouldAutoComplete, updateAutoCompletionInfo]);

  // Function to manually trigger auto-completion check
  const triggerAutoCompletionCheck = useCallback(async () => {
    try {
      console.log('Triggering auto-completion check...');
      
      const { data, error } = await supabase.functions.invoke('auto-complete-requirements', {
        body: {}
      });

      if (error) {
        console.error('Error triggering auto-completion:', error);
        return { success: false, error };
      }

      console.log('Auto-completion check result:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error calling auto-completion function:', error);
      return { success: false, error };
    }
  }, []);

  return {
    autoCompletionInfo,
    triggerAutoCompletionCheck,
    updateAutoCompletionInfo
  };
};

// Hook for admin dashboard to manage auto-completion
export const useAutoCompletionManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runAutoCompletionCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-complete-requirements', {
        body: {}
      });

      if (error) {
        console.error('Auto-completion check failed:', error);
        return { success: false, error };
      }

      setLastCheck(new Date());
      return { success: true, data };
    } catch (error) {
      console.error('Error running auto-completion check:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPendingAutoCompletions = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_auto_completion');
      
      if (error) {
        console.error('Error getting pending auto-completions:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error calling get_pending_auto_completion:', error);
      return { success: false, error };
    }
  }, []);

  return {
    isLoading,
    lastCheck,
    runAutoCompletionCheck,
    getPendingAutoCompletions
  };
};