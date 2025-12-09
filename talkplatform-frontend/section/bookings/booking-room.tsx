"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Booking } from "@/api/booking.rest";
import { IUserInfo } from "@/api/user.rest";
import { useBookingSocket } from "@/hooks/use-booking-socket";
import { useWebRTCV2 } from "@/hooks/use-webrtc-v2";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";
import { toast } from "sonner";

interface BookingRoomProps {
  booking: Booking;
  user: IUserInfo;
}

export function BookingRoom({ booking, user }: BookingRoomProps) {
  const [isOnline, setIsOnline] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Determine other participant
  const otherParticipant = useMemo(() => {
    return booking.teacher_id === user.id ? booking.student : booking.teacher;
  }, [booking, user.id]);

  // Socket connection
  const { socket, isConnected } = useBookingSocket({
    bookingId: booking.id,
    userId: user.id,
    isOnline,
  });

  // WebRTC P2P
  const {
    localStream,
    peers,
    connectionStates,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
  } = useWebRTCV2({
    socket,
    meetingId: booking.id, // Use bookingId as meetingId
    userId: user.id,
    isOnline,
  });

  // Update local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Get remote stream
  const remoteStream = useMemo(() => {
    if (!otherParticipant) return null;
    const peer = peers.get(otherParticipant.id);
    return peer?.stream || null;
  }, [peers, otherParticipant]);

  // Update remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const connectionState = otherParticipant 
    ? connectionStates.get(otherParticipant.id) 
    : undefined;

  const handleLeave = useCallback(() => {
    toast.info("Leaving booking room...");
    window.location.href = '/bookings';
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              1-on-1 Session with {otherParticipant?.username || 'Participant'}
            </h1>
            <p className="text-sm text-gray-400">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              {connectionState && ` • ${connectionState}`}
            </p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-2 gap-4">
        {/* Local Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute bottom-4 left-4 text-white bg-black/50 px-3 py-1 rounded text-sm">
            You {isMuted && '🔇'} {isVideoOff && '📹'}
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {connectionState === 'connected' 
                ? 'Waiting for video...' 
                : connectionState === 'connecting'
                ? 'Connecting...'
                : 'Waiting for participant...'}
            </div>
          )}
          <div className="absolute bottom-4 left-4 text-white bg-black/50 px-3 py-1 rounded text-sm">
            {otherParticipant?.username || 'Participant'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "default"}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>
          <Button
            onClick={toggleVideo}
            variant={isVideoOff ? "destructive" : "default"}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </Button>
          <Button
            onClick={handleLeave}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

