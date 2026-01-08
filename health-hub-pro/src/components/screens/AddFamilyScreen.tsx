import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, QrCode, Mail, Smartphone } from 'lucide-react';

export function AddFamilyScreen() {
  const { setCurrentScreen, setActiveTab } = useApp();

  const handleBack = () => {
    setActiveTab('family');
    setCurrentScreen('family');
  };

  const options = [
    {
      icon: QrCode,
      title: 'Scan QR Code',
      description: 'Quick invite via camera',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Mail,
      title: 'Email Invite',
      description: 'Send link via email',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      icon: Smartphone,
      title: 'Phone Number',
      description: 'Send SMS invitation',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="absolute inset-0 bg-background overflow-hidden">
      {/* Header */}
      <div className="pt-12 px-5 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <h1 className="text-title text-foreground">Add Family Member</h1>
            <p className="text-body text-text-secondary mt-0.5">Choose how to invite</p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 mt-6 space-y-4">
        {options.map((option, index) => (
          <button
            key={option.title}
            className="w-full card-elevated p-5 flex items-center gap-4 text-left transition-all hover:shadow-lg active:scale-[0.98] animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => {
              // Simulate sending invite
              setTimeout(() => {
                setCurrentScreen('nickname-popup');
              }, 500);
            }}
          >
            <div className={`w-14 h-14 rounded-xl ${option.bgColor} flex items-center justify-center`}>
              <option.icon className={`w-7 h-7 ${option.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-section text-foreground">{option.title}</h3>
              <p className="text-body text-text-secondary mt-0.5">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
