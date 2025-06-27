
import { supabase } from '@/integrations/supabase/client';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export const uploadRequirementFile = async (
  file: File, 
  userId: string, 
  requirementId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string | null> => {
  try {
    // Start upload progress
    onProgress?.({ progress: 0, status: 'uploading' });

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${requirementId}/${Date.now()}.${fileExt}`;
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - please try again')), 30000);
    });

    // Simulate realistic progress during upload
    const progressInterval = setInterval(() => {
      onProgress?.({ progress: Math.min(95, Math.random() * 20 + 70), status: 'uploading' });
    }, 500);

    try {
      const uploadPromise = supabase.storage
        .from('requirement-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

      clearInterval(progressInterval);

      if (error) {
        onProgress?.({ progress: 0, status: 'error', error: error.message });
        console.error('File upload error:', error);
        return null;
      }

      // Complete the progress
      onProgress?.({ progress: 100, status: 'completed' });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('requirement-attachments')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (uploadError) {
      clearInterval(progressInterval);
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed';
      onProgress?.({ progress: 0, status: 'error', error: errorMessage });
      throw uploadError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    onProgress?.({ progress: 0, status: 'error', error: errorMessage });
    console.error('Upload error:', error);
    return null;
  }
};

export const deleteRequirementFile = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('requirement-attachments')
      .remove([filePath]);

    if (error) {
      console.error('File deletion error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};
