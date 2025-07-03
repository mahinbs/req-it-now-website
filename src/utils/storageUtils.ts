
import { supabase } from '@/integrations/supabase/client';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Simple function to convert a File to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Simple function to convert a base64 string to a Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeType });
};

// Simplified upload function that works better on mobile
export const uploadRequirementFile = async (
  file: File, 
  userId: string, 
  requirementId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string | null> => {
  try {
    // Start upload progress
    onProgress?.({ progress: 0, status: 'uploading' });
    console.log('Starting upload for file:', file.name, 'size:', file.size);

    // Validate file before proceeding
    if (!file || file.size === 0) {
      onProgress?.({ progress: 0, status: 'error', error: 'Invalid file' });
      return null;
    }

    // Get file extension and create a safe filename
    const fileExt = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const fileName = `${userId}/${requirementId}/${timestamp}_${randomId}.${fileExt}`;
    
    // Detect if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window.innerWidth < 768);
    
    console.log('Device detected as:', isMobile ? 'mobile' : 'desktop');
    
    // Set up a progress interval that shows realistic progress
    const progressInterval = setInterval(() => {
      onProgress?.({ 
        progress: Math.min(85, Math.random() * 10 + 50), 
        status: 'uploading' 
      });
    }, 1000);
    
    try {
      // For mobile devices, we'll use a different approach
      if (isMobile) {
        console.log('Using mobile-optimized upload approach');
        
        // Convert file to base64 first - this works better on mobile
        const base64Data = await fileToBase64(file);
        console.log('File converted to base64, length:', base64Data.length);
        
        // Show progress update
        onProgress?.({ progress: 40, status: 'uploading' });
        
        // Create a new blob from the base64 data
        const blob = base64ToBlob(base64Data, file.type);
        console.log('Base64 converted to blob, size:', blob.size);
        
        // Show progress update
        onProgress?.({ progress: 60, status: 'uploading' });
        
        // Simple direct upload with minimal options
        const { data, error } = await supabase.storage
          .from('requirement-attachments')
          .upload(fileName, blob, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: true
          });
        
        clearInterval(progressInterval);
        
        if (error) {
          console.error('Mobile upload error:', error);
          onProgress?.({ 
            progress: 0, 
            status: 'error', 
            error: 'Upload failed: ' + error.message 
          });
          return null;
        }
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('requirement-attachments')
          .getPublicUrl(fileName);
        
        if (!urlData || !urlData.publicUrl) {
          throw new Error('Failed to get public URL');
        }
        
        // Complete the progress
        onProgress?.({ progress: 100, status: 'completed' });
        console.log('Mobile upload completed successfully');
        
        return urlData.publicUrl;
      } 
      else {
        // Desktop approach - simpler and more direct
        console.log('Using standard upload approach');
        
        // Direct upload
        const { data, error } = await supabase.storage
          .from('requirement-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });
        
        clearInterval(progressInterval);
        
        if (error) {
          console.error('Upload error:', error);
          onProgress?.({ 
            progress: 0, 
            status: 'error', 
            error: 'Upload failed: ' + error.message 
          });
          return null;
        }
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('requirement-attachments')
          .getPublicUrl(fileName);
        
        if (!urlData || !urlData.publicUrl) {
          throw new Error('Failed to get public URL');
        }
        
        // Complete the progress
        onProgress?.({ progress: 100, status: 'completed' });
        console.log('Upload completed successfully');
        
        return urlData.publicUrl;
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Upload failed unexpectedly';
      
      onProgress?.({ 
        progress: 0, 
        status: 'error', 
        error: errorMessage 
      });
      
      return null;
    }
  } catch (error) {
    console.error('Outer upload error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Upload process failed';
    
    onProgress?.({ 
      progress: 0, 
      status: 'error', 
      error: errorMessage 
    });
    
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
