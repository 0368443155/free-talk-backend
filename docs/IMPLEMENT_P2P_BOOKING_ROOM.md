# 🚀 IMPLEMENT P2P FOR BOOKINGS - UPDATED BASED ON EXISTING CODE

> **Status:** Backend API exists ✅ | Frontend UI missing ❌ | WebRTC missing ❌  
> **Objective:** Add P2P video call to existing booking system  
> **Estimated Time:** 3-4 hours (reduced from 6)

---

## ✅ WHAT ALREADY EXISTS

### Backend (Complete):
- ✅ `booking.entity.ts` - Database schema
- ✅ `booking.service.ts` - Business logic
- ✅ `booking.controller.ts` - REST API
- ✅ `booking-slot.entity.ts` - Slot management
- ✅ Booking status: pending, confirmed, cancelled, completed, no_show

### Frontend API (Complete):
- ✅ `api/booking.rest.ts` - API client
- ✅ `createBookingApi()` - Create booking
- ✅ `getMyBookingsApi()` - Get user bookings
- ✅ `getBookingByIdApi()` - Get booking details
- ✅ `cancelBookingApi()` - Cancel booking

### Frontend UI (Partial):
- ✅ `/app/bookings/page.tsx` - Booking list page
- ❌ `/app/bookings/[id]/page.tsx` - **MISSING** (need to create)
- ❌ Booking room components - **MISSING**

### WebRTC Infrastructure:
- ✅ `use-webrtc-v2.ts` - P2P hook ready
- ✅ P2P managers in `services/p2p/core/`
- ❌ Booking gateway - **MISSING** (need to create)

---

## 🎯 WHAT NEEDS TO BE BUILT

### Phase 1: Backend WebRTC Gateway (1 hour)

#### Create Booking Gateway

**File:** `talkplatform-backend/src/features/booking/booking.gateway.ts` (NEW)

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';

interface SocketWithUser extends Socket {
  userId?: string;
  bookingId?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
@Injectable()
export class BookingGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BookingGateway.name);
  private userSocketMap = new Map<string, string>();

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  // Join booking room
  @SubscribeMessage('booking:join')
  async handleJoin(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { bookingId: string; userId: string },
  ) {
    client.bookingId = data.bookingId;
    client.userId = data.userId;
    
    await client.join(data.bookingId);
    this.userSocketMap.set(data.userId, client.id);

    // Notify other participant
    client.to(data.bookingId).emit('booking:user-joined', {
      userId: data.userId,
    });

    this.logger.log(`User ${data.userId} joined booking ${data.bookingId}`);
  }

  // Leave booking room
  @SubscribeMessage('booking:leave')
  handleLeave(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { bookingId: string; userId: string },
  ) {
    client.to(data.bookingId).emit('booking:user-left', {
      userId: data.userId,
    });

    this.userSocketMap.delete(data.userId);
    this.logger.log(`User ${data.userId} left booking ${data.bookingId}`);
  }

  // WebRTC Signaling
  @SubscribeMessage('webrtc:ready')
  handleReady(@ConnectedSocket() client: SocketWithUser) {
    if (!client.bookingId || !client.userId) return;

    client.to(client.bookingId).emit('webrtc:peer-ready', {
      userId: client.userId,
    });
  }

  @SubscribeMessage('webrtc:offer')
  handleOffer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; offer: RTCSessionDescriptionInit },
  ) {
    const targetSocketId = this.userSocketMap.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc:offer', {
        fromUserId: client.userId,
        offer: data.offer,
      });
    }
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; answer: RTCSessionDescriptionInit },
  ) {
    const targetSocketId = this.userSocketMap.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc:answer', {
        fromUserId: client.userId,
        answer: data.answer,
      });
    }
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; candidate: RTCIceCandidateInit },
  ) {
    const targetSocketId = this.userSocketMap.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('webrtc:ice-candidate', {
        fromUserId: client.userId,
        candidate: data.candidate,
      });
    }
  }

  // Media controls
  @SubscribeMessage('media:toggle-mic')
  handleToggleMic(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isMuted: boolean },
  ) {
    if (!client.bookingId) return;
    
    client.to(client.bookingId).emit('media:user-muted', {
      userId: client.userId,
      isMuted: data.isMuted,
    });
  }

  @SubscribeMessage('media:toggle-video')
  handleToggleVideo(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isVideoOff: boolean },
  ) {
    if (!client.bookingId) return;
    
    client.to(client.bookingId).emit('media:user-video-off', {
      userId: client.userId,
      isVideoOff: data.isVideoOff,
    });
  }
}
```

#### Register Gateway in Module

**File:** `talkplatform-backend/src/features/booking/booking.module.ts`

**Add:**
```typescript
import { BookingGateway } from './booking.gateway';

