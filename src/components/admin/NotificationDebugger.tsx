import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, Database, Bell } from 'lucide-react';
import { useUnifiedNotificationContext } from '@/hooks/useUnifiedNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthOptimized';
export const NotificationDebugger = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const {
    user,
    isAdmin
  } = useAuth();
  const {
    notificationCounts,
    connected,
    refreshNotifications
  } = useUnifiedNotificationContext();
  const runDebugCheck = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      console.log('Running notification debug check...');

      // Check recent messages
      const {
        data: messages,
        error: msgError
      } = await supabase.from('messages').select('*').order('created_at', {
        ascending: false
      }).limit(10);

      // Check admin read status
      const {
        data: adminReadStatus,
        error: adminError
      } = await supabase.from('admin_read_status').select('*').eq('admin_id', user.id);

      // Check unread counts function
      const rpcFunction = isAdmin ? 'get_unread_counts_for_admin' : 'get_unread_counts_for_client';
      const rpcParams = isAdmin ? {
        admin_user_id: user.id
      } : {
        client_user_id: user.id
      };
      const {
        data: unreadCounts,
        error: unreadError
      } = await supabase.rpc(rpcFunction, rpcParams);
      setDebugInfo({
        user: {
          id: user.id,
          isAdmin
        },
        recentMessages: messages,
        adminReadStatus,
        unreadCounts,
        currentNotificationCounts: notificationCounts,
        connected,
        errors: {
          msgError,
          adminError,
          unreadError
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Debug check failed:', error);
      setDebugInfo({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  if (!isAdmin) {
    return null; // Only show for admins
  }
  return <Card className="mt-4 border-dashed border-2 border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Bug className="h-4 w-4" />
          <span>Notification Debug Tool</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button onClick={runDebugCheck} disabled={loading} size="sm" variant="outline" className="bg-zinc-950 hover:bg-zinc-800">
            <Database className="h-4 w-4 mr-2" />
            {loading ? 'Checking...' : 'Debug Check'}
          </Button>
          
          <Button onClick={refreshNotifications} size="sm" variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Force Refresh
          </Button>
          
          <div className="text-xs text-gray-500">
            Status: {connected ? '🟢 Connected' : '🟡 Disconnected'}
          </div>
        </div>

        {debugInfo && <div className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>}
      </CardContent>
    </Card>;
};