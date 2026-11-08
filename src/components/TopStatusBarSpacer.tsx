import React from 'react';
import { Capacitor } from '@capacitor/core';

interface TopStatusBarSpacerProps {
  className?: string;
  bgColor?: string;
}

export const TopStatusBarSpacer: React.FC<TopStatusBarSpacerProps> = ({
  className = '',
  bgColor = '#1a1b20',
}) => {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const heightStyle = isNative
    ? 'max(env(safe-area-inset-top, 0px), 38px)'
    : 'env(safe-area-inset-top, 0px)';

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 left-0 right-0 z-50 pointer-events-none select-none transition-colors duration-200 ${
        isNative ? 'border-b border-[#2a2c36]/80' : ''
      } ${className}`}
      style={{
        backgroundColor: bgColor,
        height: heightStyle,
      }}
    />
  );
};