@Module({
  // ... existing imports
  providers: [
    BookingService,
    BookingGateway, // ← Add this
  ],
})
```

---

### Phase 2: Frontend Booking Room (2 hours)

#### 2.1 Create Booking Room Page

**File:** `talkplatform-frontend/app/bookings/[id]/page.tsx` (NEW)

```typescript
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

  return <BookingRoomWrapper bookingId={bookingId} user={user} />;
}
```

#### 2.2 Create Booking Room Wrapper

**File:** `talkplatform-frontend/section/bookings/booking-room-wrapper.tsx` (NEW)

```typescript
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
```

#### 2.3 Create Main Booking Room Component

**File:** `talkplatform-frontend/section/bookings/booking-room.tsx` (NEW)

```typescript
"use client";

import { useState, useCallback, useMemo } from "react";
import { Booking } from "@/api/booking.rest";
import { IUserInfo } from "@/api/user.rest";
import { useBookingSocket } from "@/hooks/use-booking-socket";
import { useWebRTCV2 } from "@/hooks/use-webrtc-v2";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";

interface BookingRoomProps {
  booking: Booking;
  user: IUserInfo;
}

export function BookingRoom({ booking, user }: BookingRoomProps) {
  const [isOnline, setIsOnline] = useState(true);

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

  const handleLeave = useCallback(() => {
    window.location.href = '/bookings';
  }, []);

  // Get remote stream
  const remoteStream = useMemo(() => {
    if (!otherParticipant) return null;
    const peer = peers.get(otherParticipant.id);
    return peer?.stream || null;
  }, [peers, otherParticipant]);

  const connectionState = otherParticipant 
    ? connectionStates.get(otherParticipant.id) 
    : undefined;

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              1-on-1 Session with {otherParticipant?.username}
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
            ref={(el) => {
              if (el && localStream) el.srcObject = localStream;
            }}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute bottom-4 left-4 text-white bg-black/50 px-3 py-1 rounded">
            You {isMuted && '🔇'} {isVideoOff && '📹'}
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          {remoteStream ? (
            <video
              ref={(el) => {
                if (el && remoteStream) el.srcObject = remoteStream;
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {connectionState === 'connected' 
                ? 'Waiting for video...' 
                : 'Connecting...'}
            </div>
          )}
          <div className="absolute bottom-4 left-4 text-white bg-black/50 px-3 py-1 rounded">
            {otherParticipant?.username}
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
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button
            onClick={toggleVideo}
            variant={isVideoOff ? "destructive" : "default"}
            size="lg"
          >
            {isVideoOff ? <VideoOff /> : <VideoIcon />}
          </Button>
          <Button
            onClick={handleLeave}
            variant="destructive"
            size="lg"
          >
            <PhoneOff /> Leave
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### 2.4 Create Booking Socket Hook

**File:** `talkplatform-frontend/hooks/use-booking-socket.ts` (NEW)

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseBookingSocketProps {
  bookingId: string;
  userId: string;
  isOnline: boolean;
}

export function useBookingSocket({ bookingId, userId, isOnline }: UseBookingSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isOnline) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002', {
      query: { userId, bookingId },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('booking:join', { bookingId, userId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('booking:leave', { bookingId, userId });
      newSocket.disconnect();
    };
  }, [bookingId, userId, isOnline]);

  return { socket, isConnected };
}
```

---

## 📊 UPDATED ARCHITECTURE

```
Existing:
/bookings/page.tsx → Booking list ✅

New:
/bookings/[id]/page.tsx → BookingRoomPage (NEW)
  → BookingRoomWrapper (NEW)
    → BookingRoom (NEW)
      → useBookingSocket (NEW)
      → useWebRTCV2 (EXISTING ✅)

Backend:
booking.gateway.ts (NEW) → WebRTC signaling for 1-on-1
```

---

## ✅ TESTING CHECKLIST

- [ ] Teacher can join booking room
- [ ] Student can join booking room
- [ ] Video connects automatically
- [ ] Audio works
- [ ] Mute/unmute works
- [ ] Camera on/off works
- [ ] Leave call works
- [ ] Only participants can join
- [ ] Connection state shows correctly

---

## 🎯 DEPLOYMENT STEPS

1. **Backend:**
   - Add `booking.gateway.ts`
   - Register in `booking.module.ts`
   - Restart backend

2. **Frontend:**
   - Create all new files
   - Test locally
   - Deploy

**Total Time:** 3-4 hours (much less than original estimate!)

---

**Key Insight:** You already have 70% of the infrastructure! Just need to add WebRTC layer on top.
