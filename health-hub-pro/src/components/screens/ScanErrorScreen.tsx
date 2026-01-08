import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ScanErrorScreen() {
  const { setCurrentScreen } = useApp();

  const tips = [
    'Document is flat on a dark surface',
    'Lighting is even with no shadows',
    'All corners are visible',
  ];

  return (
    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center px-8">
      {/* Warning Icon */}
      <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-6 animate-fade-in">
        <AlertTriangle className="w-8 h-8 text-warning" />
      </div>

      {/* Title */}
      <h1 className="text-title text-foreground text-center mb-4 animate-fade-in delay-100">
        Let's try that again
      </h1>

      {/* Message */}
      <p className="text-body-lg text-text-secondary text-center mb-6 animate-fade-in delay-200">
        We need a clearer image. Make sure:
      </p>

      {/* Tips */}
      <div className="space-y-3 mb-10 w-full animate-fade-in delay-300">
        {tips.map((tip, index) => (
          <div 
            key={index}
            className="flex items-center gap-3 p-4 rounded-xl bg-success-light"
          >
            <Check className="w-5 h-5 text-success shrink-0" />
            <span className="text-body text-foreground">{tip}</span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <Button 
        size="lg"
        className="w-48 animate-fade-in delay-400"
        onClick={() => setCurrentScreen('scan')}
      >
        Scan Again
      </Button>
    </div>
  );
}
