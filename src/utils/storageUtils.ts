
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
    onProgress?.({ progress: 10, status: 'uploading' });
    console.log(`Starting upload for ${file.name}`);

    // Validate file
    if (!file || file.size === 0) {
      onProgress?.({ progress: 0, status: 'error', error: 'Invalid file' });
      return null;
    }

    // Create a simple filename
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${userId}/${requirementId}/${Date.now()}.${fileExt}`;
    
    try {
      // Update progress to 30%
      onProgress?.({ progress: 30, status: 'uploading' });
      console.log('Starting real upload to Supabase');
      
      // Direct upload with minimal options
      const { data, error } = await supabase.storage
        .from('requirement-attachments')
        .upload(fileName, file, {
          upsert: true
        });
      
      if (error) {
        console.error('Upload error:', error);
        onProgress?.({ 
          progress: 0, 
          status: 'error', 
          error: 'Upload failed: ' + error.message 
        });
        return null;
      }
      
      // Update progress to 70%
      onProgress?.({ progress: 70, status: 'uploading' });
      console.log('Upload successful, getting public URL');
      
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
      
    } catch (error) {
      console.error('Upload error:', error);
      
      onProgress?.({ 
        progress: 0, 
        status: 'error', 
        error: 'Upload failed. Please try again.' 
      });
      
      return null;
    }
  } catch (error) {
    console.error('Outer upload error:', error);
    
    onProgress?.({ 
      progress: 0, 
      status: 'error', 
      error: 'Upload process failed' 
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
