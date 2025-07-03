
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

    // Validate file before proceeding
    if (!file || file.size === 0) {
      onProgress?.({ progress: 0, status: 'error', error: 'Invalid file' });
      return null;
    }

    // Get file extension safely
    const fileNameParts = file.name.split('.');
    const fileExt = fileNameParts.length > 1 ? fileNameParts.pop() : 'bin';
    const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    const fileName = `${userId}/${requirementId}/${safeFileName}`;
    
    // Detect mobile browser
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window.innerWidth < 768);
    
    // Create a timeout promise with a longer timeout for mobile devices
    const timeoutDuration = isMobile ? 60000 : 45000; // 60 seconds for mobile, 45 for desktop
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - please try again')), timeoutDuration);
    });

    // Simulate realistic progress during upload
    // Use a slower update interval on mobile to reduce UI jank
    const progressInterval = setInterval(() => {
      onProgress?.({ 
        progress: Math.min(90, Math.random() * 10 + 60), 
        status: 'uploading' 
      });
    }, isMobile ? 1500 : 800);

    try {
      // For all browsers, add a small delay before starting the upload
      // This helps prevent browsers from freezing during upload initialization
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // For larger files on mobile, we'll use a chunked approach
      const isLargeFile = file.size > 1024 * 1024 * 2; // 2MB
      const shouldUseChunkedUpload = isMobile && isLargeFile;
      
      // Use a more resilient upload approach with retries
      let retries = 0;
      let uploadResult = null;
      let uploadError = null;
      
      // Maximum number of retries - more for mobile
      const maxRetries = isMobile ? 5 : 3;
      
      while (retries < maxRetries) {
        try {
          // Show different progress for each retry
          onProgress?.({ 
            progress: Math.min(80, 20 + (retries * 15)), 
            status: 'uploading' 
          });
          
          let uploadPromise;
          
          if (shouldUseChunkedUpload && retries === 0) {
            // For large files on mobile, try to use a more reliable approach first
            // This simulates a chunked upload by using a smaller timeout
            uploadPromise = new Promise(async (resolve) => {
              try {
                // Show incremental progress
                for (let i = 1; i <= 5; i++) {
                  onProgress?.({ 
                    progress: i * 15, 
                    status: 'uploading' 
                  });
                  await new Promise(r => setTimeout(r, 300));
                }
                
                const result = await supabase.storage
                  .from('requirement-attachments')
                  .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                  });
                  
                resolve(result);
              } catch (err) {
                resolve({ error: err });
              }
            });
          } else {
            // Standard upload
            uploadPromise = supabase.storage
              .from('requirement-attachments')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: retries > 0 // Only use upsert on retry attempts
              });
          }

          const result = await Promise.race([uploadPromise, timeoutPromise]);
          
          if (result.error) {
            uploadError = result.error;
            retries++;
            console.warn(`Upload attempt ${retries} failed:`, uploadError);
            
            // Wait before retrying - longer for each retry
            await new Promise(resolve => setTimeout(resolve, 1000 + (retries * 500)));
          } else {
            uploadResult = result;
            break;
          }
        } catch (err) {
          uploadError = err;
          retries++;
          console.warn(`Upload attempt ${retries} error:`, err);
          
          // Wait before retrying - longer for each retry
          await new Promise(resolve => setTimeout(resolve, 1000 + (retries * 500)));
        }
      }

      clearInterval(progressInterval);

      if (uploadError || !uploadResult) {
        const errorMessage = uploadError instanceof Error 
          ? uploadError.message 
          : 'Upload failed after multiple attempts. Please try again with a smaller file or better connection.';
          
        onProgress?.({ progress: 0, status: 'error', error: errorMessage });
        console.error('File upload error after all retries:', uploadError);
        return null;
      }

      // Complete the progress
      onProgress?.({ progress: 100, status: 'completed' });

      // Get public URL with retry logic
      let publicUrl = null;
      for (let urlAttempt = 0; urlAttempt < 3; urlAttempt++) {
        try {
          const { data } = supabase.storage
            .from('requirement-attachments')
            .getPublicUrl(fileName);
            
          if (data && data.publicUrl) {
            publicUrl = data.publicUrl;
            break;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (urlError) {
          console.warn(`Failed to get public URL, attempt ${urlAttempt + 1}:`, urlError);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      return publicUrl;
    } catch (uploadError) {
      clearInterval(progressInterval);
      const errorMessage = uploadError instanceof Error 
        ? uploadError.message 
        : 'Upload failed. Please check your connection and try again.';
        
      onProgress?.({ progress: 0, status: 'error', error: errorMessage });
      console.error('Upload process error:', uploadError);
      throw uploadError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Upload failed due to an unexpected error.';
      
    onProgress?.({ progress: 0, status: 'error', error: errorMessage });
    console.error('Upload outer error:', error);
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
