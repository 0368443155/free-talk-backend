### TalkConnect - Hướng dẫn Cài đặt & Triển khai

## 1. Dependencies cần cài đặt

Backend (NestJS)

# Socket.IO
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Redis (cho scaling Socket.IO & State)
npm install ioredis @nestjs/ioredis

# WebRTC (Mediasoup)
npm install mediasoup

# Class validator & transformer
npm install class-validator class-transformer


Frontend (React/Next.js)

# Socket.IO client
npm install socket.io-client

# WebRTC (Mediasoup)
npm install mediasoup-client

# UI components (Headless UI, Radix, ...)
npm install @radix-ui/react-dialog
npm install lucide-react


## 2. Cấu hình Redis cho Socket.IO Scaling

Cập nhật Gateway với Redis Adapter

(File: src/adapters/redis-io.adapter.ts)

import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}


Sử dụng Adapter trong main.ts

import { RedisIoAdapter } from './adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
  
  //...
  await app.listen(3001);
}


## 3. Database Migration (MySQL)

Sử dụng kịch bản talkconnect_schema.sql đã được cung cấp.

-- (talkconnect_schema.sql)
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (...);

DROP TABLE IF EXISTS `Rooms`;
CREATE TABLE `Rooms` (...);

DROP TABLE IF EXISTS `RoomParticipants`;
CREATE TABLE `RoomParticipants` (...);

DROP TABLE IF EXISTS `RoomChatMessages`;
CREATE TABLE `RoomChatMessages` (...);

SET FOREIGN_KEY_CHECKS=1;


(Cần chạy file migration này trên CSDL MySQL)

## 4. Frontend Implementation (Ví dụ)

Kết nối Socket (Socket Hook)

// hooks/useSocket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
export const useSocket = (token: string) => {
  if (!socket && token) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
};


Component Sảnh chờ (Lobby)

// components/RoomDiscovery.tsx
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

export function RoomDiscovery() {
  const socket = getSocket();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    // 1. Lấy danh sách phòng ban đầu
    getLiveRoomsApi().then(setRooms);

    // 2. Lắng nghe cập nhật real-time
    socket?.on('room:list-update', (data) => {
      if (data.action === 'created') {
        setRooms((prev) => [data.room, ...prev]);
      }
      if (data.action === 'ended') {
        setRooms((prev) => prev.filter(r => r.id !== data.room.id));
      }
    });

    return () => {
      socket?.off('room:list-update');
    };
  }, [socket]);

  return (
    <div>
      {/* ... Render danh sách phòng ... */}
    </div>
  );
}


## 5. Testing

Test API (dùng cURL)

# Tạo phòng (cần JWT_TOKEN)
curl -X POST http://localhost:3001/rooms \
 -H "Authorization: Bearer YOUR_JWT_TOKEN" \
 -H "Content-Type: application/json" \
 -d '{
   "title": "Test Room",
   "language": "en",
   "max_participants": 6
 }'

# Lấy danh sách phòng
curl -X GET http://localhost:3001/rooms?status=LIVE

# Join phòng (lấy room_id từ trên)
curl -X POST http://localhost:3001/rooms/{roomId}/join \
 -H "Authorization: Bearer YOUR_JWT_TOKEN"


## 6. Deployment Checklist

[ ] Cấu hình CSDL (MySQL)

[ ] Cấu hình Redis cluster

[ ] Cấu hình TURN/STUN servers (coturn)

[ ] Cấu hình Mediasoup servers

[ ] Cấu hình Load Balancer (Nginx) cho NestJS

[ ] Cấu hình SSL (HTTPS/WSS)

[ ] Cấu hình CORS

[ ] Rate Limiting (cho API)

[ ] Monitoring & Logging