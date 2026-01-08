import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Shield, Activity } from 'lucide-react';

export function SplashScreen() {
  const { setCurrentScreen } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScreen('onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setCurrentScreen]);

  return (
    <div className="absolute inset-0 bg-gradient-primary flex flex-col items-center justify-center">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary-foreground/5 animate-pulse-gentle" />
        <div className="absolute bottom-32 right-8 w-24 h-24 rounded-full bg-primary-foreground/5 animate-pulse-gentle delay-300" />
        <div className="absolute top-1/3 right-16 w-16 h-16 rounded-full bg-primary-foreground/5 animate-pulse-gentle delay-500" />
      </div>

      {/* Logo */}
      <div className="relative animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20 shadow-elevated">
          <div className="relative">
            <Shield className="w-14 h-14 text-primary-foreground" />
            <Activity className="w-6 h-6 text-secondary-light absolute -bottom-1 -right-1" />
          </div>
        </div>
      </div>

      {/* App Name */}
      <h1 className="text-4xl font-bold text-primary-foreground mt-4 animate-fade-in delay-200">
        MediGuide
      </h1>

      {/* Tagline */}
      <p className="text-secondary-light text-body-lg mt-2 animate-fade-in delay-300">
        Your Proactive Health Partner
      </p>

      {/* Loading Indicator */}
      <div className="absolute bottom-24 flex gap-2 animate-fade-in delay-500">
        <div className="w-2 h-2 rounded-full bg-primary-foreground/40 animate-pulse-gentle" />
        <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse-gentle delay-100" />
        <div className="w-2 h-2 rounded-full bg-primary-foreground/80 animate-pulse-gentle delay-200" />
      </div>
    </div>
  );
}
