import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { TabBar } from '@/components/TabBar';
import { Shield, Check, Lightbulb, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HomeScreen() {
  const { user, freeScansLeft, setShowPremiumModal } = useApp();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const healthTips = [
    "Drinking water before meals can aid digestion and help with portion control.",
    "Taking short walks after meals can help regulate blood sugar levels.",
    "Deep breathing for 5 minutes daily can lower stress and blood pressure.",
    "Getting 7-9 hours of sleep is crucial for immune system function.",
  ];

  const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];

  return (
    <div className="absolute inset-0 bg-background-secondary overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-subtitle text-foreground font-semibold">
              {getGreeting()}, {user?.firstName || 'User'}!
            </h1>
            <p className="text-body text-text-secondary mt-1">{formatDate()}</p>
          </div>

          {/* Premium Indicator */}
          <button
            onClick={() => setShowPremiumModal(true)}
            className="flex flex-col items-end"
          >
            <Crown className="w-6 h-6 text-warning" />
            <span className="text-caption text-text-secondary mt-1">
              {freeScansLeft}/3 free scans
            </span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 custom-scrollbar">
        {/* ABDM Connection Card */}
        <div className="card-elevated p-5 border-2 border-primary relative overflow-hidden animate-fade-in">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-medical-pattern opacity-30" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <h2 className="text-subtitle text-foreground">Your Digital Health Locker</h2>
            </div>

            <Button
              size="lg"
              className="w-full mb-4"
              onClick={() => window.open('https://abdmbeta.abdm.gov.in/', '_blank', 'noopener,noreferrer')}
            >
              Connect to ABDM
            </Button>

            <div className="space-y-2">
              {[
                'Securely store all health reports',
                'Easy sharing with doctors',
                'Build lifelong health record',
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-body text-text-secondary">{benefit}</span>
                </div>
              ))}
            </div>

            <p className="text-caption text-text-tertiary text-center mt-4">
              Protected by ABDM
            </p>
          </div>
        </div>

        {/* Health Tip Card */}
        <div className="card-elevated p-5 mt-6 animate-fade-in delay-200">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <Lightbulb className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-section text-foreground">Today's Health Tip</h3>
              <p className="text-body text-text-secondary mt-2">{randomTip}</p>
            </div>
          </div>
        </div>

      </div>

      <TabBar />
    </div>
  );
}
