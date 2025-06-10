
import React from 'react';
import { EnhancedLoadingScreen } from './EnhancedLoadingScreen';

interface LoadingScreenProps {
  error?: string | null;
}

export const LoadingScreen = ({ error }: LoadingScreenProps) => {
  return (
    <EnhancedLoadingScreen 
      error={error}
      timeout={8000} // Reduced from 15000 to 8000 (8 seconds)
      loadingText="Loading your dashboard..."
      showProgress={true}
    />
  );
};
