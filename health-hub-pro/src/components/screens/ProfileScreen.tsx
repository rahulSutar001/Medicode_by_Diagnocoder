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
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';

type SupabaseProfile = Record<string, unknown>;

export function ProfileScreen() {
  const { user, setCurrentScreen, setIsLoggedIn, setUser } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Supabase profile to AppContext on mount
  useEffect(() => {
    const syncProfileToContext = async () => {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      console.log('USER:', authUser);
      if (authError) {
        console.error('getUser error:', authError);
        setLoading(false);
        return;
      }

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.log('No profile found yet (first time user)');
        setLoading(false);
        return;
      }

      console.log('PROFILE DATA:', profileData);
      setProfile(profileData);

      // Sync profile data to AppContext
      const fullName = (profileData.full_name as string) ?? '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') ?? '';

      const syncedUserData = {
        firstName,
        lastName,
        email: authUser.email ?? '',
        dateOfBirth: (profileData.dob as string) ?? '',
        phoneNumber: (profileData.phone_number as string) ?? '',
        gender: (profileData.gender as string) ?? '',
        bloodGroup: (profileData.blood_group as string) ?? '',
        allergies: (profileData.allergies as string) ?? '',
        conditions: (profileData.health_conditions as string) ?? '',
        emergencyContact: {
          name: (profileData.em_contact_name as string) ?? '',
          relationship: (profileData.em_relationship as string) ?? '',
          phone: (profileData.em_phone as string) ?? '',
        },
      };

      console.log('PROFILE SYNCED TO CONTEXT:', syncedUserData);
      setUser(syncedUserData);
      setLoading(false);
    };

    syncProfileToContext();
  }, [setUser]);

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

  const menuItems = [
    { icon: User, label: 'Edit Profile', onClick: () => setCurrentScreen('profile-setup') },
    { icon: FileText, label: 'Health Reports', badge: '18', onClick: () => {} },
    { icon: theme === 'dark' ? Sun : Moon, label: 'App Theme', isTheme: true, onClick: toggleTheme },
    { icon: Shield, label: 'Privacy & Security', hasArrow: true, onClick: () => {} },
    { icon: HelpCircle, label: 'Help & Support', hasArrow: true, onClick: () => {} },
    { icon: Info, label: 'About', hasArrow: true, onClick: () => {} },
    { icon: LogOut, label: 'Log Out', onClick: handleLogout, isDestructive: true },
  ];

  // Use Indian name as specified
  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : 'Kabir Sharma';

  return (
    <div className="absolute inset-0 bg-background-secondary overflow-hidden flex flex-col">
      {/* Header with Profile - No stats */}
      <div className="pt-12 px-5 pb-6 flex flex-col items-center">
        {/* Profile Photo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-primary">
            <span className="text-3xl font-bold text-primary-foreground">
              {user?.firstName?.[0] || 'K'}
            </span>
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card shadow-md flex items-center justify-center border border-border">
            <Pencil className="w-3.5 h-3.5 text-primary" />
          </button>
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
            <button className="w-8 h-8 rounded-full bg-card flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Mobile Number</span>
              <span className="text-body font-medium text-foreground">{user?.phoneNumber || 'Not provided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Blood Type</span>
              <span className="text-body font-medium text-foreground">{user?.bloodGroup || 'O+ Positive'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Allergies</span>
              <span className="text-body font-medium text-foreground">{user?.allergies || 'Penicillin, Peanuts'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Conditions</span>
              <span className="text-body font-medium text-foreground">{user?.conditions || 'Type 2 Diabetes'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body text-text-secondary">Emergency Contact</span>
              <span className="text-body font-medium text-foreground">
                {user?.emergencyContact?.name || 'Priya'} ({user?.emergencyContact?.relationship || 'Wife'})
              </span>
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
              
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-caption text-primary-foreground font-medium">
                  {item.badge}
                </span>
              )}
              
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

        {/* Emergency Button */}
        <button className="w-full mt-6 h-13 px-4 py-3 bg-destructive rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
          <span className="text-body-lg font-semibold text-destructive-foreground">
            Activate Emergency Mode
          </span>
        </button>
        <p className="text-caption text-text-tertiary text-center mt-2">
          This will share your medical ID with emergency contacts
        </p>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-caption text-text-tertiary">MediGuide v1.0.0</p>
          <p className="text-caption text-secondary mt-1">Made with ❤️ for your health</p>
        </div>
      </div>

      <TabBar />
    </div>
  );
}


