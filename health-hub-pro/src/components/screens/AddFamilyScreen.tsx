import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, QrCode, Mail, Smartphone, ScanLine, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { inviteFamilyMember } from '@/lib/api';
import QRCode from "react-qr-code";
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';

type Mode = 'select' | 'qr' | 'email' | 'phone';

export function AddFamilyScreen() {
  const { user, setCurrentScreen, setActiveTab } = useApp();
  const [mode, setMode] = useState<Mode>('select');
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);

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

  // No simulated timeout needed for real scanner
  useEffect(() => {
    if (mode === 'qr') {
      setIsScanning(true);
    } else {
      setIsScanning(false);
    }
  }, [mode]);

  const submitInvite = async (data: { email?: string, phone_number?: string, target_user_id?: string }) => {
    try {
      await inviteFamilyMember(data);
      toast.success('Invitation sent successfully!');
      setTimeout(() => {
        handleBack();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) {
      toast.error('Please enter a valid value');
      return;
    }

    await submitInvite({
      email: mode === 'email' ? inputValue : undefined,
      phone_number: mode === 'phone' ? inputValue : undefined
    });
  };

  const handleScan = (text: string) => {
    if (text) {
      setIsScanning(false);
      setScannedUserId(text);
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmInvite = async () => {
    if (!scannedUserId) return;

    setShowConfirmDialog(false);
    await submitInvite({ target_user_id: scannedUserId });
    setScannedUserId(null);
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
      description: 'Send request to the linked mail ID',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
  ];

  const renderContent = () => {
    if (mode === 'qr') {
      return (
        <div className="flex-1 bg-black relative flex flex-col items-center justify-center overflow-hidden">
          {isScanning && (
            <div className="w-full h-full absolute inset-0">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    handleScan(result[0].rawValue);
                  }
                }}
                allowMultiple={true}
                scanDelay={2000}
                components={{
                  onOff: false,
                  torch: false,
                  zoom: false,
                  finder: false
                }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' }
                }}
              />
            </div>
          )}

          {/* Custom Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Dark overlay with cutout */}
            <div className="absolute inset-0 bg-black/50">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-2 border-primary rounded-3xl bg-transparent box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Scan line animation */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary/50 animate-scan"></div>
              </div>
            </div>

            <div className="absolute bottom-20 left-0 right-0 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 animate-pulse">
                <ScanLine className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-white text-subtitle font-bold">Scanning...</h2>
              <p className="text-white/70 text-body mt-2">Point camera at family member's QR code</p>
            </div>
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
      <div className="flex-1 flex flex-col">
        <div className="px-5 mt-6 space-y-4 flex-1">
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

        {/* Personalized QR Code Section */}
        <div className="p-6 bg-card border-t border-border mt-auto animate-slide-up">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
              {/* Temporary fallback: Use placeholder if ID is missing from context User type, assuming it might be added or fetched */}
              {/* In a real scenario, we should ensure 'User' type has 'id' */}
              <QRCode
                value={'user-id-placeholder'} // Placeholder until we fix User type to include ID
                size={140}
                level="H"
              />
            </div>
            <h3 className="text-body font-semibold text-foreground">Your Family QR Code</h3>
            <p className="text-caption text-text-secondary mt-1">
              Let others scan this code to send you a family request
            </p>
          </div>
        </div>
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Family Request?</DialogTitle>
            <DialogDescription>
              Do you want to send a family request to this user?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmInvite}>
              Yes, Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
