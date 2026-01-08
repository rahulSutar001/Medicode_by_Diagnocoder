import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Shield, FileSearch, TrendingUp, Users, Activity } from 'lucide-react';

export function OnboardingScreen() {
  const { setShowAuthModal, setAuthMode } = useApp();

  const features = [
    {
      icon: FileSearch,
      title: 'Lab Report Scanner',
      subtitle: 'AI-powered report analysis',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: TrendingUp,
      title: 'Health Tracking',
      subtitle: 'Monitor trends over time',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Users,
      title: 'Family Monitoring',
      subtitle: 'Care for your loved ones',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleSignup = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  return (
    <div className="absolute inset-0 bg-background-secondary overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-medical-pattern opacity-50" />
      
      {/* Header */}
      <div className="pt-16 px-5 flex flex-col items-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-primary">
          <div className="relative">
            <Shield className="w-8 h-8 text-primary-foreground" />
            <Activity className="w-4 h-4 text-secondary-light absolute -bottom-0.5 -right-0.5" />
          </div>
        </div>
        <h1 className="text-title text-foreground mt-4 font-bold">MediGuide</h1>
        <p className="text-text-secondary text-body mt-1">Your health, simplified</p>
      </div>

      {/* Feature Cards */}
      <div className="px-5 mt-10 space-y-4">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="card-elevated p-5 flex items-center gap-4 animate-fade-in"
            style={{ animationDelay: `${(index + 1) * 150}ms` }}
          >
            <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center`}>
              <feature.icon className={`w-7 h-7 ${feature.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-section text-foreground">{feature.title}</h3>
              <p className="text-body text-text-secondary mt-0.5">{feature.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 bg-gradient-to-t from-background-secondary via-background-secondary to-transparent pt-12">
        <div className="flex gap-4 animate-fade-in delay-500">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-12"
            onClick={handleLogin}
          >
            Log In
          </Button>
          <Button
            size="lg"
            className="flex-1 h-12"
            onClick={handleSignup}
          >
            Sign Up
          </Button>
        </div>
        <p className="text-caption text-text-tertiary text-center mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
