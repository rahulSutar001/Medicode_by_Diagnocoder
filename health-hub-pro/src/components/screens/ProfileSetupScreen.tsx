import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
// console.log("ProfileSetupScreen MOUNTED");


export function ProfileSetupScreen() {
  const { setCurrentScreen, setHasCompletedProfile, setUser, setActiveTab } = useApp();
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    phoneNumber: '',
    gender: '',
    bloodGroup: '',
    allergies: '',
    conditions: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
  });

  const [step, setStep] = useState(1);

  const genderOptions = ['Male', 'Female', 'Prefer not to say'];
  const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const relationshipOptions = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'];

  // On load: check if profile exists in Supabase and prefill form if it does
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        // First-time user, stay on setup screen
        return;
      }

      // Prefill form from existing profile
      console.log('PREFILL PROFILE:', data);
      setFormData({
        fullName: (data.full_name as string) ?? '',
        dateOfBirth: (data.dob as string) ?? '',
        phoneNumber: (data.phone_number as string) ?? '',
        gender: (data.gender as string) ?? '',
        bloodGroup: (data.blood_group as string) ?? '',
        allergies: (data.allergies as string) ?? '',
        conditions: (data.health_conditions as string) ?? '',
        emergencyName: (data.em_contact_name as string) ?? '',
        emergencyRelationship: (data.em_relationship as string) ?? '',
        emergencyPhone: (data.em_phone as string) ?? '',
      });
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      // 1. Get current authenticated user from Supabase
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Error fetching authenticated user:', authError.message);
        return;
      }

      if (!user) {
        console.error('No authenticated user found when saving profile');
        return;
      }

      // 2. Upsert profile row in Supabase using user.id as primary key
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id, // primary key, must match auth user id
        full_name: formData.fullName,
        dob: formData.dateOfBirth,
        phone_number: formData.phoneNumber,
        gender: formData.gender,
        blood_group: formData.bloodGroup,
        allergies: formData.allergies,
        health_conditions: formData.conditions,
        em_contact_name: formData.emergencyName,
        em_relationship: formData.emergencyRelationship,
        em_phone: formData.emergencyPhone,
      });

      if (upsertError) {
        console.error('Error saving profile to Supabase:', upsertError.message);
        return;
      }

      // 3. Keep existing local app state update and navigation
      setUser({
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' '),
        email: user.email ?? 'user@example.com',
        dateOfBirth: formData.dateOfBirth,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        conditions: formData.conditions,
        emergencyContact: {
          name: formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
        },
      });
      setHasCompletedProfile(true);
      setActiveTab('home');
      setCurrentScreen('home');
    } catch (error) {
      console.error('Unexpected error while saving profile:', error);
    }
  };

  const SelectField = ({ 
    value, 
    placeholder, 
    options, 
    onChange 
  }: { 
    value: string; 
    placeholder: string; 
    options: string[]; 
    onChange: (val: string) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full h-14 px-4 rounded-input border border-input bg-card text-left"
        >
          <span className={value ? 'text-foreground' : 'text-text-tertiary'}>
            {value || placeholder}
          </span>
          <ChevronDown className="w-5 h-5 text-text-secondary" />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg shadow-lg border border-border z-50 max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-body-lg text-foreground hover:bg-muted transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5">
        <h1 className="text-title text-foreground">Complete Your Health Profile</h1>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable Form */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-32 custom-scrollbar">
        <div className="space-y-5">
          {/* Medical ID Section */}
          <h3 className="text-section text-foreground font-semibold text-center mb-4">Medical ID</h3>
          
          <Input
            placeholder="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />

          <div className="relative">
            <Input
              type="date"
              placeholder="Date of Birth"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
          </div>

          <div className="flex gap-2">
            <div className="w-20 h-14 rounded-input border border-input bg-card flex items-center justify-center text-text-secondary">
              +91
            </div>
            <Input
              type="tel"
              placeholder="Mobile Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="flex-1"
            />
          </div>

          <SelectField
            value={formData.gender}
            placeholder="Select Gender"
            options={genderOptions}
            onChange={(val) => {
              setFormData({ ...formData, gender: val });
              setStep(Math.max(step, 2));
            }}
          />

          <SelectField
            value={formData.bloodGroup}
            placeholder="Select Blood Group"
            options={bloodGroupOptions}
            onChange={(val) => {
              setFormData({ ...formData, bloodGroup: val });
              setStep(Math.max(step, 3));
            }}
          />

          {/* Medical Info */}
          <div>
            <label className="text-body-sm text-text-secondary mb-2 block">Allergies</label>
            <textarea
              placeholder="List any allergies (e.g., Penicillin, Peanuts)"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              className="w-full h-20 px-4 py-3 rounded-input border border-input bg-card text-body-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="text-body-sm text-text-secondary mb-2 block">Health Conditions</label>
            <textarea
              placeholder="Existing conditions (e.g., Diabetes, Hypertension)"
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              className="w-full h-20 px-4 py-3 rounded-input border border-input bg-card text-body-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          {/* Emergency Contact */}
          <div className="pt-4">
            <h3 className="text-section text-foreground mb-4">Emergency Contact</h3>
            
            <div className="space-y-4">
              <Input
                placeholder="Contact Name"
                value={formData.emergencyName}
                onChange={(e) => {
                  setFormData({ ...formData, emergencyName: e.target.value });
                  setStep(Math.max(step, 4));
                }}
              />

              <SelectField
                value={formData.emergencyRelationship}
                placeholder="Relationship"
                options={relationshipOptions}
                onChange={(val) => setFormData({ ...formData, emergencyRelationship: val })}
              />

              <div className="flex gap-2">
                <div className="w-20 h-14 rounded-input border border-input bg-card flex items-center justify-center text-text-secondary">
                  +91
                </div>
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button 
          size="lg" 
          className="w-full"
          onClick={handleSave}
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
}
