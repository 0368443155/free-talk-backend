"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar as CalendarIcon,
  Clock,
  Star,
  DollarSign,
  Loader2,
  ArrowLeft,
  AlertCircle,
  List,
  Grid3x3,
} from 'lucide-react';
import {
  getTeacherProfileByIdApi,
} from '@/api/teachers.rest';
import {
  getAvailableSlotsApi,
  createBookingApi,
  BookingSlot,
} from '@/api/booking.rest';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/store/user-store';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function BookTeacherCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo: user } = useUser();

  const teacherId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  useEffect(() => {
    if (teacherId) {
      loadTeacherProfile();
      loadAvailableSlots();
      loadCreditsBalance();
    }
  }, [teacherId]);

  const loadTeacherProfile = async () => {
    try {
      const profile = await getTeacherProfileByIdApi(teacherId);
      setTeacher(profile);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load teacher profile",
        variant: "destructive",
      });
      router.push('/teachers');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const slots = await getAvailableSlotsApi({
        teacher_id: teacherId,
      });
      setAvailableSlots(slots.filter(slot => !slot.is_booked));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load available slots",
        variant: "destructive",
      });
    }
  };

  const loadCreditsBalance = async () => {
    try {
      // TODO: Get credits balance from API
      setCreditsBalance(user?.credit_balance || 0);
    } catch (error) {
      console.error('Failed to load credits balance:', error);
    }
  };

  const handleSelectSlot = (slot: BookingSlot) => {
    setSelectedSlot(slot);
    setBookingDialogOpen(true);
  };

  const handleCreateBooking = async () => {
    if (!selectedSlot) return;

    if (creditsBalance < selectedSlot.price_credits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${selectedSlot.price_credits} credits but only have ${creditsBalance}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setBookingLoading(true);
      await createBookingApi({
        slot_id: selectedSlot.id,
        student_notes: studentNotes,
      });

      toast({
        title: "Success",
        description: "Booking created successfully!",
      });

      setBookingDialogOpen(false);
      setSelectedSlot(null);
      setStudentNotes('');
      await loadAvailableSlots();
      router.push('/bookings');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Teacher Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={teacher.user?.avatar_url} />
                <AvatarFallback>{teacher.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{teacher.user?.username}</CardTitle>
                <CardDescription>{teacher.user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {teacher.headline && (
              <p className="text-sm text-gray-600">{teacher.headline}</p>
            )}

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">
                {teacher.average_rating ? Number(teacher.average_rating).toFixed(1) : '0.0'}
              </span>
              <span className="text-sm text-gray-600">
                ({teacher.total_hours_taught} hours taught)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="font-semibold">{teacher.hourly_rate} credits/hour</span>
            </div>

            {teacher.bio && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">About</Label>
                <p className="text-sm text-gray-600">{teacher.bio}</p>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your credits balance: <strong>{creditsBalance} credits</strong>
              </AlertDescription>
            </Alert>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/teachers/${teacherId}/book`)}
              >
                <List className="w-4 h-4 mr-2" />
                List View
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Select Available Time Slot</CardTitle>
            <CardDescription>
              Click on a time slot to book a class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityCalendar
              teacherId={teacherId}
              slots={availableSlots}
              onSelectSlot={handleSelectSlot}
              height={600}
            />
          </CardContent>
        </Card>
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Review your booking details before confirming
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-semibold">
                      {new Date(selectedSlot.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4" />
                      {selectedSlot.start_time} - {selectedSlot.end_time}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {selectedSlot.price_credits} credits
                </Badge>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-semibold mb-2 block">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="Any special requests or topics you'd like to focus on..."
                  rows={4}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {creditsBalance >= selectedSlot.price_credits ? (
                    <>You have enough credits. {selectedSlot.price_credits} credits will be deducted.</>
                  ) : (
                    <>You need {selectedSlot.price_credits - creditsBalance} more credits to book this slot.</>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBookingDialogOpen(false)}
              disabled={bookingLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBooking}
              disabled={bookingLoading || !selectedSlot || creditsBalance < selectedSlot.price_credits}
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

