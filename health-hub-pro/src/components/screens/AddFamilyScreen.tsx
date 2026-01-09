import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, QrCode, Mail, Smartphone, ScanLine, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { inviteFamilyMember } from '@/lib/api';

type Mode = 'select' | 'qr' | 'email' | 'phone';

export function AddFamilyScreen() {
  const { setCurrentScreen, setActiveTab } = useApp();
  const [mode, setMode] = useState<Mode>('select');
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleBack = () => {
    if (mode === 'select') {
      setActiveTab('family');
      setCurrentScreen('family');
    } else {
      setMode('select');
      setInputValue('');
      setIsScanning(false);
    }
  };

  // Simulate QR Scan
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (mode === 'qr') {
      setIsScanning(true);
      timeout = setTimeout(() => {
        setIsScanning(false);
        toast.success('Family member found!');
        // Simulate finding a member and asking for confirmation or nickname
        setCurrentScreen('nickname-popup');
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [mode, setCurrentScreen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) {
      toast.error('Please enter a valid value');
      return;
    }

    try {
      if (mode === 'email') {
        await inviteFamilyMember({ email: inputValue }); // Assuming inviteFamilyMember is defined elsewhere
      } else if (mode === 'phone') {
        await inviteFamilyMember({ phone_number: inputValue }); // Assuming inviteFamilyMember is defined elsewhere
      }
      toast.success(`Invitation sent to ${inputValue}`);
      setTimeout(() => {
        handleBack();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    }
  };

  const options = [
    {
      id: 'qr',
      icon: QrCode,
      title: 'Scan QR Code',
      description: 'Quick invite via camera',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 'email',
      icon: Mail,
      title: 'Email Invite',
      description: 'Send link via email',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      id: 'phone',
      icon: Smartphone,
      title: 'Phone Number',
      description: 'Send SMS invitation',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  const renderContent = () => {
    if (mode === 'qr') {
      return (
        <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-5">
          {/* Camera Overlay */}
          <div className="absolute inset-0 bg-black/50 z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary rounded-3xl bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {isScanning && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary/50 animate-scan"></div>
              )}
            </div>
          </div>

          <div className="relative z-10 text-center mt-80">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h2 className="text-white text-subtitle font-bold">Scanning...</h2>
            <p className="text-white/70 text-body mt-2">Point camera at family member's QR code</p>
          </div>
        </div>
      );
    }

    if (mode === 'email' || mode === 'phone') {
      const isEmail = mode === 'email';
      return (
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex-1">
            <div className={`w-16 h-16 rounded-2xl ${isEmail ? 'bg-secondary/10' : 'bg-success/10'} flex items-center justify-center mb-6`}>
              {isEmail ? <Mail className="w-8 h-8 text-secondary" /> : <Smartphone className="w-8 h-8 text-success" />}
            </div>
            <h2 className="text-subtitle font-bold text-foreground mb-2">
              {isEmail ? 'Invite via Email' : 'Invite via Phone'}
            </h2>
            <p className="text-body text-text-secondary mb-8">
              {isEmail ? 'We will send an invitation link to their email address.' : 'We will send an SMS with an invitation link.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-body-sm font-medium text-foreground">
                  {isEmail ? 'Email Address' : 'Phone Number'}
                </label>
                <Input
                  type={isEmail ? 'email' : 'tel'}
                  placeholder={isEmail ? 'name@example.com' : '+91 98765 43210'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="text-lg py-6"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="px-5 mt-6 space-y-4">
        {options.map((option, index) => (
          <button
            key={option.id}
            className="w-full card-elevated p-5 flex items-center gap-4 text-left transition-all hover:shadow-lg active:scale-[0.98] animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => setMode(option.id as Mode)}
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
    );
  };

  return (
    <div className="absolute inset-0 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`pt-12 px-5 pb-4 ${mode === 'qr' ? 'absolute top-0 left-0 right-0 z-20' : ''}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${mode === 'qr' ? 'bg-black/20 hover:bg-black/40 text-white' : 'hover:bg-muted text-foreground'}`}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          {mode !== 'qr' && (
            <div>
              <h1 className="text-title text-foreground">Add Family Member</h1>
              <p className="text-body text-text-secondary mt-0.5">Choose how to invite</p>
            </div>
          )}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
