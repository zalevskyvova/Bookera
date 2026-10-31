import React from 'react';

interface TopStatusBarSpacerProps {
  className?: string;
  bgColor?: string;
}

export const TopStatusBarSpacer: React.FC<TopStatusBarSpacerProps> = ({
  className = '',
  bgColor = '#1a1b20',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 left-0 right-0 z-50 pointer-events-none select-none border-b border-[#2a2c36]/80 transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: bgColor,
        height: 'max(env(safe-area-inset-top, 0px), 34px)',
      }}
    />
  );
};
