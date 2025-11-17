"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/store/user-store';
import { GraduationCap } from 'lucide-react';
import TeacherOnboardingModal from './teacher-onboarding-modal';

export default function BecomeTeacherButton() {
  const [loading, setLoading] = useState(false);
  const { userInfo, setUserInfo } = useUser();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const onClick = () => setOpen(true);

  return (
    <>
      <Button onClick={onClick} disabled={loading} variant="secondary">
        <GraduationCap className="w-4 h-4 mr-2" />
        Become a Teacher
      </Button>
      <TeacherOnboardingModal
        open={open}
        onOpenChange={(v) => setOpen(v)}
        onCompleted={() => {
          // Do not change role locally; dashboard will fetch profile and show pending
        }}
      />
    </>
  );
}
