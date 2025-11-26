"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar,
  Clock,
  Star,
  Users,
  DollarSign,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MessageSquare
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

export default function BookTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo: user } = useUser();

  const teacherId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [creditsBalance, setCreditsBalance] = useState<number>(0);

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
      // TODO: Call credits API
      // const balance = await getCreditsBalanceApi();
      // setCreditsBalance(balance);
      setCreditsBalance(100); // Mock
    } catch (error) {
      console.error('Failed to load credits balance');
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) {
      toast({
        title: "Required",
        description: "Please select a time slot",
        variant: "destructive",
      });
      return;
    }

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
        student_notes: studentNotes.trim() || undefined,
      });

      toast({
        title: "Success",
        description: "Booking created successfully!",
      });

      router.push('/bookings');
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.response?.data?.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    // timeString is in HH:mm format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSlotsByDate = (date: string) => {
    return availableSlots.filter(slot => {
      // Handle both Date objects and string dates
      const dateValue = slot.date as any;
      const slotDate = dateValue instanceof Date
        ? dateValue.toISOString().split('T')[0]
        : dateValue.split('T')[0];
      return slotDate === date;
    });
  };

  const getUniqueDates = () => {
    const dates = availableSlots.map(slot => {
      // Handle both Date objects and string dates
      const dateValue = slot.date as any;
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      return dateValue.split('T')[0];
    });
    return [...new Set(dates)].sort();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null;
  }

  const uniqueDates = getUniqueDates();
  const slotsForSelectedDate = selectedDate ? getSlotsByDate(selectedDate) : [];

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <span className="font-semibold">{teacher.average_rating.toFixed(1)}</span>
              <span className="text-sm text-gray-600">({teacher.total_hours_taught} hours taught)</span>
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
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Book a Class</CardTitle>
            <CardDescription>Select an available time slot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Date</Label>
              {uniqueDates.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No available slots at the moment. Please check back later.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {uniqueDates.map((date) => (
                    <Button
                      key={date}
                      variant={selectedDate === date ? "default" : "outline"}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedSlot(null);
                      }}
                      className="h-auto py-3 flex flex-col"
                    >
                      <Calendar className="w-4 h-4 mb-1" />
                      <span className="text-xs">{formatDate(date)}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            {selectedDate && slotsForSelectedDate.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Time</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {slotsForSelectedDate.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                      onClick={() => setSelectedSlot(slot)}
                      className="h-auto py-3 flex flex-col items-center"
                    >
                      <Clock className="w-4 h-4 mb-1" />
                      <span className="text-sm font-medium">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {slot.price_credits} credits
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Student Notes */}
            {selectedSlot && (
              <div>
                <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
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
            )}

            {/* Booking Summary */}
            {selectedSlot && (
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Selected Slot:</span>
                    <span className="font-semibold">
                      {formatDate(selectedSlot.date)} at {formatTime(selectedSlot.start_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-semibold text-green-600">
                      {selectedSlot.price_credits} credits
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Your Balance:</span>
                    <span className={creditsBalance >= selectedSlot.price_credits ? "font-semibold text-green-600" : "font-semibold text-red-600"}>
                      {creditsBalance} credits
                    </span>
                  </div>
                  {creditsBalance < selectedSlot.price_credits && (
                    <Alert className="mt-3" variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Insufficient credits. Please purchase more credits to book this slot.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                onClick={handleBookSlot}
                disabled={!selectedSlot || bookingLoading || creditsBalance < (selectedSlot?.price_credits || 0)}
                className="flex-1"
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/credits/purchase')}
                disabled={creditsBalance >= (selectedSlot?.price_credits || 0)}
              >
                Buy Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

