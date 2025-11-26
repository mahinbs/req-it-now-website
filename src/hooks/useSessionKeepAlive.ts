import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSessionKeepAliveOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onSessionExpired?: () => void;
}

// Global singleton to ensure only one keep-alive runs
let globalKeepAliveActive = false;

export const useSessionKeepAlive = (options: UseSessionKeepAliveOptions = {}) => {
  const {
    enabled = true,
    interval = 5 * 60 * 1000, // 5 minutes default
    onSessionExpired
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const refreshSession = useCallback(async () => {
    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        if (onSessionExpired) {
          onSessionExpired();
        }
        return false;
      }

      if (!session) {
        if (onSessionExpired) {
          onSessionExpired();
        }
        return false;
      }

      // Check if session is close to expiring (within 10 minutes)
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const tenMinutes = 10 * 60 * 1000;

      if (timeUntilExpiry < tenMinutes) {
        // Refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          if (onSessionExpired) {
            onSessionExpired();
          }
          return false;
        }

        if (refreshData.session) {
          return true;
        }
      } else {
        return true;
      }
    } catch (error) {
      if (onSessionExpired) {
        onSessionExpired();
      }
      return false;
    }
  }, [onSessionExpired]);

  const startKeepAlive = useCallback(() => {
    // Check global singleton to prevent multiple instances
    if (!enabled || isActiveRef.current || globalKeepAliveActive) {
      return;
    }

    isActiveRef.current = true;
    globalKeepAliveActive = true;

    // Initial refresh
    refreshSession();

    // Set up interval
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        refreshSession();
      }
    }, interval);
  }, [enabled, interval, refreshSession]);

  const stopKeepAlive = useCallback(() => {
    isActiveRef.current = false;
    globalKeepAliveActive = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startKeepAlive();

      return () => {
        stopKeepAlive();
      };
    } else {
      stopKeepAlive();
    }
  }, [enabled, startKeepAlive, stopKeepAlive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopKeepAlive();
    };
  }, [stopKeepAlive]);

  return {
    refreshSession,
    startKeepAlive,
    stopKeepAlive,
    isActive: isActiveRef.current
  };
};
