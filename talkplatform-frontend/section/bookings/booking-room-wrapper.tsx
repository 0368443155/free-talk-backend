"use client";

import { useEffect, useState } from "react";
import { BookingRoom } from "./booking-room";
import { getBookingByIdApi, Booking } from "@/api/booking.rest";
import { IUserInfo } from "@/api/user.rest";
import { Loader2 } from "lucide-react";

interface BookingRoomWrapperProps {
  bookingId: string;
  user: IUserInfo;
}

export function BookingRoomWrapper({ bookingId, user }: BookingRoomWrapperProps) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await getBookingByIdApi(bookingId);
        setBooking(data);
      } catch (err: any) {
        console.error('Failed to load booking:', err);
        setError(err.response?.data?.message || "Failed to load booking");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-red-500">
        {error || "Booking not found"}
      </div>
    );
  }

  // Verify user is participant
  if (booking.student_id !== user.id && booking.teacher_id !== user.id) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-red-500">
        You are not a participant in this booking
      </div>
    );
  }

  return <BookingRoom booking={booking} user={user} />;
}

