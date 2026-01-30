import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { TabBar } from '@/components/TabBar';
import { supabase } from '@/lib/supabase';
import {
  User,
  FileText,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  Pencil,
  AlertTriangle,
  LogOut
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';

type SupabaseProfile = Record<string, unknown>;

export function ProfileScreen() {
  const { user, setCurrentScreen, setIsLoggedIn, setUser } = useApp();
  const { theme, toggleTheme } = useTheme();

  // Local loading state only for image upload feedback if needed, 
  // but for main profile data we rely on user context

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Size check (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large. Max 5MB.");
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      // 4. Update Global State
      if (user) {
        setUser({ ...user, profileImage: publicUrl });
      }
      toast.success("Profile picture updated!");

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    }
  };

  // No longer need to sync profile here as it's handled in AppContext

  /**
   * Handles user logout
   * Signs out from Supabase and resets app state
   */
  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error('Logout failed', {
          description: error.message || 'Please try again',
        });
        return;
      }

      setIsLoggedIn(false);
      setUser(null);
      setCurrentScreen('onboarding');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
    }
  };

  /* Content for Info Sections */
  const infoContent = {
    about: {
      title: "About MediGuide",
      body: (
        <div className="space-y-4">
          <p className="text-body text-text-secondary">
            MediGuide is a digital health assistant designed to help users understand, organize, and track their medical reports with clarity and confidence.
          </p>
          <p className="text-body text-text-secondary">
            By combining smart report analysis with simple explanations, MediGuide makes health information easier to access, interpret, and share—empowering users to make informed decisions about their wellbeing.
          </p>
        </div>
      )
    },
    privacy: {
      title: "Privacy & Security",
      body: (
        <div className="space-y-4">
          <p className="text-body text-text-secondary">
            Your health data is private and protected. MediGuide follows strict security practices to ensure your medical information remains safe and confidential.
          </p>
          <p className="text-body text-text-secondary">
            Reports and personal details are securely stored and shared only with your consent. We do not sell or misuse user data, and all access is governed by industry-standard privacy controls.
          </p>
        </div>
      )
    },
    help: {
      title: "Help & Support",
      body: (
        <div className="space-y-4">
          <p className="text-body text-text-secondary">
            Need assistance or have questions? We’re here to help.
          </p>
          <p className="text-body text-text-secondary">
            Reach out for support with app usage, report understanding, or technical issues, and get timely guidance whenever you need it.
          </p>
        </div>
      )
    }
  };

  const [activeDialog, setActiveDialog] = useState<'about' | 'privacy' | 'help' | null>(null);

  const menuItems = [
    { icon: User, label: 'Edit Profile', onClick: () => setCurrentScreen('profile-setup') },
    // Health Reports removed
    { icon: theme === 'dark' ? Sun : Moon, label: 'App Theme', isTheme: true, onClick: toggleTheme },
    { icon: Shield, label: 'Privacy & Security', hasArrow: true, onClick: () => setActiveDialog('privacy') },
    { icon: HelpCircle, label: 'Help & Support', hasArrow: true, onClick: () => setActiveDialog('help') },
    { icon: Info, label: 'About', hasArrow: true, onClick: () => setActiveDialog('about') },
    { icon: LogOut, label: 'Log Out', onClick: handleLogout, isDestructive: true },
  ];

  // Fallback to empty if no user name
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : '';

  return (
    <div className="absolute inset-0 bg-background-secondary overflow-hidden flex flex-col">
      {/* Header with Profile - No stats */}
      <div className="pt-12 px-5 pb-6 flex flex-col items-center">
        {/* Profile Photo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-primary overflow-hidden">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-primary-foreground">
                {user?.firstName?.[0] || 'U'}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card shadow-md flex items-center justify-center border border-border cursor-pointer hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-primary" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>

        {/* Name */}
        <h1 className="text-subtitle text-foreground mt-4 font-bold">
          {displayName}
        </h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-36 custom-scrollbar">
        {/* Medical ID Card */}
        <div className="card-medical p-5 mb-6 relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-section text-foreground">Medical ID</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Mobile Number</span>
              <span className="text-body font-medium text-foreground">{user?.phoneNumber || 'NA'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Blood Type</span>
              <span className="text-body font-medium text-foreground">{user?.bloodGroup || 'NA'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Allergies</span>
              <span className="text-body font-medium text-foreground">{user?.allergies || 'NA'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Conditions</span>
              <span className="text-body font-medium text-foreground">{user?.conditions || 'NA'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Emergency Contact</span>
              <div className="text-right">
                <span className="text-body font-medium text-foreground block">
                  {user?.emergencyContact?.name || 'NA'} {user?.emergencyContact?.relationship ? `(${user.emergencyContact.relationship})` : ''}
                </span>
                {user?.emergencyContact?.phone && (
                  <span className="text-body font-medium text-foreground block mt-1">
                    {user.emergencyContact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings List - No notifications */}
        <div className="card-elevated overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                "w-full h-14 px-4 flex items-center gap-3 text-left hover:bg-muted transition-colors",
                index !== menuItems.length - 1 && "border-b border-border",
                item.isDestructive && "text-destructive hover:bg-destructive-light"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                item.isDestructive ? "text-destructive" : "text-primary"
              )} />
              <span className={cn(
                "flex-1 text-body-lg",
                item.isDestructive ? "text-destructive" : "text-foreground"
              )}>{item.label}</span>



              {item.isTheme && (
                <div className="flex items-center gap-2">
                  <span className="text-body-sm text-text-secondary capitalize">{theme}</span>
                  <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                </div>
              )}

              {item.hasArrow && (
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              )}
            </button>
          ))}
        </div>

        {/* Emergency Button
        <button className="w-full mt-6 h-13 px-4 py-3 bg-destructive rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
          <span className="text-body-lg font-semibold text-destructive-foreground">
            Activate Emergency Mode
          </span>
        </button>
        <p className="text-caption text-text-tertiary text-center mt-2">
          This will share your medical ID with emergency contacts
        </p> */}

        {/* Footer */}

        <div className="text-center mt-8">
          <p className="text-caption text-text-tertiary">MediGuide v1.0.0</p>
          <p className="text-caption text-secondary mt-1">Made with ❤️ for your health</p>
        </div>
      </div>

      <TabBar />

      {/* Info Dialog */}
      <Dialog open={!!activeDialog} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeDialog && infoContent[activeDialog].title}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {activeDialog && infoContent[activeDialog].body}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


