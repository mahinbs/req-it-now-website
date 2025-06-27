
export interface DownloadOptions {
  forceDownload?: boolean;
  openInNewTab?: boolean;
  fileName?: string;
}

export const downloadFile = async (
  url: string, 
  fileName: string, 
  options: DownloadOptions = {}
): Promise<{ success: boolean; error?: string }> => {
  const { forceDownload = false, openInNewTab = true } = options;

  try {
    // For force download, fetch the file and create a blob
    if (forceDownload) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(downloadUrl);
      
      return { success: true };
    }

    // For opening in new tab
    if (openInNewTab) {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // Fallback if popup was blocked
        return { success: false, error: 'Pop-up blocked. Please allow pop-ups for this site.' };
      }
      return { success: true };
    }

    // Default fallback
    window.location.href = url;
    return { success: true };

  } catch (error) {
    console.error('Download failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    };
  }
};

export const getFileTypeInfo = (fileName: string, mimeType?: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const type = mimeType || '';

  const isImage = type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const isPdf = type === 'application/pdf' || extension === 'pdf';
  const isDocument = type.includes('document') || type.includes('word') || ['doc', 'docx'].includes(extension);
  const isText = type.startsWith('text/') || extension === 'txt';

  return {
    isImage,
    isPdf,
    isDocument,
    isText,
    canPreview: isImage || isPdf,
    shouldDownload: isDocument || isText
  };
};
