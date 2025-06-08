
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
): Promise<string | null> => {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      console.log(`Attempting file upload (attempt ${retryCount + 1}/${maxRetries}):`, file.name);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${messageId}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`Upload attempt ${retryCount + 1} failed:`, error);
        if (retryCount === maxRetries - 1) {
          throw error;
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        continue;
      }

      console.log('File uploaded successfully:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);

      // Save attachment metadata to database with retry logic
      let dbRetryCount = 0;
      while (dbRetryCount < maxRetries) {
        try {
          const { error: dbError } = await supabase
            .from('message_attachments')
            .insert({
              message_id: messageId,
              file_name: file.name,
              file_url: publicUrl,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: userId
            });

          if (dbError) {
            console.error(`Database insert attempt ${dbRetryCount + 1} failed:`, dbError);
            if (dbRetryCount === maxRetries - 1) {
              throw dbError;
            }
            dbRetryCount++;
            await new Promise(resolve => setTimeout(resolve, 500 * dbRetryCount));
            continue;
          }

          console.log('Attachment metadata saved successfully');
          return publicUrl;
        } catch (dbError) {
          console.error(`Database error on attempt ${dbRetryCount + 1}:`, dbError);
          if (dbRetryCount === maxRetries - 1) {
            // Try to clean up uploaded file
            try {
              await supabase.storage.from('chat-attachments').remove([fileName]);
              console.log('Cleaned up uploaded file after database failure');
            } catch (cleanupError) {
              console.error('Failed to cleanup file:', cleanupError);
            }
            return null;
          }
          dbRetryCount++;
          await new Promise(resolve => setTimeout(resolve, 500 * dbRetryCount));
        }
      }

      return publicUrl;
    } catch (error) {
      console.error(`Upload error on attempt ${retryCount + 1}:`, error);
      if (retryCount === maxRetries - 1) {
        return null;
      }
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }

  return null;
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
