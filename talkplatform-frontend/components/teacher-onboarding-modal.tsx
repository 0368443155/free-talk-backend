"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { becomeTeacherApi, updateMyTeacherProfileApi } from '@/api/teachers.rest';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompleted?: () => void;
}

export default function TeacherOnboardingModal({ open, onOpenChange, onCompleted }: Props) {
  const { toast } = useToast();
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      // Ensure they have a teacher profile and role
      await becomeTeacherApi();
      // Update profile fields
      await updateMyTeacherProfileApi({
        headline: headline || undefined,
        bio: bio || undefined,
        introVideoUrl: introVideoUrl || undefined,
        hourlyRate: Number(hourlyRate) || 1,
      });
      toast({ title: 'Teacher profile submitted', description: 'Your profile is pending admin verification.' });
      onOpenChange(false);
      onCompleted?.();
    } catch (e: any) {
      toast({ title: 'Failed to submit', description: e?.response?.data?.message || e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Become a Teacher</DialogTitle>
          <DialogDescription>
            Fill in your information. Your profile will be reviewed by an admin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm">Headline</label>
            <Input placeholder="e.g., IELTS 8.0 Tutor with 5 years experience" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Bio</label>
            <Textarea placeholder="Tell students about your background, teaching style, etc." value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Intro video URL (optional)</label>
            <Input placeholder="https://..." value={introVideoUrl} onChange={(e) => setIntroVideoUrl(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Hourly rate (credits)</label>
            <Input type="number" min={1} step={1} value={hourlyRate} onChange={(e) => setHourlyRate(parseInt(e.target.value || '1', 10))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={onSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit for review'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
