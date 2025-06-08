
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileVideo, X, File, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RequirementFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: File[];
}

interface RequirementFormProps {
  onSubmit: (data: RequirementFormData) => void;
}

interface AttachmentFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

export const RequirementForm = ({ onSubmit }: RequirementFormProps) => {
  const [formData, setFormData] = useState<RequirementFormData>({
    title: '',
    description: '',
    priority: 'medium',
    attachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const handleInputChange = (field: keyof RequirementFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newFiles]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  };

  const uploadFiles = async (files: File[]): Promise<AttachmentFile[]> => {
    const uploadedFiles: AttachmentFile[] = [];
    
    for (const file of files) {
      try {
        console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        
        // Create a unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${timestamp}_${randomSuffix}.${fileExtension}`;
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('requirement-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Upload error:', error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        console.log('Upload successful:', data);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('requirement-attachments')
          .getPublicUrl(fileName);

        console.log('Public URL:', publicUrl);

        uploadedFiles.push({
          url: publicUrl,
          name: file.name,
          size: file.size,
          type: file.type
        });

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
        throw error;
      }
    }
    
    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Starting requirement submission...');
      console.log('Form data:', formData);
      
      let attachmentMetadata: AttachmentFile[] = [];
      let attachmentUrls: string[] = [];
      
      // Upload files if any
      if (formData.attachments && formData.attachments.length > 0) {
        console.log('Uploading files...');
        toast({
          title: "Uploading files...",
          description: "Please wait while we upload your attachments"
        });
        
        attachmentMetadata = await uploadFiles(formData.attachments);
        attachmentUrls = attachmentMetadata.map(file => file.url);
        
        console.log('Files uploaded successfully:', attachmentMetadata);
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('Current user:', user.id);

      // Submit requirement to database
      const requirementData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        user_id: user.id,
        has_screen_recording: formData.attachments && formData.attachments.length > 0,
        attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null,
        attachment_metadata: attachmentMetadata.length > 0 ? JSON.stringify(attachmentMetadata) : null,
        status: 'pending'
      };

      console.log('Submitting requirement data:', requirementData);

      const { data, error } = await supabase
        .from('requirements')
        .insert([requirementData])
        .select()
        .single();

      if (error) {
        console.error('Database insertion error:', error);
        throw new Error(`Failed to save requirement: ${error.message}`);
      }

      console.log('Requirement submitted successfully:', data);

      toast({
        title: "Success!",
        description: "Your requirement has been submitted successfully"
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        attachments: []
      });
      setUploadProgress({});

      // Call the onSubmit callback
      onSubmit(formData);

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Failed to submit requirement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-900">Submit Website Requirement</CardTitle>
        <CardDescription className="text-slate-600">
          Describe what you need help with on your website. Be as detailed as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Brief description of what you need"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about your requirement..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full min-h-[120px] resize-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium text-slate-700">
              Priority
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleInputChange('priority', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Can wait</SelectItem>
                <SelectItem value="medium">Medium - Normal priority</SelectItem>
                <SelectItem value="high">High - Important</SelectItem>
                <SelectItem value="urgent">Urgent - Needs immediate attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Attachments (Optional)
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx,.txt"
                disabled={isSubmitting}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  Click to upload files or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Images, PDFs, documents up to 10MB each
                </p>
              </label>
            </div>

            {formData.attachments && formData.attachments.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label className="text-sm font-medium text-slate-700">Selected Files:</Label>
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <File className="h-4 w-4 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {uploadProgress[file.name] !== undefined && (
                        <div className="text-xs text-slate-500">
                          {uploadProgress[file.name]}%
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-blue-800">
              Our admin team will review your requirement and get back to you as soon as possible.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Requirement'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
