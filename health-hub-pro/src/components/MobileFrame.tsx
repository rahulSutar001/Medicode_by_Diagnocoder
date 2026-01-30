import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
}

/**
 * MobileFrame component - Wraps content in a mobile device frame
 * Creates a centered mobile phone mockup with proper dimensions and styling
 */
export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="min-h-screen bg-background w-full">
      {children}
    </div>
  );
}
