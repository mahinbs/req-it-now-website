
import React from 'react';
import { EnhancedLoadingScreen } from './EnhancedLoadingScreen';

interface LoadingScreenProps {
  error?: string | null;
}

export const LoadingScreen = ({ error }: LoadingScreenProps) => {
  return (
    <EnhancedLoadingScreen 
      error={error}
      timeout={15000}
      loadingText="Loading your dashboard..."
      showProgress={true}
    />
  );
};
