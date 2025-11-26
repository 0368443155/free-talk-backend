# 📚 Phase 4: Free Talk Rooms System

**Version**: 1.0  
**Status**: ⏳ **PENDING**  
**Priority**: High  
**Estimated Time**: 3-4 days  
**Dependencies**: None (standalone feature)

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Entity Definitions](#entity-definitions)
4. [Business Logic Flows](#business-logic-flows)
5. [GeoIP Integration](#geoip-integration)
6. [LiveKit Integration](#livekit-integration)
7. [Real-time Updates](#real-time-updates)
8. [API Endpoints](#api-endpoints)
9. [Testing Guide](#testing-guide)

---

## 📋 Overview

### Purpose

Enable users to create and join free conversation rooms for language practice. Rooms can be filtered by location (GeoIP), language, and topic. No payment required - completely free for all users.

### Key Features

- ✅ Create free talk rooms
- ✅ Join/leave rooms
- ✅ Location-based room discovery (GeoIP)
- ✅ Filter by language and topic
- ✅ Real-time participant tracking
- ✅ Room capacity management
- ✅ Nearby rooms (map view)
- ✅ Room history tracking

### User Roles

- **Any User**: Can create and join free talk rooms
- **Host**: User who created the room (can close room)
- **Participant**: User who joined the room

### Room Lifecycle

```
User Creates Room
       ↓
Room Status: Active
       ↓
Users Join Room
       ↓
LiveKit Session
       ↓
Users Leave Room
       ↓
Last User Leaves
       ↓
Room Status: Ended
```

---

## 🗄️ Database Schema

### Tables Overview

```
free_talk_rooms
├── id (PK)
├── host_id (FK → users.id)
├── title
├── description
├── topic
├── language
├── max_participants
├── current_participants
├── country
├── city
├── latitude
├── longitude
├── livekit_room_name
├── meeting_link
├── status (active, ongoing, ended)
├── is_public
├── scheduled_start
├── scheduled_end
├── actual_start
├── actual_end
├── created_at
└── updated_at

free_talk_participants
├── id (PK)
├── room_id (FK → free_talk_rooms.id)
├── user_id (FK → users.id)
├── joined_at
├── left_at
├── duration_minutes
├── status (active, left)
├── is_host
├── created_at
└── updated_at
```

### Entity Relationships

```
User
  ├── hosts many FreeTalkRooms
  └── participates in many FreeTalkRooms

FreeTalkRoom
  ├── has one Host (User)
  └── has many FreeTalkParticipants

FreeTalkParticipant
  ├── belongs to FreeTalkRoom
  └── belongs to User
```

---

## 🔧 Entity Definitions

### 1. FreeTalkRoom Entity

**File**: `src/features/free-talk/entities/free-talk-room.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { FreeTalkParticipant } from './free-talk-participant.entity';

export enum RoomStatus {
  ACTIVE = 'active',
  ONGOING = 'ongoing',
  ENDED = 'ended',
}

@Entity('free_talk_rooms')
@Index(['host_id'])
@Index(['status'])
@Index(['language'])
@Index(['latitude', 'longitude'])
@Index(['created_at'])
export class FreeTalkRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Host who created the room
  @Column({ type: 'varchar', length: 36 })
  host_id: string;

  // Room Information
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  topic: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string;

  // Capacity
  @Column({ type: 'int', default: 10 })
  max_participants: number;

  @Column({ type: 'int', default: 0 })
  current_participants: number;

  // Location (for nearby search)
  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  // Meeting Information
  @Column({ type: 'varchar', length: 255 })
  livekit_room_name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  meeting_link: string;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
  })
  status: RoomStatus;

  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  // Schedule
  @Column({ type: 'timestamp', nullable: true })
  scheduled_start: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_end: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_start: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_end: Date;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @OneToMany(() => FreeTalkParticipant, (participant) => participant.room)
  participants: FreeTalkParticipant[];
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `host_id` | UUID | Yes | User who created the room |
| `title` | String(255) | Yes | Room title |
| `description` | Text | No | Room description |
| `topic` | String(100) | No | Conversation topic |
| `language` | String(50) | No | Primary language |
| `max_participants` | Integer | Yes | Maximum participants (default: 10) |
| `current_participants` | Integer | Yes | Current participant count |
| `country` | String(100) | No | Country (from GeoIP) |
| `city` | String(100) | No | City (from GeoIP) |
| `latitude` | Decimal(10,7) | No | Latitude for map |
| `longitude` | Decimal(10,7) | No | Longitude for map |
| `livekit_room_name` | String(255) | Yes | LiveKit room identifier |
| `meeting_link` | String(500) | No | Full meeting URL |
| `status` | Enum | Yes | Room status |
| `is_public` | Boolean | Yes | Whether room is public |
| `scheduled_start` | Timestamp | No | Scheduled start time |
| `scheduled_end` | Timestamp | No | Scheduled end time |
| `actual_start` | Timestamp | No | When first user joined |
| `actual_end` | Timestamp | No | When last user left |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. `title` must be 3-255 characters
2. `max_participants` must be between 2 and 50
3. `current_participants` cannot exceed `max_participants`
4. `livekit_room_name` format: `freetalk_{timestamp}_{random}`
5. Location is auto-detected from user's IP (GeoIP)
6. Room status transitions: active → ongoing → ended
7. Room becomes 'ongoing' when first participant joins
8. Room becomes 'ended' when last participant leaves

---

### 2. FreeTalkParticipant Entity

**File**: `src/features/free-talk/entities/free-talk-participant.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { FreeTalkRoom } from './free-talk-room.entity';

export enum ParticipantStatus {
  ACTIVE = 'active',
  LEFT = 'left',
}

@Entity('free_talk_participants')
@Index(['room_id'])
@Index(['user_id'])
@Index(['room_id', 'user_id'], { unique: true })
export class FreeTalkParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Room reference
  @Column({ type: 'varchar', length: 36 })
  room_id: string;

  // User reference
  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  // Participation times
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date;

  // Duration
  @Column({ type: 'int', default: 0 })
  duration_minutes: number;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: ParticipantStatus,
    default: ParticipantStatus.ACTIVE,
  })
  status: ParticipantStatus;

  // Is this user the host?
  @Column({ type: 'boolean', default: false })
  is_host: boolean;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => FreeTalkRoom, (room) => room.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  room: FreeTalkRoom;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `room_id` | UUID | Yes | Room reference |
| `user_id` | UUID | Yes | User reference |
| `joined_at` | Timestamp | Yes | When user joined |
| `left_at` | Timestamp | No | When user left |
| `duration_minutes` | Integer | Yes | Total participation time |
| `status` | Enum | Yes | Participant status |
| `is_host` | Boolean | Yes | Whether user is host |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. One user can only join a room once at a time (unique constraint)
2. `duration_minutes` = difference between joined_at and left_at
3. Host is automatically added as participant when creating room
4. Host has `is_host = true`
5. Status transitions: active → left

---

## 🔄 Business Logic Flows

### Flow 1: Create Free Talk Room

**Endpoint**: `POST /api/free-talk/rooms`

**Authorization**: Any authenticated user

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "English Practice - Beginners Welcome",
  "description": "Let's practice English conversation together!",
  "topic": "Daily Life",
  "language": "English",
  "max_participants": 10,
  "is_public": true,
  "scheduled_start": "2025-12-01T14:00:00Z"
}
```

**Validation Rules**:
- `title`: Required, 3-255 characters
- `description`: Optional, max 5000 characters
- `topic`: Optional, max 100 characters
- `language`: Optional, max 50 characters
- `max_participants`: Optional, 2-50, default 10
- `is_public`: Optional, default true
- `scheduled_start`: Optional, must be future date

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   if (!user) {
     throw new UnauthorizedException('Authentication required');
   }
   ```

2. **Validate Input**:
   ```typescript
   const dto = await validateDto(CreateFreeTalkRoomDto, req.body);
   
   if (dto.scheduled_start && new Date(dto.scheduled_start) < new Date()) {
     throw new BadRequestException('Scheduled start must be in the future');
   }
   ```

3. **Get User Location (GeoIP)**:
   ```typescript
   const ipAddress = req.ip || req.headers['x-forwarded-for'];
   const geoData = await geoIpService.lookup(ipAddress);
   
   // geoData = {
   //   country: 'Vietnam',
   //   city: 'Hanoi',
   //   latitude: 21.0285,
   //   longitude: 105.8542
   // }
   ```

4. **Generate LiveKit Room Name**:
   ```typescript
   const timestamp = Date.now();
   const randomString = generateRandomString(6);
   const livekitRoomName = `freetalk_${timestamp}_${randomString}`;
   // Example: "freetalk_1732614000_abc123"
   ```

5. **Create Room**:
   ```typescript
   const room = roomRepository.create({
     host_id: user.id,
     title: dto.title,
     description: dto.description,
     topic: dto.topic,
     language: dto.language,
     max_participants: dto.max_participants || 10,
     current_participants: 0,
     country: geoData.country,
     city: geoData.city,
     latitude: geoData.latitude,
     longitude: geoData.longitude,
     livekit_room_name: livekitRoomName,
     status: RoomStatus.ACTIVE,
     is_public: dto.is_public !== false,
     scheduled_start: dto.scheduled_start,
   });
   ```

6. **Save Room**:
   ```typescript
   const savedRoom = await roomRepository.save(room);
   ```

7. **Create Host Participant**:
   ```typescript
   await participantRepository.save({
     room_id: savedRoom.id,
     user_id: user.id,
     is_host: true,
     status: ParticipantStatus.ACTIVE,
   });
   ```

8. **Increment Participant Count**:
   ```typescript
   await roomRepository.update(savedRoom.id, {
     current_participants: 1,
   });
   ```

9. **Generate Meeting Link**:
   ```typescript
   const meetingLink = `${process.env.FRONTEND_URL}/free-talk/rooms/${savedRoom.id}`;
   
   await roomRepository.update(savedRoom.id, {
     meeting_link: meetingLink,
   });
   ```

10. **Return Response**:
    ```typescript
    return {
      id: savedRoom.id,
      title: savedRoom.title,
      description: savedRoom.description,
      topic: savedRoom.topic,
      language: savedRoom.language,
      max_participants: savedRoom.max_participants,
      current_participants: 1,
      country: savedRoom.country,
      city: savedRoom.city,
      livekit_room_name: savedRoom.livekit_room_name,
      meeting_link: meetingLink,
      status: savedRoom.status,
      is_public: savedRoom.is_public,
      scheduled_start: savedRoom.scheduled_start,
      created_at: savedRoom.created_at,
    };
    ```

**Success Response** (201 Created):
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440007",
  "title": "English Practice - Beginners Welcome",
  "description": "Let's practice English conversation together!",
  "topic": "Daily Life",
  "language": "English",
  "max_participants": 10,
  "current_participants": 1,
  "country": "Vietnam",
  "city": "Hanoi",
  "livekit_room_name": "freetalk_1732614000_abc123",
  "meeting_link": "http://localhost:3001/free-talk/rooms/bb0e8400-e29b-41d4-a716-446655440007",
  "status": "active",
  "is_public": true,
  "scheduled_start": "2025-12-01T14:00:00.000Z",
  "created_at": "2025-11-26T12:00:00.000Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 400 | Bad Request | Validation failed or scheduled_start in past |
| 500 | Internal Server Error | Database or GeoIP error |

---

### Flow 2: Browse Free Talk Rooms

**Endpoint**: `GET /api/free-talk/rooms`

**Authorization**: None (public endpoint)

**Query Parameters**:
```
?language=English
&topic=Daily Life
&nearby=true
&lat=21.0285
&lon=105.8542
&radius=50
&page=1
&limit=20
```

**Query Parameter Descriptions**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | String | - | Filter by language |
| `topic` | String | - | Filter by topic |
| `nearby` | Boolean | false | Enable location-based search |
| `lat` | Number | - | User latitude (required if nearby=true) |
| `lon` | Number | - | User longitude (required if nearby=true) |
| `radius` | Number | 50 | Search radius in km |
| `page` | Integer | 1 | Page number |
| `limit` | Integer | 20 | Items per page (max 100) |

**Process Steps**:

1. **Build Base Query**:
   ```typescript
   const query = roomRepository
     .createQueryBuilder('room')
     .leftJoinAndSelect('room.host', 'host')
     .where('room.status = :status', { status: RoomStatus.ACTIVE })
     .andWhere('room.is_public = :isPublic', { isPublic: true });
   ```

2. **Apply Language Filter**:
   ```typescript
   if (language) {
     query.andWhere('room.language = :language', { language });
   }
   ```

3. **Apply Topic Filter**:
   ```typescript
   if (topic) {
     query.andWhere('room.topic = :topic', { topic });
   }
   ```

4. **Apply Nearby Filter** (if enabled):
   ```typescript
   if (nearby && lat && lon) {
     // Haversine formula for distance calculation
     query.addSelect(
       `(6371 * acos(
         cos(radians(:lat)) * 
         cos(radians(room.latitude)) * 
         cos(radians(room.longitude) - radians(:lon)) + 
         sin(radians(:lat)) * 
         sin(radians(room.latitude))
       ))`,
       'distance'
     );
     
     query.setParameters({ lat, lon });
     
     query.having('distance < :radius', { radius: radius || 50 });
     query.orderBy('distance', 'ASC');
   } else {
     query.orderBy('room.created_at', 'DESC');
   }
   ```

5. **Apply Pagination**:
   ```typescript
   const page = Math.max(1, parseInt(req.query.page) || 1);
   const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
   const skip = (page - 1) * limit;
   
   query.skip(skip).take(limit);
   ```

6. **Execute Query**:
   ```typescript
   const [rooms, total] = await query.getManyAndCount();
   ```

7. **Format Response**:
   ```typescript
   const data = rooms.map(room => ({
     id: room.id,
     title: room.title,
     description: room.description,
     topic: room.topic,
     language: room.language,
     current_participants: room.current_participants,
     max_participants: room.max_participants,
     country: room.country,
     city: room.city,
     distance: room['distance'] || null, // If nearby search
     host: {
       id: room.host.id,
       username: room.host.username,
       avatar_url: room.host.avatar_url,
     },
     scheduled_start: room.scheduled_start,
     status: room.status,
     created_at: room.created_at,
   }));
   
   return {
     data,
     total,
     page,
     limit,
     totalPages: Math.ceil(total / limit),
   };
   ```

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440007",
      "title": "English Practice - Beginners Welcome",
      "description": "Let's practice English conversation together!",
      "topic": "Daily Life",
      "language": "English",
      "current_participants": 3,
      "max_participants": 10,
      "country": "Vietnam",
      "city": "Hanoi",
      "distance": 2.5,
      "host": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "username": "john_doe",
        "avatar_url": "https://example.com/avatars/john.jpg"
      },
      "scheduled_start": "2025-12-01T14:00:00.000Z",
      "status": "active",
      "created_at": "2025-11-26T12:00:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### Flow 3: Join Free Talk Room

**Endpoint**: `POST /api/free-talk/rooms/:roomId/join`

**Authorization**: Any authenticated user

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `roomId`: UUID of the room to join

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Find Room**:
   ```typescript
   const room = await roomRepository.findOne({
     where: { id: roomId },
     relations: ['host'],
   });
   
   if (!room) {
     throw new NotFoundException('Room not found');
   }
   ```

3. **Validate Room Status**:
   ```typescript
   if (room.status === RoomStatus.ENDED) {
     throw new BadRequestException('Room has ended');
   }
   ```

4. **Check Room Capacity**:
   ```typescript
   if (room.current_participants >= room.max_participants) {
     throw new BadRequestException('Room is full');
   }
   ```

5. **Check Existing Participation**:
   ```typescript
   const existing = await participantRepository.findOne({
     where: {
       room_id: roomId,
       user_id: user.id,
       status: ParticipantStatus.ACTIVE,
     },
   });
   
   if (existing) {
     throw new BadRequestException('You are already in this room');
   }
   ```

6. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // Transaction steps
   });
   ```

7. **Create Participant**:
   ```typescript
   await manager.save(FreeTalkParticipant, {
     room_id: roomId,
     user_id: user.id,
     is_host: false,
     status: ParticipantStatus.ACTIVE,
   });
   ```

8. **Increment Participant Count**:
   ```typescript
   await manager.update(FreeTalkRoom, roomId, {
     current_participants: () => 'current_participants + 1',
   });
   ```

9. **Update Room Status** (if first join):
   ```typescript
   if (room.current_participants === 0) {
     await manager.update(FreeTalkRoom, roomId, {
       status: RoomStatus.ONGOING,
       actual_start: new Date(),
     });
   }
   ```

10. **Generate LiveKit Token**:
    ```typescript
    const token = await livekitService.generateToken({
      room: room.livekit_room_name,
      identity: user.id,
      name: user.username,
      metadata: JSON.stringify({
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
      }),
    });
    ```

11. **Return Join Info**:
    ```typescript
    return {
      room: {
        id: room.id,
        title: room.title,
        livekit_room_name: room.livekit_room_name,
        current_participants: room.current_participants + 1,
        max_participants: room.max_participants,
      },
      token: token,
      livekit_url: process.env.LIVEKIT_URL,
    };
    ```

**Success Response** (200 OK):
```json
{
  "room": {
    "id": "bb0e8400-e29b-41d4-a716-446655440007",
    "title": "English Practice - Beginners Welcome",
    "livekit_room_name": "freetalk_1732614000_abc123",
    "current_participants": 4,
    "max_participants": 10
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "livekit_url": "wss://livekit.example.com"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 404 | Not Found | Room not found |
| 400 | Bad Request | Room ended, full, or already joined |
| 500 | Internal Server Error | Database or LiveKit error |

---

### Flow 4: Leave Free Talk Room

**Endpoint**: `POST /api/free-talk/rooms/:roomId/leave`

**Authorization**: Authenticated user (participant)

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `roomId`: UUID of the room to leave

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   ```

2. **Find Participant**:
   ```typescript
   const participant = await participantRepository.findOne({
     where: {
       room_id: roomId,
       user_id: user.id,
       status: ParticipantStatus.ACTIVE,
     },
   });
   
   if (!participant) {
     throw new NotFoundException('You are not in this room');
   }
   ```

3. **Calculate Duration**:
   ```typescript
   const leftAt = new Date();
   const joinedAt = participant.joined_at;
   const durationMs = leftAt.getTime() - joinedAt.getTime();
   const durationMinutes = Math.floor(durationMs / 60000);
   ```

4. **Start Transaction**:
   ```typescript
   await dataSource.transaction(async (manager) => {
     // Transaction steps
   });
   ```

5. **Update Participant**:
   ```typescript
   await manager.update(FreeTalkParticipant, participant.id, {
     status: ParticipantStatus.LEFT,
     left_at: leftAt,
     duration_minutes: durationMinutes,
   });
   ```

6. **Decrement Participant Count**:
   ```typescript
   const room = await manager.findOne(FreeTalkRoom, {
     where: { id: roomId },
   });
   
   await manager.update(FreeTalkRoom, roomId, {
     current_participants: () => 'current_participants - 1',
   });
   ```

7. **End Room if Last Participant**:
   ```typescript
   if (room.current_participants === 1) { // Will be 0 after decrement
     await manager.update(FreeTalkRoom, roomId, {
       status: RoomStatus.ENDED,
       actual_end: new Date(),
     });
   }
   ```

8. **Return Success**:
   ```typescript
   return {
     message: 'Left room successfully',
     duration_minutes: durationMinutes,
   };
   ```

**Success Response** (200 OK):
```json
{
  "message": "Left room successfully",
  "duration_minutes": 45
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 404 | Not Found | Not in room |
| 500 | Internal Server Error | Database error |

---

### Flow 5: Get Nearby Rooms (Map View)

**Endpoint**: `GET /api/free-talk/rooms/nearby`

**Authorization**: None (public endpoint)

**Query Parameters**:
```
?lat=21.0285
&lon=105.8542
&radius=10
```

**Query Parameter Descriptions**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | Number | Yes | User latitude |
| `lon` | Number | Yes | User longitude |
| `radius` | Number | No | Search radius in km (default: 10) |

**Process Steps**:

1. **Validate Parameters**:
   ```typescript
   if (!lat || !lon) {
     throw new BadRequestException('Latitude and longitude are required');
   }
   
   const latitude = parseFloat(lat);
   const longitude = parseFloat(lon);
   const searchRadius = parseFloat(radius) || 10;
   ```

2. **Find Nearby Rooms**:
   ```typescript
   const rooms = await roomRepository
     .createQueryBuilder('room')
     .leftJoinAndSelect('room.host', 'host')
     .where('room.status = :status', { status: RoomStatus.ACTIVE })
     .andWhere('room.is_public = :isPublic', { isPublic: true })
     .andWhere('room.latitude IS NOT NULL')
     .andWhere('room.longitude IS NOT NULL')
     .addSelect(
       `(6371 * acos(
         cos(radians(:lat)) * 
         cos(radians(room.latitude)) * 
         cos(radians(room.longitude) - radians(:lon)) + 
         sin(radians(:lat)) * 
         sin(radians(room.latitude))
       ))`,
       'distance'
     )
     .setParameters({ lat: latitude, lon: longitude })
     .having('distance < :radius', { radius: searchRadius })
     .orderBy('distance', 'ASC')
     .getMany();
   ```

3. **Format Response**:
   ```typescript
   return rooms.map(room => ({
     id: room.id,
     title: room.title,
     latitude: room.latitude,
     longitude: room.longitude,
     distance: room['distance'],
     current_participants: room.current_participants,
     max_participants: room.max_participants,
     language: room.language,
     topic: room.topic,
     host: {
       username: room.host.username,
       avatar_url: room.host.avatar_url,
     },
   }));
   ```

**Success Response** (200 OK):
```json
[
  {
    "id": "bb0e8400-e29b-41d4-a716-446655440007",
    "title": "English Practice",
    "latitude": 21.0285,
    "longitude": 105.8542,
    "distance": 0.5,
    "current_participants": 3,
    "max_participants": 10,
    "language": "English",
    "topic": "Daily Life",
    "host": {
      "username": "john_doe",
      "avatar_url": "https://example.com/avatars/john.jpg"
    }
  }
]
```

---

## 🌍 GeoIP Integration

### GeoIP Service

**File**: `src/core/geoip/geoip.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import * as geoip from 'geoip-lite';

export interface GeoLocation {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class GeoIpService {
  lookup(ipAddress: string): GeoLocation {
    // Remove IPv6 prefix if present
    const cleanIp = ipAddress.replace(/^::ffff:/, '');
    
    // Lookup IP
    const geo = geoip.lookup(cleanIp);
    
    if (!geo) {
      // Default to unknown location
      return {
        country: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
      };
    }
    
    return {
      country: geo.country,
      city: geo.city || 'Unknown',
      latitude: geo.ll[0],
      longitude: geo.ll[1],
    };
  }
}
```

**Installation**:
```bash
npm install geoip-lite
npm install @types/geoip-lite --save-dev
```

**Usage**:
```typescript
const geoData = await geoIpService.lookup(req.ip);
// Returns: { country: 'Vietnam', city: 'Hanoi', latitude: 21.0285, longitude: 105.8542 }
```

---

## 🎥 LiveKit Integration

### Generate LiveKit Token

```typescript
import { AccessToken } from 'livekit-server-sdk';

async generateToken(params: {
  room: string;
  identity: string;
  name: string;
  metadata?: string;
}): Promise<string> {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: params.identity,
      name: params.name,
      metadata: params.metadata,
    }
  );
  
  token.addGrant({
    room: params.room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  
  return await token.toJwt();
}
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/free-talk/rooms` | Create room | ✅ | Any |
| GET | `/api/free-talk/rooms` | List rooms | ❌ | Public |
| GET | `/api/free-talk/rooms/nearby` | Nearby rooms | ❌ | Public |
| GET | `/api/free-talk/rooms/:id` | Room details | ❌ | Public |
| POST | `/api/free-talk/rooms/:id/join` | Join room | ✅ | Any |
| POST | `/api/free-talk/rooms/:id/leave` | Leave room | ✅ | Any |
| DELETE | `/api/free-talk/rooms/:id` | Delete room | ✅ | Host |
| PATCH | `/api/free-talk/rooms/:id` | Update room | ✅ | Host |

---

## 🧪 Testing Guide

### Test Scenario 1: Create and Join Room

```bash
# 1. Create room
POST http://localhost:3000/api/free-talk/rooms
Headers: Authorization: Bearer {token}
Body: {
  "title": "Test Room",
  "language": "English",
  "max_participants": 5
}

# Expected: 201 Created, room object returned

# 2. Browse rooms
GET http://localhost:3000/api/free-talk/rooms?language=English

# Expected: 200 OK, room in list

# 3. Join room (different user)
POST http://localhost:3000/api/free-talk/rooms/{roomId}/join
Headers: Authorization: Bearer {token2}

# Expected: 200 OK, LiveKit token returned

# 4. Leave room
POST http://localhost:3000/api/free-talk/rooms/{roomId}/leave
Headers: Authorization: Bearer {token2}

# Expected: 200 OK, duration returned
```

### Test Scenario 2: Nearby Rooms

```bash
# 1. Create room in Hanoi
POST http://localhost:3000/api/free-talk/rooms
# User IP: 14.xxx.xxx.xxx (Hanoi)

# 2. Search nearby (from Hanoi)
GET http://localhost:3000/api/free-talk/rooms/nearby?lat=21.0285&lon=105.8542&radius=10

# Expected: Room appears in results with distance

# 3. Search nearby (from Ho Chi Minh)
GET http://localhost:3000/api/free-talk/rooms/nearby?lat=10.8231&lon=106.6297&radius=10

# Expected: Room does NOT appear (too far)
```

---

## 🎯 Success Criteria

Phase 4 is complete when:

- ✅ Users can create free talk rooms
- ✅ Users can join/leave rooms
- ✅ GeoIP detects user location
- ✅ Nearby search works correctly
- ✅ Room capacity is enforced
- ✅ LiveKit tokens are generated
- ✅ Participant tracking works
- ✅ Room status updates correctly
- ✅ All filters work (language, topic, nearby)
- ✅ All error cases are handled

---

**End of Phase 4 Documentation**
