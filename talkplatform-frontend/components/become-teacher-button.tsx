"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';

export default function BecomeTeacherButton() {
  const router = useRouter();

  const onClick = () => {
    router.push('/teacher/verification');
  };

  return (
    <Button onClick={onClick} variant="secondary">
      <GraduationCap className="w-4 h-4 mr-2" />
      Become a Teacher
    </Button>
  );
}
