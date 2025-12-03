"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Plus, Calendar as CalendarIcon } from 'lucide-react';
import {
  getMySlotsApi,
  createBookingSlotApi,
  deleteBookingSlotApi,
  BookingSlot,
  CreateBookingSlotDto,
} from '@/api/booking.rest';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { format } from 'date-fns';

export default function TeacherAvailabilityCalendarPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string; end: string } | null>(null);
  const [priceCredits, setPriceCredits] = useState('10');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const data = await getMySlotsApi();
      setSlots(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load availability slots",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: "Required",
        description: "Please select a date and time slot",
        variant: "destructive",
      });
      return;
    }

    const price = parseInt(priceCredits);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price in credits",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      await createBookingSlotApi({
        date: dateStr,
        start_time: selectedTimeSlot.start,
        end_time: selectedTimeSlot.end,
        price_credits: price,
      });

      toast({
        title: "Success",
        description: "Slot created successfully",
      });

      setCreateDialogOpen(false);
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setPriceCredits('10');
      await loadSlots();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create slot",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSelectSlot = (slot: BookingSlot) => {
    // When clicking on existing slot in calendar, show details or allow delete
    if (slot.is_booked) {
      toast({
        title: "Slot Booked",
        description: "This slot is already booked and cannot be modified",
        variant: "default",
      });
    } else {
      // Allow delete
      handleDeleteSlot(slot);
    }
  };

  const handleDeleteSlot = async (slot: BookingSlot) => {
    if (slot.is_booked) {
      toast({
        title: "Cannot Delete",
        description: "This slot is already booked",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Delete slot on ${slot.date} at ${slot.start_time}?`)) {
      return;
    }

    try {
      await deleteBookingSlotApi(slot.id);
      toast({
        title: "Success",
        description: "Slot deleted successfully",
      });
      await loadSlots();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete slot",
        variant: "destructive",
      });
    }
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

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Availability</h1>
          <p className="text-gray-600 mt-2">Manage your teaching schedule with calendar view</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/teacher/availability')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            List View
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Slot
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Availability Calendar</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Click on a slot to delete it (if not booked). Click on empty time to create new slot.
          </p>
        </CardHeader>
        <CardContent>
          <AvailabilityCalendar
            teacherId="" // Not needed for teacher's own slots
            slots={slots}
            onSelectSlot={handleSelectSlot}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setCreateDialogOpen(true);
            }}
            height={700}
          />
        </CardContent>
      </Card>

      {/* Create Slot Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Availability Slot</DialogTitle>
            <DialogDescription>
              Select a date and time slot for your availability
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedDate && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            )}

            {!selectedDate && (
              <div>
                <Label>Select Date</Label>
                <Input
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                />
              </div>
            )}

            {selectedDate && (
              <>
                <TimeSlotPicker
                  date={selectedDate}
                  selectedSlot={selectedTimeSlot ? `${selectedTimeSlot.start}-${selectedTimeSlot.end}` : undefined}
                  onSelect={(slot) => setSelectedTimeSlot(slot)}
                />

                <div>
                  <Label htmlFor="price">Price (Credits)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    value={priceCredits}
                    onChange={(e) => setPriceCredits(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setSelectedDate(null);
                setSelectedTimeSlot(null);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSlot}
              disabled={creating || !selectedDate || !selectedTimeSlot}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Slot'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

