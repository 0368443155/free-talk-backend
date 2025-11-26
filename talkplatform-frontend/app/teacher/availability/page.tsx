"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  createBookingSlotApi,
  getMySlotsApi,
  deleteBookingSlotApi,
  BookingSlot,
} from '@/api/booking.rest';

export default function TeacherAvailabilityPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<BookingSlot | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    price_credits: '10',
  });

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
    if (!formData.date || !formData.start_time || !formData.end_time) {
      toast({
        title: "Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate time
    if (formData.start_time >= formData.end_time) {
      toast({
        title: "Invalid Time",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      await createBookingSlotApi({
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        price_credits: parseInt(formData.price_credits),
      });

      toast({
        title: "Success",
        description: "Availability slot created successfully",
      });

      setCreateDialogOpen(false);
      setFormData({
        date: '',
        start_time: '',
        end_time: '',
        price_credits: '10',
      });
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

  const handleDeleteSlot = async () => {
    if (!slotToDelete) return;

    if (slotToDelete.is_booked) {
      toast({
        title: "Cannot Delete",
        description: "This slot is already booked and cannot be deleted",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setSlotToDelete(null);
      return;
    }

    try {
      setDeleting(true);
      await deleteBookingSlotApi(slotToDelete.id);

      toast({
        title: "Success",
        description: "Slot deleted successfully",
      });

      setDeleteDialogOpen(false);
      setSlotToDelete(null);
      await loadSlots();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete slot",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    // Handle both Date objects and string dates
    const dateValue = slot.date as any;
    const dateKey = dateValue instanceof Date
      ? dateValue.toISOString().split('T')[0]
      : typeof dateValue === 'string'
        ? dateValue.split('T')[0]
        : String(dateValue);

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, BookingSlot[]>);

  const sortedDates = Object.keys(slotsByDate).sort();

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Availability</h1>
          <p className="text-gray-600 mt-2">Manage your teaching schedule</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Slot
        </Button>
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No availability slots created yet</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Slot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {formatDate(date)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slotsByDate[date].map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {slot.price_credits} credits
                          </span>
                        </TableCell>
                        <TableCell>
                          {slot.is_booked ? (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Booked
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <XCircle className="w-3 h-3 mr-1" />
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!slot.is_booked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSlotToDelete(slot);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Slot Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
            <DialogDescription>
              Create a new time slot for students to book
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="price_credits">Price (Credits) *</Label>
              <Input
                id="price_credits"
                type="number"
                min="1"
                value={formData.price_credits}
                onChange={(e) => setFormData({ ...formData, price_credits: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setFormData({
                  date: '',
                  start_time: '',
                  end_time: '',
                  price_credits: '10',
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSlot} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Slot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Slot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this availability slot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {slotToDelete && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {formatDate(slotToDelete.date)} from {formatTime(slotToDelete.start_time)} to {formatTime(slotToDelete.end_time)}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSlotToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSlot} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

