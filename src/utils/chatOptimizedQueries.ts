
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'> & {
  sender_name?: string;
  attachments?: Tables<'message_attachments'>[];
};

interface LoadMessagesOptions {
  requirementId: string;
  limit?: number;
  offset?: number;
  includeAttachments?: boolean;
}

export class ChatOptimizedQueries {
  // Optimized message loading with batch attachment fetching
  static async loadMessages({
    requirementId,
    limit = 20,
    offset = 0,
    includeAttachments = true
  }: LoadMessagesOptions): Promise<{ messages: Message[]; hasMore: boolean }> {
    const startTime = performance.now();
    
    try {
      // Single query for messages
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (requirementId && requirementId !== 'general') {
        query = query.eq('requirement_id', requirementId);
      } else {
        query = query.is('requirement_id', null);
      }

      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        throw messagesError;
      }

      const messages = messagesData || [];
      const hasMore = messages.length === limit;

      // Batch fetch attachments if needed
      let messagesWithAttachments: Message[] = messages.map(msg => ({
        ...msg,
        sender_name: msg.is_admin ? 'Admin' : 'User',
        attachments: []
      }));

      if (includeAttachments && messages.length > 0) {
        const messageIds = messages.map(msg => msg.id);
        const attachments = await this.batchLoadAttachments(messageIds);
        
        // Group attachments by message_id
        const attachmentsByMessage = attachments.reduce((acc, attachment) => {
          if (!acc[attachment.message_id]) {
            acc[attachment.message_id] = [];
          }
          acc[attachment.message_id].push(attachment);
          return acc;
        }, {} as Record<string, Tables<'message_attachments'>[]>);

        // Assign attachments to messages
        messagesWithAttachments = messagesWithAttachments.map(msg => ({
          ...msg,
          attachments: attachmentsByMessage[msg.id] || []
        }));
      }

      // Reverse to get chronological order
      const orderedMessages = messagesWithAttachments.reverse();
      
      const endTime = performance.now();
      console.log(`✅ Loaded ${orderedMessages.length} messages in ${(endTime - startTime).toFixed(2)}ms`);
      
      return {
        messages: orderedMessages,
        hasMore
      };
    } catch (error) {
      const endTime = performance.now();
      console.error(`❌ Message loading failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      throw error;
    }
  }

  // Batch load attachments for multiple messages
  private static async batchLoadAttachments(messageIds: string[]): Promise<Tables<'message_attachments'>[]> {
    if (messageIds.length === 0) return [];

    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase
        .from('message_attachments')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading attachments:', error);
        return [];
      }

      const endTime = performance.now();
      console.log(`✅ Loaded ${data?.length || 0} attachments in ${(endTime - startTime).toFixed(2)}ms`);
      
      return data || [];
    } catch (error) {
      console.error('Error in batchLoadAttachments:', error);
      return [];
    }
  }

  // Optimized message sending
  static async sendMessage(
    content: string,
    userId: string,
    isAdmin: boolean,
    requirementId?: string,
    attachments?: File[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = performance.now();
    
    try {
      const messageData = {
        content: content.trim(),
        sender_id: userId,
        is_admin: isAdmin,
        requirement_id: requirementId && requirementId !== 'general' ? requirementId : null
      };

      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      const endTime = performance.now();
      console.log(`✅ Message sent in ${(endTime - startTime).toFixed(2)}ms`);

      // Handle attachments if provided (placeholder for future enhancement)
      if (attachments && attachments.length > 0) {
        console.log(`📎 Processing ${attachments.length} attachments for message ${messageResult.id}`);
        // Attachment processing would be implemented here
      }

      return {
        success: true,
        messageId: messageResult.id
      };
    } catch (error: any) {
      const endTime = performance.now();
      console.error(`❌ Message sending failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  // Get connection health status
  static async checkConnectionHealth(): Promise<boolean> {
    try {
      const { error } = await supabase.from('messages').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
