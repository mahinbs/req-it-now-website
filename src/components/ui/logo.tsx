
import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Logo = ({
  className = '',
  size = 'md'
}: LogoProps) => {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <img 
      src="https://res.cloudinary.com/dknafpppp/image/upload/v1749387988/boostmysites_logo_2_zaj2rr.png" 
      alt="BoostMySites Logo" 
      className={cn("object-contain", sizeClasses[size], className)}
    />
  );
};
