import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus } from 'lucide-react';
import { getReportStatus } from '@/lib/api';
import { toast } from 'sonner';

const funFacts = [
  "Did you know? The human heart creates enough pressure to squirt blood 30 feet.",
  "Your body has about 60,000 miles of blood vessels.",
  "The human brain uses about 20% of the body's total energy.",
  "You produce about 25,000 quarts of saliva in a lifetime.",
  "The acid in your stomach is strong enough to dissolve metal.",
];

export function ScanningScreen() {
  const { setCurrentScreen, currentReportId } = useApp();
  const [fact] = useState(funFacts[Math.floor(Math.random() * funFacts.length)]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('processing');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    if (!currentReportId) {
      // No report ID, go back to scan screen
      setCurrentScreen('scan');
      return;
    }

    const pollStatus = async () => {
      try {
        if (!isMounted) return;

        const reportStatus = await getReportStatus(currentReportId);

        if (!isMounted) return;

        setStatus(reportStatus.status);

        // Update progress (estimate based on status)
        if (reportStatus.status === 'processing') {
          setProgress(prev => Math.min(prev + 5, 90)); // Gradually increase to 90%
          // Schedule next poll
          timeoutId = setTimeout(pollStatus, 2000);
        } else if (reportStatus.status === 'completed') {
          setProgress(100);
          setTimeout(() => {
            if (isMounted) {
              setCurrentScreen('report-result');
            }
          }, 500);
        } else if (reportStatus.status === 'failed') {
          toast.error('Report processing failed. Please try again.');
          setTimeout(() => {
            if (isMounted) {
              setCurrentScreen('scan-error');
            }
          }, 500);
        }
      } catch (error: any) {
        console.error('Status check failed:', error);
        // Continue polling on error (might be temporary network glitch)
        if (isMounted) {
          timeoutId = setTimeout(pollStatus, 2000);
        }
      }
    };

    // Start polling
    pollStatus();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentReportId, setCurrentScreen]);

  return (
    <div className="absolute inset-0 bg-foreground/80 flex items-center justify-center">
      {/* Modal Card */}
      <div className="w-[280px] bg-card rounded-3xl p-8 shadow-elevated flex flex-col items-center animate-scale-in">
        {/* Animated Medical Cross */}
        <div className="w-20 h-20 relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse-gentle" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Plus className="w-12 h-12 text-primary animate-pulse-gentle" />
          </div>
          {/* Orbiting Dots */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '1s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-secondary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-subtitle text-foreground text-center mb-4">
          Analysing your report...
        </h2>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-primary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Fun Fact */}
        <p className="text-body text-text-secondary text-center leading-relaxed">
          {fact}
        </p>
      </div>
    </div>
  );
}
