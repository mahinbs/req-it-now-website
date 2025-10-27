import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSessionKeepAliveOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onSessionExpired?: () => void;
}

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
      console.log('🔄 Refreshing session to prevent timeout...');
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        if (onSessionExpired) {
          onSessionExpired();
        }
        return false;
      }

      if (!session) {
        console.log('No active session found');
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
        console.log('Session close to expiry, refreshing...');
        
        // Refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          if (onSessionExpired) {
            onSessionExpired();
          }
          return false;
        }

        if (refreshData.session) {
          console.log('✅ Session refreshed successfully');
          return true;
        }
      } else {
        console.log('Session still valid, no refresh needed');
        return true;
      }
    } catch (error) {
      console.error('Error in session refresh:', error);
      if (onSessionExpired) {
        onSessionExpired();
      }
      return false;
    }
  }, [onSessionExpired]);

  const startKeepAlive = useCallback(() => {
    if (!enabled || isActiveRef.current) return;

    console.log('🚀 Starting session keep-alive...');
    isActiveRef.current = true;

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
    console.log('🛑 Stopping session keep-alive...');
    isActiveRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Activity-based session refresh
  const handleUserActivity = useCallback(() => {
    if (enabled && isActiveRef.current) {
      // Refresh session on user activity (with debouncing)
      clearTimeout(intervalRef.current!);
      intervalRef.current = setTimeout(() => {
        refreshSession();
      }, 30000); // 30 seconds after last activity
    }
  }, [enabled, refreshSession]);

  useEffect(() => {
    if (enabled) {
      startKeepAlive();

      // Add activity listeners
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      return () => {
        stopKeepAlive();
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
      };
    } else {
      stopKeepAlive();
    }
  }, [enabled, startKeepAlive, stopKeepAlive, handleUserActivity]);

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
