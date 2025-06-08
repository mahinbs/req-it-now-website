
import { supabase } from '@/integrations/supabase/client';

export const uploadRequirementFile = async (
  file: File, 
  userId: string, 
  requirementId: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${requirementId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('requirement-attachments')
      .upload(fileName, file);

    if (error) {
      console.error('File upload error:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('requirement-attachments')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
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
