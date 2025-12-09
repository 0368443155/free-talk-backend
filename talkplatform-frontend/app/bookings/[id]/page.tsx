"use client";

import { useParams } from "next/navigation";
import { useUser } from "@/store/user-store";
import { BookingRoomWrapper } from "@/section/bookings/booking-room-wrapper";
import { Loader2 } from "lucide-react";

export default function BookingRoomPage() {
  const { userInfo: user, isLoading } = useUser();
  const params = useParams();
  const bookingId = params.id as string;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        Please login to access this booking
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-red-500">
        Invalid booking ID
      </div>
    );
  }

  return <BookingRoomWrapper bookingId={bookingId} user={user} />;
}


