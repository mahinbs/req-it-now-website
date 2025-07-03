
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
    
    // Create a timeout promise with a longer timeout for mobile devices
    const isMobile = window.innerWidth < 768;
    const timeoutDuration = isMobile ? 45000 : 30000; // 45 seconds for mobile, 30 for desktop
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - please try again')), timeoutDuration);
    });

    // Simulate realistic progress during upload
    // Use a slower update interval on mobile to reduce UI jank
    const progressInterval = setInterval(() => {
      onProgress?.({ progress: Math.min(95, Math.random() * 20 + 70), status: 'uploading' });
    }, isMobile ? 1000 : 500);

    try {
      // For mobile browsers, add a small delay before starting the upload
      // This helps prevent some mobile browsers from freezing during upload initialization
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Use a more resilient upload approach with retries
      let retries = 0;
      let uploadResult = null;
      let uploadError = null;
      
      while (retries < 3) {
        try {
          const uploadPromise = supabase.storage
            .from('requirement-attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: retries > 0 // Only use upsert on retry attempts
            });

          const result = await Promise.race([uploadPromise, timeoutPromise]);
          
          if (result.error) {
            uploadError = result.error;
            retries++;
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            uploadResult = result;
            break;
          }
        } catch (err) {
          uploadError = err;
          retries++;
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      clearInterval(progressInterval);

      if (uploadError || !uploadResult) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed after multiple attempts';
        onProgress?.({ progress: 0, status: 'error', error: errorMessage });
        console.error('File upload error:', uploadError);
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
