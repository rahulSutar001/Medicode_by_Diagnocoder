import React from 'react';
import { X, Check, Crown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PremiumModal() {
  const { showPremiumModal, setShowPremiumModal } = useApp();

  if (!showPremiumModal) return null;

  const features = [
    { feature: 'Monthly Scans', free: '3', premium: 'Unlimited' },
    { feature: 'AI Explanations', free: 'Basic', premium: 'Detailed' },
    { feature: 'Family Members', free: '2', premium: 'Unlimited' },
    { feature: 'Health Trends', free: '❌', premium: '✓' },
    { feature: 'Export Reports', free: '❌', premium: '✓' },
    { feature: 'Priority Support', free: '❌', premium: '✓' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => setShowPremiumModal(false)}
      />
      
      {/* Modal */}
      <div className="relative w-[340px] max-h-[600px] bg-card rounded-2xl shadow-elevated overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-primary p-6 text-center relative">
          <button 
            onClick={() => setShowPremiumModal(false)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <Crown className="w-12 h-12 text-warning mx-auto mb-3" />
          <h2 className="text-title text-primary-foreground font-bold">Go Premium</h2>
          <p className="text-body text-primary-foreground/80 mt-1">Unlock all features</p>
        </div>

        {/* Comparison Table */}
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div />
            <span className="text-body-sm text-text-secondary font-medium">Free</span>
            <span className="text-body-sm text-warning font-medium">Premium</span>
          </div>
          
          <div className="space-y-3">
            {features.map((item, index) => (
              <div 
                key={item.feature}
                className="grid grid-cols-3 gap-2 items-center py-2 border-b border-border last:border-0"
              >
                <span className="text-body text-foreground">{item.feature}</span>
                <span className="text-body text-text-secondary text-center">{item.free}</span>
                <span className={cn(
                  "text-body text-center font-medium",
                  item.premium === '✓' ? 'text-success' : 'text-primary'
                )}>
                  {item.premium}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-5 pt-0">
          <Button size="lg" className="w-full">
            <Crown className="w-5 h-5 mr-2" />
            Upgrade to Premium
          </Button>
          <p className="text-caption text-text-tertiary text-center mt-3">
            ₹199/month • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
