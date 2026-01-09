import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TabBar } from '@/components/TabBar';
import { Plus, Clock, Check, User, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getFamilyMembers, acceptFamilyConnection, FamilyMember } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function FamilyScreen() {
  const { setCurrentScreen, setShowNicknameModal, setSelectedFamilyMember, setViewingMember, setActiveTab } = useApp();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag to scroll state
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  // Add a ref to track if a drag occurred to prevent clicks
  const isDraggingRef = React.useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    isDraggingRef.current = false; // Reset drag flag
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    // We do NOT reset isDraggingRef here immediately if we want to check it in onClick
    // But onClick usually fires right after MouseUp.
    setTimeout(() => { isDraggingRef.current = false; }, 0);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fast

    // Check if moved significantly
    if (Math.abs(x - startX) > 5) {
      isDraggingRef.current = true;
    }

    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Accept Modal State
  const [acceptingMember, setAcceptingMember] = useState<FamilyMember | null>(null);
  const [aliasInput, setAliasInput] = useState('');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await getFamilyMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const initiateAccept = (member: FamilyMember) => {
    setAcceptingMember(member);
    // Default alias to their name
    setAliasInput(member.display_name || member.profile_name || '');
  };

  const confirmAccept = async () => {
    if (!acceptingMember) return;
    try {
      await acceptFamilyConnection(acceptingMember.connection_id, aliasInput);
      toast.success('Connection accepted');
      setAcceptingMember(null);
      fetchMembers();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to accept connection');
    }
  };

  const handleEditNickname = (memberId: string, memberName: string) => {
    setSelectedFamilyMember({ id: memberId, name: memberName });
    setShowNicknameModal(true);
  };

  // Group members
  const connectedMembers = members.filter(m => m.connection_status === 'connected');
  const pendingSent = members.filter(m => m.connection_status === 'pending-sent');
  const pendingReceived = members.filter(m => m.connection_status === 'pending-received');

  return (
    <div className="absolute inset-0 bg-background-secondary overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-4">
        <h1 className="text-title text-foreground">My Health Circle</h1>
        <p className="text-body text-text-secondary mt-1">Care for your loved ones</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-36 custom-scrollbar">

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Family Members Circles */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto py-4 -mx-5 px-5 scrollbar-hide cursor-grab active:cursor-grabbing"
              onMouseDown={onMouseDown}
              onMouseLeave={onMouseLeave}
              onMouseUp={onMouseUp}
              onMouseMove={onMouseMove}
            >
              {connectedMembers.map((member, index) => (
                <button
                  key={member.connection_id}
                  onClick={(e) => {
                    if (isDraggingRef.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    setViewingMember(member);
                    setCurrentScreen('history');
                    setActiveTab('history');
                  }}
                  className="flex flex-col items-center shrink-0 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={cn(
                    "w-20 h-20 rounded-full ring-4 flex items-center justify-center bg-card shadow-md ring-primary/30"
                  )}>
                    <span className="text-title text-foreground font-bold">
                      {member.display_name ? member.display_name[0] : (member.profile_name ? member.profile_name[0] : 'U')}
                    </span>
                  </div>
                  <span className="text-body text-foreground font-medium mt-2">
                    {member.display_name || member.profile_name || 'Member'}
                  </span>
                </button>
              ))}

              {/* Add Button */}
              <button
                onClick={() => setCurrentScreen('add-family')}
                className="flex flex-col items-center shrink-0 animate-fade-in delay-300"
              >
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
                  <Plus className="w-8 h-8 text-text-tertiary" />
                </div>
                <span className="text-body text-text-secondary mt-2">Add</span>
              </button>
            </div>

            {/* Connection Status Section */}
            <div className="mt-6">
              <h2 className="text-section text-foreground mb-4">Connection Status</h2>

              {pendingSent.length === 0 && pendingReceived.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-body-lg text-text-tertiary">No pending connections</p>
                </div>
              )}

              <div className="space-y-3">
                {/* Received Requests */}
                {pendingReceived.map((req, index) => (
                  <div key={req.connection_id} className="card-elevated p-4 flex items-center gap-3 animate-fade-in">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-body-lg text-foreground">
                        <span className="font-semibold">{req.display_name || req.profile_name || 'Someone'}</span> wants to connect
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 px-3" onClick={() => initiateAccept(req)}>Accept</Button>
                      {/* Decline not implemented */}
                    </div>
                  </div>
                ))}

                {/* Sent Requests */}
                {pendingSent.map((req, index) => (
                  <div key={req.connection_id} className="card-elevated p-4 flex items-center gap-3 animate-fade-in opacity-80">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-body-lg text-foreground">
                        Invitation sent {req.display_name ? `to ${req.display_name}` : (req.profile_name ? `to ${req.profile_name}` : '')}
                      </p>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Add Button */}
      <div className="absolute bottom-24 left-5 right-5">
        <Button
          size="lg"
          className="w-full"
          onClick={() => setCurrentScreen('add-family')}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </Button>
      </div>

      <TabBar />

      {/* Accept Dialog */}
      <Dialog open={!!acceptingMember} onOpenChange={(open) => !open && setAcceptingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Connection</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-body text-text-secondary mb-3">
              How would you like to verify this person? Set a display name (alias) for them.
            </p>
            <Input
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="Enter display name (e.g. Dad)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptingMember(null)}>Cancel</Button>
            <Button onClick={confirmAccept}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
