
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
      src="https://res.cloudinary.com/dknafpppp/image/upload/v1748806784/freepik_br_f976b57b-9b0c-47dc-8aa0-439758154a91_cpevk3.png" 
      alt="req-it-now Logo" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};
