
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({ className = '', size = 'md' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <img 
      src="https://res.cloudinary.com/dknafpppp/image/upload/v1749387988/boostmysites_logo_2_zaj2rr.png" 
      alt="BoostMySites Logo" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};
