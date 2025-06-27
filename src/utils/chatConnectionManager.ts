
import { supabase } from '@/integrations/supabase/client';
import { MessageCache, createRetryLogic } from './performanceUtils';
import type { Tables } from '@/integrations/supabase/types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type RealtimeMessage = Tables<'messages'> & {
  sender_name?: string;
};

type MessageCallback = (message: RealtimeMessage | { type: string; data: any }) => void;
type StatusCallback = (status: ConnectionStatus) => void;

interface ChatSubscription {
  id: string;
  requirementId: string;
  onMessage: MessageCallback;
  onStatus: StatusCallback;
  isActive: boolean;
}

class ChatConnectionManager {
  private static instance: ChatConnectionManager;
  private connections = new Map<string, any>();
  private subscriptions = new Map<string, ChatSubscription>();
  private messageCache = new MessageCache();
  private retryLogic = createRetryLogic(3, 1000);
  private healthCheck: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHealthCheck();
  }

  static getInstance(): ChatConnectionManager {
    if (!ChatConnectionManager.instance) {
      ChatConnectionManager.instance = new ChatConnectionManager();
    }
    return ChatConnectionManager.instance;
  }

  private startHealthCheck() {
    this.healthCheck = setInterval(() => {
      this.connections.forEach((channel, key) => {
        if (channel && channel.state === 'closed') {
          console.log('Detected closed connection, cleaning up:', key);
          this.cleanup(key);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  private getConnectionKey(requirementId: string): string {
    return `chat-${requirementId || 'general'}`;
  }

  async subscribe(
    requirementId: string,
    onMessage: MessageCallback,
    onStatus: StatusCallback
  ): Promise<string> {
    const subscriptionId = `${requirementId}-${Date.now()}`;
    const connectionKey = this.getConnectionKey(requirementId);

    // Store subscription
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      requirementId,
      onMessage,
      onStatus,
      isActive: true
    });

    // Check if we already have a connection for this requirement
    if (this.connections.has(connectionKey)) {
      const existingChannel = this.connections.get(connectionKey);
      if (existingChannel && existingChannel.state === 'joined') {
        onStatus('connected');
        return subscriptionId;
      }
    }

    // Create new connection with retry logic
    try {
      await this.retryLogic.retry(() => this.createConnection(connectionKey, requirementId));
      onStatus('connected');
    } catch (error) {
      console.error('Failed to establish chat connection:', error);
      onStatus('error');
    }

    return subscriptionId;
  }

  private async createConnection(connectionKey: string, requirementId: string): Promise<void> {
    const channel = supabase
      .channel(connectionKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: requirementId && requirementId !== 'general' 
            ? `requirement_id=eq.${requirementId}` 
            : 'requirement_id=is.null'
        },
        (payload) => {
          const message: RealtimeMessage = {
            ...(payload.new as Tables<'messages'>),
            sender_name: (payload.new as Tables<'messages'>).is_admin ? 'Admin' : 'User'
          };
          
          // Cache the message
          this.messageCache.set(`msg-${message.id}`, message);
          
          // Notify all subscribers for this requirement
          this.subscriptions.forEach((sub) => {
            if (sub.requirementId === requirementId && sub.isActive) {
              sub.onMessage(message);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments'
        },
        (payload) => {
          // Notify subscribers about new attachment
          this.subscriptions.forEach((sub) => {
            if (sub.requirementId === requirementId && sub.isActive) {
              sub.onMessage({ type: 'attachment', data: payload.new });
            }
          });
        }
      )
      .subscribe((status) => {
        console.log(`Connection ${connectionKey} status:`, status);
        
        const connectionStatus: ConnectionStatus = 
          status === 'SUBSCRIBED' ? 'connected' :
          status === 'CHANNEL_ERROR' ? 'error' :
          status === 'CLOSED' ? 'disconnected' : 'connecting';

        // Notify all subscribers
        this.subscriptions.forEach((sub) => {
          if (sub.requirementId === requirementId && sub.isActive) {
            sub.onStatus(connectionStatus);
          }
        });

        if (status === 'CHANNEL_ERROR') {
          this.handleConnectionError(connectionKey, requirementId);
        }
      });

    this.connections.set(connectionKey, channel);
  }

  private handleConnectionError(connectionKey: string, requirementId: string) {
    console.log('Handling connection error for:', connectionKey);
    
    // Clean up failed connection
    this.cleanup(connectionKey);
    
    // Attempt reconnection after delay
    setTimeout(() => {
      const hasActiveSubscriptions = Array.from(this.subscriptions.values())
        .some(sub => sub.requirementId === requirementId && sub.isActive);
        
      if (hasActiveSubscriptions) {
        this.createConnection(connectionKey, requirementId).catch(console.error);
      }
    }, 2000);
  }

  unsubscribe(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);

    // Check if this was the last subscription for this requirement
    const hasOtherSubs = Array.from(this.subscriptions.values())
      .some(sub => sub.requirementId === subscription.requirementId && sub.isActive);

    if (!hasOtherSubs) {
      const connectionKey = this.getConnectionKey(subscription.requirementId);
      this.cleanup(connectionKey);
    }
  }

  private cleanup(connectionKey: string) {
    const channel = this.connections.get(connectionKey);
    if (channel) {
      supabase.removeChannel(channel);
      this.connections.delete(connectionKey);
    }
  }

  getCachedMessage(messageId: string) {
    return this.messageCache.get(`msg-${messageId}`);
  }

  destroy() {
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
    }
    
    this.connections.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    
    this.connections.clear();
    this.subscriptions.clear();
    this.messageCache.clear();
  }
}

export const chatConnectionManager = ChatConnectionManager.getInstance();
