
import { supabase } from '@/integrations/supabase/client';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'text/plain'  
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Please upload PDF, DOC, DOCX, PNG, JPG, GIF, or TXT files.'
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size must be less than 10MB.'
    };
  }

  return { valid: true };
};

export const uploadChatAttachment = async (
  file: File,
  messageId: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('Starting file upload:', file.name, 'for message:', messageId);
    
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${messageId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    console.log('File uploaded successfully:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);

    console.log('Generated public URL:', publicUrl);

    // Save attachment metadata to database
    const { data: attachmentData, error: dbError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Clean up uploaded file if database insert fails
      try {
        await supabase.storage.from('chat-attachments').remove([fileName]);
        console.log('Cleaned up uploaded file after database failure');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
      
      return { success: false, error: `Failed to save attachment info: ${dbError.message}` };
    }

    console.log('Attachment metadata saved successfully:', attachmentData);
    return { success: true, url: publicUrl };
    
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unexpected upload error' 
    };
  }
};

export const getAttachmentsForMessage = async (messageId: string) => {
  try {
    const { data, error } = await supabase
      .from('message_attachments')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching attachments:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }
};

export const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return '🖼️';
  } else if (fileType === 'application/pdf') {
    return '📄';
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return '📝';
  } else {
    return '📎';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
