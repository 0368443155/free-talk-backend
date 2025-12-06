"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock,
  Users,
  Star,
  Video,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  getMyBookingsApi,
  cancelBookingApi,
  Booking,
  BookingStatus,
} from '@/api/booking.rest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function BookingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookingsApi();
      setBookings(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      return;
    }
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      toast({
        title: "Required",
        description: "Please provide a cancellation reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setCancelling(true);
      await cancelBookingApi(selectedBooking.id, {
        cancellation_reason: cancelReason,
      });
      
      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });
      
      setCancelDialogOpen(false);
      setCancelReason('');
      setSelectedBooking(null);
      await loadBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case BookingStatus.PENDING:
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case BookingStatus.CANCELLED:
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case BookingStatus.COMPLETED:
        return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case BookingStatus.NO_SHOW:
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" />No Show</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const now = new Date();
  const upcomingBookings = bookings.filter(b => {
    const scheduledDate = new Date(b.scheduled_at);
    return scheduledDate >= now && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.COMPLETED;
  });

  const pastBookings = bookings.filter(b => {
    const scheduledDate = new Date(b.scheduled_at);
    return scheduledDate < now || b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED;
  });

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-gray-600 mt-2">Manage your class bookings</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'past')}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No upcoming bookings</p>
                <Button className="mt-4" onClick={() => router.push('/teachers')}>
                  Browse Teachers
                </Button>
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {booking.meeting?.title || 'Class Session'}
                        </h3>
                        {getStatusBadge(booking.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.scheduled_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.scheduled_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>Teacher: {booking.teacher?.username || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Star className="w-4 h-4" />
                          <span>{booking.credits_paid} credits</span>
                        </div>
                      </div>

                      {booking.student_notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Your Notes:</span>
                          </div>
                          <p className="text-sm text-gray-700">{booking.student_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {booking.status === BookingStatus.CONFIRMED && (
                        <Button
                          onClick={() => router.push(`/meetings/${booking.meeting_id}`)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Class
                        </Button>
                      )}
                      {booking.status !== BookingStatus.CANCELLED && 
                       booking.status !== BookingStatus.COMPLETED && (
                        <Button
                          variant="outline"
                          onClick={() => handleCancelBooking(booking)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No past bookings</p>
              </CardContent>
            </Card>
          ) : (
            pastBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {booking.meeting?.title || 'Class Session'}
                        </h3>
                        {getStatusBadge(booking.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.scheduled_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.scheduled_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>Teacher: {booking.teacher?.username || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Star className="w-4 h-4" />
                          <span>{booking.credits_paid} credits</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Cancellation *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please explain why you're cancelling..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason('');
                setSelectedBooking(null);
              }}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

