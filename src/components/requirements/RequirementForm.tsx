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
import { toast } from '@/hooks/use-toast';
import { uploadRequirementFile, type UploadProgress } from '@/utils/storageUtils';
import { useIsMobile } from '@/hooks/use-mobile';
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

  // Debug Android detection
  const isAndroidDevice = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);
  console.log('Device info:', {
    isMobile,
    isAndroid: isAndroidDevice,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'undefined'
  });

  const handleInputChange = useCallback((field: keyof RequirementFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  const uploadFileOptimized = useCallback(async (file: File): Promise<string | null> => {
    console.log(`Starting optimized upload for ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    console.log(`Device is ${isMobile ? 'mobile' : 'desktop'}`);

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

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate a unique requirement ID for this upload
      const tempReqId = 'temp-' + Date.now();

      // Detect Android devices specifically
      const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);

      // Special handling for mobile devices
      if (isMobile) {
        console.log(`Using mobile-specific upload approach for ${isAndroid ? 'Android' : 'iOS'}`);

        // Update progress to 20%
        setUploadStates(prev => {
          const newMap = new Map(prev);
          newMap.set(fileId, {
            file,
            progress: 20,
            status: 'uploading'
          });
          return newMap;
        });

        // Create a safe filename
        const fileExt = file.name.split('.').pop() || 'bin';
        const fileName = `${user.id}/${tempReqId}/${Date.now()}.${fileExt}`;

        try {
          // Update progress to 40%
          setUploadStates(prev => {
            const newMap = new Map(prev);
            newMap.set(fileId, {
              file,
              progress: 40,
              status: 'uploading'
            });
            return newMap;
          });

          // For mobile, ensure file is properly read first
          console.log("Starting mobile upload to Supabase");
          console.log("File details:", {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });

          // Android-specific file preparation and upload
          let uploadData = null;
          let uploadError = null;

          if (isAndroid) {
            console.log("Android: Using specialized upload method");

            // Try multiple approaches for Android
            let uploadSuccess = false;

            // Approach 1: Direct upload with original file
            try {
              console.log("Android: Attempting direct upload");
              const result = await supabase.storage
                .from('requirement-attachments')
                .upload(fileName, file, {
                  upsert: true
                });

              if (!result.error) {
                uploadSuccess = true;
                uploadData = result.data;
                console.log("Android: Direct upload succeeded");
              } else {
                console.log("Android: Direct upload failed, trying blob approach");
                throw result.error;
              }
            } catch (directError) {
              console.log("Android: Direct upload failed:", directError);

              // Approach 2: Convert to blob and retry
              try {
                console.log("Android: Converting file to blob");
                const fileArrayBuffer = await file.arrayBuffer();
                const blob = new Blob([fileArrayBuffer], { type: file.type || 'application/octet-stream' });

                const result = await supabase.storage
                  .from('requirement-attachments')
                  .upload(fileName, blob, {
                    upsert: true
                  });

                if (!result.error) {
                  uploadSuccess = true;
                  uploadData = result.data;
                  console.log("Android: Blob upload succeeded");
                } else {
                  uploadError = result.error;
                  console.log("Android: Blob upload failed:", result.error);
                }
              } catch (blobError) {
                console.log("Android: Blob upload failed:", blobError);
                uploadError = blobError;
              }
            }

            if (!uploadSuccess) {
              console.error('Android: All upload methods failed');
              throw uploadError || new Error('Upload failed on Android');
            }

            console.log("Android upload completed successfully");

          } else {
            // iOS and other mobile devices
            console.log("Non-Android mobile: Using standard upload");
            const result = await supabase.storage
              .from('requirement-attachments')
              .upload(fileName, file, {
                upsert: true
              });

            uploadData = result.data;
            uploadError = result.error;

            console.log("Upload response:", uploadData, uploadError);

            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw uploadError;
            }
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

          console.log("URL data:", urlData);

          if (!urlData || !urlData.publicUrl) {
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

          console.log(`Upload completed for ${file.name}, URL: ${urlData.publicUrl}`);

          // Return the URL
          return urlData.publicUrl;
        } catch (uploadError) {
          console.error("Mobile upload error:", uploadError);

          // Instead of using a fake URL, throw the error to be handled properly
          throw uploadError;
        }
      } else {
        // Desktop approach
        console.log("Using standard desktop upload approach");

        // Update progress to 20%
        setUploadStates(prev => {
          const newMap = new Map(prev);
          newMap.set(fileId, {
            file,
            progress: 20,
            status: 'uploading'
          });
          return newMap;
        });

        // Start the upload process
        const url = await uploadRequirementFile(
          file,
          user.id,
          tempReqId,
          (progressInfo: UploadProgress) => {
            // Update the UI with progress information
            setUploadStates(prev => {
              const newMap = new Map(prev);
              newMap.set(fileId, {
                file,
                progress: progressInfo.progress,
                status: progressInfo.status,
                error: progressInfo.error,
                url: progressInfo.status === 'completed' ? 'uploading-complete' : undefined
              });
              return newMap;
            });
          }
        );

        // If upload was successful, update the state
        if (url) {
          console.log(`Upload completed for ${file.name}, URL: ${url}`);
          setUploadStates(prev => {
            const newMap = new Map(prev);
            newMap.set(fileId, {
              file,
              progress: 100,
              status: 'completed',
              url
            });
            return newMap;
          });
          return url;
        } else {
          console.error(`Upload failed for ${file.name}`);
          throw new Error('Upload failed');
        }
      }
    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error);
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
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log("handleFileUpload triggered");

      // Reset the file input value after getting files to ensure it triggers again on same file
      const fileInput = event.target;
      const files = fileInput.files;

      console.log("Files selected:", files ? files.length : 0);

      if (!files || files.length === 0) {
        console.log("No files selected");
        return;
      }

      // Create a copy of the FileList before resetting the input
      const newFiles = Array.from(files);

      console.log("Processing files:", newFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

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

        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'text/', 'application/vnd.openxmlformats-officedocument'];

        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB`,
            variant: "destructive"
          });
          return false;
        }

        // More permissive file type checking for mobile devices
        const fileType = file.type || '';
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const isAllowedByType = allowedTypes.some(type => fileType.startsWith(type));
        const isAllowedByExtension = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'].includes(fileExtension);

        if (!isAllowedByType && !isAllowedByExtension) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type`,
            variant: "destructive"
          });
          return false;
        }

        return true;
      });

      if (validFiles.length > 0) {
        // Update form data with new files
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...validFiles]
        }));

        // Start uploads with a small delay to ensure UI updates first
        setTimeout(() => {
          validFiles.forEach(file => {
            uploadFileOptimized(file).catch(error => {
              console.error(`Upload failed for ${file.name}:`, error);
              toast({
                title: "Upload Failed",
                description: `Could not upload ${file.name}. Please try again.`,
                variant: "destructive"
              });
            });
          });
        }, 100);
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
  }, [uploadFileOptimized, toast]);
  const removeFile = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  }, []);
  const retryUpload = useCallback((file: File) => {
    console.log(`Retrying upload for ${file.name}`);

    // Show toast to indicate retry is in progress
    toast({
      title: "Retrying Upload",
      description: `Attempting to upload ${file.name} again...`,
      variant: "default"
    });

    // Use the optimized upload function
    uploadFileOptimized(file)
      .then(url => {
        if (url) {
          console.log(`Retry successful for ${file.name}`);
          toast({
            title: "Upload Successful",
            description: `${file.name} has been uploaded successfully.`,
            variant: "default"
          });
        }
      })
      .catch(error => {
        console.error(`Retry upload failed for ${file.name}:`, error);
        toast({
          title: "Retry Failed",
          description: `Could not upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      });
  }, [uploadFileOptimized, toast]);
  // Add a timeout effect to prevent stuck submitting state
  useEffect(() => {
    let timeoutId: number | undefined;

    if (isSubmitting) {
      // Set a timeout to automatically reset the submitting state after 10 seconds
      // This prevents the UI from being stuck in a submitting state if something goes wrong
      timeoutId = window.setTimeout(() => {
        setIsSubmitting(false);
        setSubmitError('Submission timed out. Please try again.');
        toast({
          title: "Submission Timeout",
          description: "The request is taking too long. Please try again.",
          variant: "destructive"
        });
      }, 10000); // Reduced timeout to 10 seconds
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

    // Check if any uploads are in progress
    const uploadStatesArray = Array.from(uploadStates.values());
    const hasUploadingFiles = uploadStatesArray.some(state => state.status === 'uploading');
    if (hasUploadingFiles) {
      toast({
        title: "Upload in Progress",
        description: "Please wait for all files to finish uploading",
        variant: "destructive"
      });
      return;
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

      // Get user information with retry logic
      let user = null;
      let userError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await supabase.auth.getUser();
          user = response.data.user;
          userError = response.error;

          if (user) break;

          if (userError) {
            console.warn(`Auth attempt ${attempt + 1} failed:`, userError);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error(`Auth attempt ${attempt + 1} error:`, err);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
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
        created_at: new Date().toISOString() // Explicitly set creation time
      };

      // Add a small delay before database operation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Insert with retry logic
      let insertError = null;
      let insertData = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await supabase.from('requirements')
            .insert([requirementData])
            .select()
            .single();

          insertData = response.data;
          insertError = response.error;

          if (!insertError) break;

          console.warn(`Insert attempt ${attempt + 1} failed:`, insertError);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Insert attempt ${attempt + 1} error:`, err);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
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
      console.error('Submission error:', error);
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
              accept="image/*,.pdf,.doc,.docx,.txt"
              disabled={isSubmitting}
              capture={isMobile && !(/Android/i.test(navigator.userAgent)) ? "environment" : undefined}
            />
            <div className="cursor-pointer block w-full h-full" onClick={() => {
              const fileInput = document.getElementById('file-upload') as HTMLInputElement;
              if (fileInput) {
                // For Android, ensure the input is properly focused and clicked
                if (/Android/i.test(navigator.userAgent)) {
                  console.log('Android: Triggering file input');
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
                Images, PDFs, documents up to 10MB each
              </p>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                  if (fileInput) {
                    // For Android, ensure the input is properly focused and clicked
                    if (/Android/i.test(navigator.userAgent)) {
                      console.log('Android: Button click - triggering file input');
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
            <Label className="text-sm font-medium text-slate-200">Selected Files:</Label>
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