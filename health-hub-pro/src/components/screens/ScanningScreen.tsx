import React, { useEffect, useState, useRef } from 'react';
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
  const startTimeRef = useRef<number>(Date.now());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Reset start time on mount
    startTimeRef.current = Date.now();

    if (!currentReportId) {
      // Small delay to allow state to propagate if coming from a fast transition
      const timer = setTimeout(() => {
        if (!currentReportId) {
          console.log('No currentReportId after delay, redirecting to scan');
          setCurrentScreen('scan');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    const pollStatus = async () => {
      try {
        if (!isMounted) return;

        // Check for timeout (60 seconds)
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > 60000) {
          console.error('Analysis timed out');
          toast.error('Analysis timed out. Please try again.');
          setCurrentScreen('scan-error');
          return;
        }

        console.log(`Polling status for report: ${currentReportId}`);
        const reportStatus = await getReportStatus(currentReportId);
        console.log('Received report status:', reportStatus);

        if (!isMounted) return;

        const status = reportStatus.status.toLowerCase();

        if (status === 'processing') {
          // Calculate progress based on time, capping at 90% until complete
          // Assuming typical completion takes ~15-20s
          const estimatedProgress = Math.min(Math.floor((elapsed / 20000) * 90), 90);
          setProgress(Math.max(estimatedProgress, 10)); // Min 10% to show activity

          // Schedule next poll
          pollingRef.current = setTimeout(pollStatus, 2000);

        } else if (status === 'completed') {
          console.log('Report completed, navigating to result...');
          setProgress(100);

          // Small delay to show 100% before transition
          setTimeout(() => {
            if (isMounted) {
              setCurrentScreen('report-result');
            }
          }, 500);

        } else if (status === 'failed') {
          console.error('Report processing failed:', reportStatus.error_message);
          toast.error(reportStatus.error_message || 'Report processing failed. Please try again.');
          setTimeout(() => {
            if (isMounted) {
              setCurrentScreen('scan-error');
            }
          }, 500);

        } else {
          // Unknown status, assume processing but log warning
          console.warn('Unknown status received:', status);
          pollingRef.current = setTimeout(pollStatus, 2000);
        }
      } catch (error: any) {
        console.error('Status check failed:', error);

        // Critical errors (404, 400) should fail immediately
        if (error.status === 404 || error.status === 400) {
          toast.error('Analysis failed: Report not found or invalid.');
          setCurrentScreen('scan-error');
          return;
        }

        // Retry on network errors until timeout
        if (isMounted) {
          pollingRef.current = setTimeout(pollStatus, 2000);
        }
      }
    };

    // Start polling
    pollStatus();

    return () => {
      isMounted = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [currentReportId, setCurrentScreen]);

  return (
    <div className="absolute inset-0 bg-foreground/80 flex items-center justify-center z-50">
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
            className="h-full bg-gradient-primary transition-all duration-300 ease-out"
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
