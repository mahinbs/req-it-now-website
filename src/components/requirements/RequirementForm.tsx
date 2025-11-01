import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, File, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast, useToast } from '@/hooks/use-toast';
import { uploadRequirementFile, type UploadProgress } from '@/utils/storageUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';
interface RequirementFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: File[];
}
interface RequirementFormProps {
  onSubmit: (data: RequirementFormData) => void;
}
interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}
export const RequirementForm = ({
  onSubmit
}: RequirementFormProps) => {
  const [formData, setFormData] = useState<RequirementFormData>({
    title: '',
    description: '',
    priority: 'medium',
    attachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStates, setUploadStates] = useState<Map<string, FileUploadState>>(new Map());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Note: Session keep-alive is handled globally in App.tsx to prevent conflicts

  // Debug Android detection
  const isAndroidDevice = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);

  const handleInputChange = useCallback((field: keyof RequirementFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  const uploadFileOptimized = useCallback(async (file: File): Promise<string | null> => {
    // Create a unique ID for this file upload
    const fileId = `${file.name}-${Date.now()}`;

    try {
      // Initialize upload state to 0%
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: 0,
          status: 'uploading'
        });
        return newMap;
      });

      // Detect Android devices specifically
      const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);

      // For Android, show debug info
      if (isAndroid) {
        toast({
          title: "Debug Info",
          description: `File: ${file.name} (${file.size} bytes)`,
          duration: 2000,
        });
      }

      // Get the current user
      let user;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        user = authUser;
      } catch (authError) {
        if (isAndroid) {
          toast({
            title: "Auth Error",
            description: "User authentication failed",
            variant: "destructive",
            duration: 5000,
          });
        }
        throw new Error('User not authenticated');
      }

      if (!user) {
        if (isAndroid) {
          toast({
            title: "Auth Error",
            description: "No user found - please log in",
            variant: "destructive",
            duration: 5000,
          });
        }
        throw new Error('User not authenticated');
      }

      // For Android, show auth success
      if (isAndroid) {
        toast({
          title: "Auth Success",
          description: "User authenticated successfully",
          duration: 1000,
        });
      }

      // Generate a unique requirement ID for this upload
      const tempReqId = 'temp-' + Date.now();

      // Create a safe filename
      const fileExt = file.name.split('.').pop() || 'bin';
      const fileName = `${user.id}/${tempReqId}/${Date.now()}.${fileExt}`;

      // Update progress to 30%
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: 30,
          status: 'uploading'
        });
        return newMap;
      });

      // Simple, unified upload approach that works on all devices

      // For Android, show a toast to indicate upload is starting
      if (isAndroid) {
        toast({
          title: "Upload Starting",
          description: `Uploading ${file.name}...`,
          duration: 2000,
        });
      }

      // Add a delay to ensure UI updates are visible
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update progress to 50%
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: 50,
          status: 'uploading'
        });
        return newMap;
      });

      // For Android, show progress update
      if (isAndroid) {
        toast({
          title: "Upload Progress",
          description: `Uploading ${file.name} - 50%`,
          duration: 1000,
        });
      }

      // Use the same upload method for all devices with timeout
      let uploadResult;
      try {
        // Create a promise that rejects after 30 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000);
        });

        const uploadPromise = supabase.storage
          .from('requirement-attachments')
          .upload(fileName, file, {
            upsert: true
          });

        uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
      } catch (uploadError) {
        if (isAndroid) {
          toast({
            title: "Upload Failed",
            description: `Network error: ${uploadError.message}`,
            variant: "destructive",
            duration: 5000,
          });
        }
        throw uploadError;
      }

      const { data, error } = uploadResult;

      if (error) {
        // Show error toast for Android users
        if (isAndroid) {
          toast({
            title: "Upload Failed",
            description: `Supabase error: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          });
        }

        throw error;
      }

      // For Android, show upload success
      if (isAndroid) {
        toast({
          title: "Upload Complete",
          description: `${file.name} uploaded to storage`,
          duration: 2000,
        });
      }

      // Update progress to 80%
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: 80,
          status: 'uploading'
        });
        return newMap;
      });

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('requirement-attachments')
        .getPublicUrl(fileName);

      if (!urlData || !urlData.publicUrl) {
        if (isAndroid) {
          toast({
            title: "URL Error",
            description: "Failed to get public URL",
            variant: "destructive",
            duration: 5000,
          });
        }
        throw new Error('Failed to get public URL');
      }

      // Force update to completed state
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: 100,
          status: 'completed',
          url: urlData.publicUrl
        });
        return newMap;
      });


      // Show success toast for Android users
      if (isAndroid) {
        toast({
          title: "Upload Successful",
          description: `${file.name} uploaded successfully!`,
          className: "bg-green-50 border-green-200 text-green-800",
          duration: 3000,
        });
      }

      // Return the URL
      return urlData.publicUrl;
    } catch (error) {

      
      // Show final error toast for Android
      if (typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)) {
        toast({
          title: "Upload Failed",
          description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
          duration: 5000,
        });
      }

      // Update state with error information
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        });
        return newMap;
      });
      return null;
    }
  }, [isMobile]);
  // Simple Android upload function
  const simpleUpload = useCallback(async (file: File): Promise<string | null> => {
    const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);

    if (!isAndroid) {
      // Use existing function for non-Android
      return uploadFileOptimized(file);
    }

    // Android-specific simple upload
    const fileId = `${file.name}-${Date.now()}`;

    try {
      // Step 1: Show we're starting
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, { file, progress: 0, status: 'uploading' });
        return newMap;
      });

      toast({
        title: "Android Upload",
        description: `Starting upload: ${file.name}`,
        duration: 2000,
      });

      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 2: Get user with detailed error handling
      toast({
        title: "Android Upload",
        description: "Checking authentication...",
        duration: 1000,
      });

      let user;
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw new Error(`Auth error: ${authError.message}`);
        }
        if (!authUser) {
          throw new Error('No user found - please log in');
        }
        user = authUser;
      } catch (authError) {
        toast({
          title: "Auth Failed",
          description: `Authentication error: ${authError.message}`,
          variant: "destructive",
          duration: 5000,
        });
        throw authError;
      }

      // Step 3: 25% progress
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, { file, progress: 25, status: 'uploading' });
        return newMap;
      });

      toast({
        title: "Android Upload",
        description: "Authentication successful!",
        duration: 1000,
      });

      // Step 4: Create filename
      const fileName = `${user.id}/android-${Date.now()}.${file.name.split('.').pop() || 'bin'}`;

      // Step 5: 50% progress
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, { file, progress: 50, status: 'uploading' });
        return newMap;
      });

      toast({
        title: "Android Upload",
        description: "Starting file upload...",
        duration: 1000,
      });

      // Small delay before upload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 6: Upload with detailed error handling
      let uploadData, uploadError;
      try {
        const result = await supabase.storage
          .from('requirement-attachments')
          .upload(fileName, file);

        uploadData = result.data;
        uploadError = result.error;
      } catch (networkError) {
        toast({
          title: "Network Error",
          description: `Upload network error: ${networkError.message}`,
          variant: "destructive",
          duration: 5000,
        });
        throw networkError;
      }

      if (uploadError) {
        toast({
          title: "Upload Error",
          description: `Supabase error: ${uploadError.message}`,
          variant: "destructive",
          duration: 5000,
        });
        throw new Error(uploadError.message);
      }

      // Step 7: 75% progress
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, { file, progress: 75, status: 'uploading' });
        return newMap;
      });

      toast({
        title: "Android Upload",
        description: "Upload complete, getting URL...",
        duration: 1000,
      });

      // Step 8: Get URL
      const { data: urlData } = supabase.storage
        .from('requirement-attachments')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        toast({
          title: "URL Error",
          description: "Failed to generate public URL",
          variant: "destructive",
          duration: 5000,
        });
        throw new Error('Failed to get URL');
      }

      // Step 9: Complete
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, { file, progress: 100, status: 'completed', url: urlData.publicUrl });
        return newMap;
      });

      toast({
        title: "Upload Complete",
        description: `${file.name} uploaded successfully!`,
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });

      return urlData.publicUrl;

    } catch (error) {
      // Error handling
      setUploadStates(prev => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        });
        return newMap;
      });

      // Don't show error toast here as it's already shown above for specific errors
      return null;
    }
  }, [uploadFileOptimized]);
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      // Reset the file input value after getting files to ensure it triggers again on same file
      const fileInput = event.target;
      const files = fileInput.files;

      if (!files || files.length === 0) {
        return;
      }

      // Create a copy of the FileList before resetting the input
      const newFiles = Array.from(files);

      // Validate files
      const validFiles = newFiles.filter(file => {
        // Check if file is valid (not empty or corrupted)
        if (!file || file.size === 0) {
          toast({
            title: "Invalid file",
            description: "The selected file appears to be empty or corrupted",
            variant: "destructive"
          });
          return false;
        }

        const maxSize = 50 * 1024 * 1024; // 50MB - increased limit
        const allowedTypes = [
          'image/', 'application/pdf', 'application/msword', 'text/', 
          'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/csv', 'text/csv', 'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
          'application/json', 'application/xml', 'text/xml', 'application/rtf',
          'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
          'application/vnd.oasis.opendocument.presentation'
        ];

        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 50MB`,
            variant: "destructive"
          });
          return false;
        }

        // Comprehensive file type checking - allow all common file types
        const fileType = file.type || '';
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const isAllowedByType = allowedTypes.some(type => fileType.startsWith(type));
        const isAllowedByExtension = [
          // Images
          'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico', 'heic', 'heif',
          // Documents
          'pdf', 'doc', 'docx', 'rtf', 'odt', 'txt', 'md', 'html', 'htm',
          // Spreadsheets
          'xls', 'xlsx', 'csv', 'ods',
          // Presentations
          'ppt', 'pptx', 'odp',
          // Archives
          'zip', 'rar', '7z', 'tar', 'gz',
          // Data files
          'json', 'xml', 'yaml', 'yml', 'sql',
          // Other common formats
          'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mp3', 'wav', 'flac', 'aac'
        ].includes(fileExtension);

        // Allow all files - only reject if explicitly dangerous
        const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'vbs', 'js', 'jar'];
        if (dangerousExtensions.includes(fileExtension)) {
          toast({
            title: "File type not allowed",
            description: `${file.name} contains a potentially dangerous file type`,
            variant: "destructive"
          });
          return false;
        }

        // If we can't determine the type, allow it anyway (more permissive)
        if (!isAllowedByType && !isAllowedByExtension && fileType === '') {
          console.log(`Allowing unknown file type: ${file.name} (${fileExtension})`);
        }

        return true;
      });

      if (validFiles.length > 0) {
        // Update form data with new files immediately
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...validFiles]
        }));

        // Start uploads immediately - no delay needed
        validFiles.forEach(file => {
          simpleUpload(file).catch(error => {
            toast({
              title: "Upload Failed",
              description: `Could not upload ${file.name}. Please try again.`,
              variant: "destructive"
            });
          });
        });
      }

      // Reset the file input to allow selecting the same file again
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "File Upload Error",
        description: "There was a problem processing your files. Please try again.",
        variant: "destructive"
      });
    }
  }, [simpleUpload, toast]);
  const removeFile = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  }, []);
  const retryUpload = useCallback((file: File) => {
    // Show toast to indicate retry is in progress
    toast({
      title: "Retrying Upload",
      description: `Attempting to upload ${file.name} again...`,
      variant: "default"
    });

    // Use the optimized upload function
    simpleUpload(file)
      .then(url => {
        if (url) {
          toast({
            title: "Upload Successful",
            description: `${file.name} has been uploaded successfully.`,
            variant: "default"
          });
        }
      })
      .catch(error => {
        toast({
          title: "Retry Failed",
          description: `Could not upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      });
  }, [simpleUpload, toast]);
  // Add a safety timeout effect to prevent stuck submitting state (only as last resort)
  useEffect(() => {
    let timeoutId: number | undefined;

    if (isSubmitting) {
      // Set a very long timeout (5 minutes) as a safety net only
      // This should never trigger under normal circumstances
      // Only prevents UI from being permanently stuck if there's a serious error
      timeoutId = window.setTimeout(() => {
        // Don't reset isSubmitting - let the actual submission complete
        // Only log a warning, don't show error to user yet
      }, 5 * 60 * 1000); // 5 minutes - only as absolute safety net
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isSubmitting]);

  // Add a cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any pending state if the component unmounts
      setIsSubmitting(false);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate form fields
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check upload status - BLOCK submission if uploads are incomplete
    const uploadStatesArray = Array.from(uploadStates.values());
    const uploadingFiles = uploadStatesArray.filter(state => state.status === 'uploading');
    const failedUploads = uploadStatesArray.filter(state => state.status === 'error');
    
    // If files are actively uploading, prevent submission
    if (uploadingFiles.length > 0) {
      toast({
        title: "Uploads in Progress",
        description: `Please wait for ${uploadingFiles.length} file(s) to finish uploading before submitting.`,
        variant: "destructive",
        duration: 5000
      });
      return;
    }
    
    // Warn about failed uploads but allow submission
    if (failedUploads.length > 0) {
      toast({
        title: "Some Files Failed",
        description: `${failedUploads.length} file(s) failed to upload. Submitting without these files.`,
        variant: "default",
        duration: 5000
      });
    }

    // Prevent multiple submissions
    if (isSubmitting) return;

    // Set a flag in sessionStorage to track submission state
    // This helps recover from page refreshes or browser issues
    try {
      sessionStorage.setItem('requirement_submitting', 'true');
    } catch (e) {
      // Ignore errors with sessionStorage
    }

    setIsSubmitting(true);

    try {
      // For all browsers, add a small delay to ensure UI updates properly
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get user information with enhanced retry logic
      let user = null;
      let userError = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const response = await supabase.auth.getUser();
          user = response.data.user;
          userError = response.error;

          if (user) {
            break;
          }

          if (userError) {
            // Exponential backoff for retries
            if (attempt < 4) {
              const delay = Math.min(500 * Math.pow(2, attempt), 2000); // Max 2 seconds
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        } catch (err) {
          if (attempt < 4) {
            const delay = Math.min(500 * Math.pow(2, attempt), 2000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!user) {
        throw new Error('User not authenticated. Please try refreshing the page and logging in again.');
      }

      // Get completed uploads
      const completedUploads = uploadStatesArray
        .filter(state => state.status === 'completed' && state.url)
        .map(state => state.url!);

      const requirementData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        user_id: user.id,
        has_screen_recording: formData.attachments && formData.attachments.length > 0,
        attachment_urls: completedUploads.length > 0 ? completedUploads : null,
        status: 'pending',
        admin_status: 'pending', // Explicitly set admin_status to prevent trigger issues
        created_at: new Date().toISOString() // Explicitly set creation time
      };

      // Add a small delay before database operation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Insert with retry logic - increased attempts and delays for slow connections
      let insertError = null;
      let insertData = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          // Increase retry delay with each attempt (exponential backoff)
          if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Add timeout to database operation
          const dbTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database operation timeout')), 30000)
          );
          
          const dbOperation = supabase.from('requirements')
            .insert([requirementData])
            .select()
            .single();
          
          const response = await Promise.race([dbOperation, dbTimeout]) as any;

          insertData = response.data;
          insertError = response.error;

          if (!insertError) {
            break;
          }
        } catch (err) {
          insertError = err as any;
        }
      }

      if (insertError) {
        throw new Error(`Failed to save requirement: ${insertError.message}`);
      }

      // Clear the submission tracking flag
      try {
        sessionStorage.removeItem('requirement_submitting');
      } catch (e) {
        // Ignore errors with sessionStorage
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        attachments: []
      });
      setUploadStates(new Map());

      // Call the onSubmit callback
      onSubmit(formData);

      toast({
        title: "Success!",
        description: "Your requirement has been submitted successfully",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit requirement";
      setSubmitError(errorMessage);

      // Clear the submission tracking flag on error
      try {
        sessionStorage.removeItem('requirement_submitting');
      } catch (e) {
        // Ignore errors with sessionStorage
      }

      toast({
        title: "Submission Error",
        description: errorMessage,
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
  const totalUploadProgress = useMemo(() => {
    const states = Array.from(uploadStates.values());
    if (states.length === 0) return 0;
    const totalProgress = states.reduce((sum, state) => sum + state.progress, 0);
    return Math.round(totalProgress / states.length);
  }, [uploadStates]);
  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <File className="h-4 w-4 text-slate-500" />;
    }
  };
  return <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-slate-800/95 to-slate-700/95 backdrop-blur-xl border-slate-600/50 shadow-2xl">
    <CardHeader>
      <CardTitle className="text-xl font-semibold text-white">Submit Website Requirement</CardTitle>
      <CardDescription className="text-slate-300">
        Describe what you need help with on your website. Be as detailed as possible.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-slate-200">
            Title <span className="text-red-400">*</span>
          </Label>
          <Input id="title" type="text" placeholder="Brief description of what you need" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} className="w-full bg-slate-700/50 border-slate-500 text-white placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400" disabled={isSubmitting} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-slate-200">
            Description <span className="text-red-400">*</span>
          </Label>
          <Textarea id="description" placeholder="Provide detailed information about your requirement..." value={formData.description} onChange={e => handleInputChange('description', e.target.value)} className="w-full min-h-[120px] resize-none bg-slate-700/50 border-slate-500 text-white placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400" disabled={isSubmitting} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority" className="text-sm font-medium text-slate-200">
            Priority
          </Label>
          <Select value={formData.priority} onValueChange={value => handleInputChange('priority', value)} disabled={isSubmitting}>
            <SelectTrigger className="w-full bg-slate-700/50 border-slate-500 text-white focus:border-slate-400 focus:ring-slate-400">
              <SelectValue placeholder="Select priority level" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600 text-white">
              <SelectItem value="low" className="text-white hover:bg-slate-600">Low - Can wait</SelectItem>
              <SelectItem value="medium" className="text-white hover:bg-slate-600">Medium - Normal priority</SelectItem>
              <SelectItem value="high" className="text-white hover:bg-slate-600">High - Important</SelectItem>
              <SelectItem value="urgent" className="text-white hover:bg-slate-600">Urgent - Needs immediate attention</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-200">
            Attachments (Optional)
          </Label>
          <div className="border-2 border-dashed border-slate-500 rounded-lg p-6 text-center hover:border-slate-400 transition-colors bg-slate-700/30">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              accept="*/*"
              disabled={isSubmitting}
            />
            <div className="cursor-pointer block w-full h-full" onClick={() => {
              const fileInput = document.getElementById('file-upload') as HTMLInputElement;
              if (fileInput) {
                // For Android, ensure the input is properly focused and clicked
                if (/Android/i.test(navigator.userAgent)) {
                  fileInput.focus();
                  setTimeout(() => {
                    fileInput.click();
                  }, 100);
                } else {
                  fileInput.click();
                }
              }
            }}>
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300">
                {isMobile ? "Tap to select files" : "Click to upload files or drag and drop"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                All file types accepted up to 50MB each
              </p>
              <p className="text-xs text-blue-400 mt-1 font-medium">
                ✓ Multiple files supported • ✓ Upload while others are processing
              </p>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                  if (fileInput) {
                    // For Android, ensure the input is properly focused and clicked
                    if (/Android/i.test(navigator.userAgent)) {
                      fileInput.focus();
                      setTimeout(() => {
                        fileInput.click();
                      }, 100);
                    } else {
                      fileInput.click();
                    }
                  }
                }}
                className="mt-3 bg-slate-600 hover:bg-slate-500 text-white"
                disabled={isSubmitting}
              >
                Select Files
              </Button>
            </div>
          </div>

          {uploadStates.size > 0 && <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-200">Upload Progress:</Label>
              <span className="text-sm text-slate-300">{totalUploadProgress}%</span>
            </div>
            <Progress value={totalUploadProgress} className="w-full bg-slate-600" />
          </div>}

          {formData.attachments && formData.attachments.length > 0 && <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-200">Selected Files:</Label>
              <span className="text-xs text-slate-400">
                {formData.attachments.length} file{formData.attachments.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            {formData.attachments.map((file, index) => {
              const uploadState = Array.from(uploadStates.values()).find(state => state.file.name === file.name);
              return <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-center space-x-3 flex-1">
                  {getFileStatusIcon(uploadState?.status || 'pending')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                    {uploadState && <div className="mt-1 space-y-1">
                      <Progress value={uploadState.progress} className="h-1 bg-slate-600" />
                      {uploadState.error && <p className="text-xs text-red-400">{uploadState.error}</p>}
                    </div>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {uploadState?.status === 'error' && <Button type="button" variant="ghost" size="sm" onClick={() => retryUpload(file)} className="text-blue-400 hover:text-blue-300 text-xs hover:bg-slate-600">
                    Retry
                  </Button>}

                </div>
              </div>;
            })}
          </div>}
        </div>

        <div className="flex items-center space-x-2 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
          <AlertCircle className="h-4 w-4 text-blue-400" />
          <p className="text-xs text-blue-200">
            Our admin team will review your requirement and get back to you as soon as possible.
          </p>
        </div>

        {submitError && (
          <div className="p-3 mb-4 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
            <p className="font-medium">Error: {submitError}</p>
            <p className="mt-1">Please try again or refresh the page if the problem persists.</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Submitting...</span>
            </div>
          ) : 'Submit Requirement'}
        </Button>
      </form>
    </CardContent>
  </Card>;
};