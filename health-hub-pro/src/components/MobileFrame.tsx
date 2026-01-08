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
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="mobile-frame relative overflow-hidden rounded-[40px]">
        {children}
      </div>
    </div>
  );
}
