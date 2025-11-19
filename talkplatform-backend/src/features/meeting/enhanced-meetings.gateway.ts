import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { MeetingChatMessage, MessageType } from './entities/meeting-chat-message.entity';
import { User } from '../../users/user.entity';
import { WaitingRoomService } from './services/waiting-room.service';
import { LiveKitService } from '../../livekit/livekit.service';
import { ParticipantRole } from './entities/meeting-participant.entity';

interface SocketWithUser extends Socket {
  user?: User;
  meetingId?: string;
  userId?: string;
  isInWaitingRoom?: boolean;
  livekitToken?: string;
}

/**
 * Enhanced WebSocket Gateway with LiveKit SFU and Waiting Room support
 * Replaces the original meetings.gateway.ts with modern architecture
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3051'],
    credentials: true,
  },
  namespace: '/meetings',
})
@Injectable()
export class EnhancedMeetingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EnhancedMeetingsGateway.name);

  // User socket mapping for direct messaging
  private userSocketMap = new Map<string, string>();
  
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(MeetingChatMessage)
    private readonly chatMessageRepository: Repository<MeetingChatMessage>,
    private readonly waitingRoomService: WaitingRoomService,
    private readonly liveKitService: LiveKitService,
  ) {}

  async handleConnection(client: SocketWithUser) {
    try {
      const token = client.handshake.auth.token;
      const meetingId = client.handshake.auth.meetingId;

      this.logger.log(`🔌 Client attempting connection: ${client.id}, meeting: ${meetingId}`);

      if (!token || !meetingId) {
        this.logger.warn('❌ Missing auth token or meetingId');
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // TODO: Verify JWT token and extract user info
      // For now, mock user extraction - in real implementation, decode JWT
      const user = await this.extractUserFromToken(token);
      if (!user) {
        this.logger.warn('❌ Invalid token');
        client.emit('error', { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }

      // Verify meeting exists
      const meeting = await this.meetingRepository.findOne({
        where: { id: meetingId },
        relations: ['host', 'participants', 'participants.user'],
      });

      if (!meeting) {
        this.logger.warn(`❌ Meeting not found: ${meetingId}`);
        client.emit('error', { message: 'Meeting not found' });
        client.disconnect();
        return;
      }

      // Set client context
      client.user = user;
      client.meetingId = meetingId;
      client.userId = user.id;

      // Map user to socket for direct communication
      this.userSocketMap.set(user.id, client.id);

      const isHost = meeting.host.id === user.id;

      // UC-03: Check if waiting room is enabled
      if (meeting.settings?.waiting_room && !isHost) {
        await this.handleWaitingRoomEntry(client, meeting, user);
        return;
      }

      // Direct entry to meeting (no waiting room)
      await this.handleDirectMeetingEntry(client, meeting, user);

    } catch (error) {
      this.logger.error('❌ Connection error:', error.message);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: SocketWithUser) {
    if (client.userId) {
      this.userSocketMap.delete(client.userId);
      
      if (client.meetingId) {
        if (client.isInWaitingRoom) {
          await this.waitingRoomService.removeFromWaitingRoom(client.meetingId, client.userId);
          // Notify host about participant leaving waiting room
          this.notifyHostWaitingRoomUpdate(client.meetingId);
        }
        
        // Notify other participants
        client.to(client.meetingId).emit('meeting:user-left', {
          userId: client.userId,
          username: client.user?.username,
        });
      }

      this.logger.log(`👋 Client disconnected: ${client.id}, user: ${client.user?.username}`);
    }
  }

  /**
   * UC-03: Handle waiting room entry
   */
  private async handleWaitingRoomEntry(client: SocketWithUser, meeting: Meeting, user: User) {
    try {
      // Add to waiting room
      await this.waitingRoomService.addToWaitingRoom(meeting.id, user, client.id);
      client.isInWaitingRoom = true;

      // Join waiting room socket group
      await client.join(`waiting-${meeting.id}`);

      // Generate limited LiveKit token for waiting room
      const waitingToken = await this.liveKitService.generateWaitingRoomToken(
        `meeting-${meeting.id}`,
        `user-${user.id}`,
        user.username,
        JSON.stringify({ 
          role: 'waiting',
          waitingRoom: true,
          joinedAt: new Date().toISOString(),
        })
      );

      // Notify client they're in waiting room
      client.emit('waiting-room:entered', {
        message: 'You are in the waiting room. The host will admit you shortly.',
        meetingTitle: meeting.title,
        position: this.waitingRoomService.getWaitingParticipants(meeting.id).length,
        token: waitingToken,
        wsUrl: this.liveKitService.getWebSocketUrl(),
      });

      // Notify host about new participant in waiting room
      this.notifyHostWaitingRoomUpdate(meeting.id);

      this.logger.log(`👤 User ${user.username} entered waiting room for meeting ${meeting.id}`);

    } catch (error) {
      this.logger.error('❌ Failed to handle waiting room entry:', error.message);
      client.emit('error', { message: 'Failed to join waiting room' });
      client.disconnect();
    }
  }

  /**
   * Handle direct meeting entry (no waiting room)
   */
  private async handleDirectMeetingEntry(client: SocketWithUser, meeting: Meeting, user: User) {
    try {
      // Join meeting room
      await client.join(meeting.id);

      const isHost = meeting.host.id === user.id;

      // Generate full LiveKit token
      const livekitToken = isHost
        ? await this.liveKitService.generateHostToken(
            `meeting-${meeting.id}`,
            `user-${user.id}`,
            user.username,
            JSON.stringify({
              role: 'host',
              userId: user.id,
              username: user.username,
              joinedAt: new Date().toISOString(),
            })
          )
        : await this.liveKitService.generateParticipantToken(
            `meeting-${meeting.id}`,
            `user-${user.id}`,
            user.username,
            JSON.stringify({
              role: 'participant',
              userId: user.id,
              username: user.username,
              joinedAt: new Date().toISOString(),
            })
          );

      // Add/update participant in database
      await this.addOrUpdateParticipant(meeting, user, isHost);

      // Send meeting info to client
      client.emit('meeting:joined', {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        isHost,
        livekitToken,
        livekitWsUrl: this.liveKitService.getWebSocketUrl(),
        participants: meeting.participants.map(p => ({
          id: p.id,
          userId: p.user.id,
          username: p.user.username,
          role: p.role,
          isOnline: p.is_online,
          isMuted: p.is_muted,
          isVideoOff: p.is_video_off,
          isHandRaised: p.is_hand_raised,
        })),
      });

      // Notify others about new participant
      client.to(meeting.id).emit('meeting:user-joined', {
        userId: user.id,
        username: user.username,
        isHost,
      });

      this.logger.log(`✅ User ${user.username} joined meeting ${meeting.id} directly`);

    } catch (error) {
      this.logger.error('❌ Failed to handle direct meeting entry:', error.message);
      client.emit('error', { message: 'Failed to join meeting' });
      client.disconnect();
    }
  }

  /**
   * UC-03: Host admits participant from waiting room
   */
  @SubscribeMessage('waiting-room:admit')
  async handleAdmitParticipant(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { participantId: string },
  ) {
    if (!client.meetingId || !client.user) return;

    try {
      const meeting = await this.meetingRepository.findOne({
        where: { id: client.meetingId },
        relations: ['host'],
      });

      // Verify host permission
      if (!meeting || meeting.host.id !== client.user.id) {
        client.emit('error', { message: 'Only host can admit participants' });
        return;
      }

      // Admit participant
      const participant = await this.waitingRoomService.admitParticipant(
        client.meetingId,
        data.participantId,
        client.user.id,
      );

      if (!participant) {
        client.emit('error', { message: 'Participant not found in waiting room' });
        return;
      }

      // Find participant's socket
      const participantSocketId = this.userSocketMap.get(data.participantId);
      if (participantSocketId) {
        const participantSocket = this.server.sockets.sockets.get(participantSocketId) as SocketWithUser;
        
        if (participantSocket) {
          // Remove from waiting room group
          await participantSocket.leave(`waiting-${client.meetingId}`);
          participantSocket.isInWaitingRoom = false;

          // Generate new full token
          const fullToken = await this.liveKitService.generateParticipantToken(
            `meeting-${client.meetingId}`,
            `user-${data.participantId}`,
            participant.username,
            JSON.stringify({
              role: 'participant',
              admittedBy: client.user.id,
              admittedAt: new Date().toISOString(),
            })
          );

          // Join meeting room
          await participantSocket.join(client.meetingId);

          // Notify admitted participant
          participantSocket.emit('waiting-room:admitted', {
            message: 'You have been admitted to the meeting',
            livekitToken: fullToken,
            livekitWsUrl: this.liveKitService.getWebSocketUrl(),
          });

          // Notify all meeting participants
          this.server.to(client.meetingId).emit('meeting:user-joined', {
            userId: data.participantId,
            username: participant.username,
            isHost: false,
          });
        }
      }

      // Update waiting room for host
      this.notifyHostWaitingRoomUpdate(client.meetingId);

      this.logger.log(`✅ Host ${client.user.username} admitted ${participant.username} to meeting ${client.meetingId}`);

    } catch (error) {
      this.logger.error('❌ Failed to admit participant:', error.message);
      client.emit('error', { message: 'Failed to admit participant' });
    }
  }

  /**
   * UC-03: Host admits all waiting participants
   */
  @SubscribeMessage('waiting-room:admit-all')
  async handleAdmitAllParticipants(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.user) return;

    try {
      const meeting = await this.meetingRepository.findOne({
        where: { id: client.meetingId },
        relations: ['host'],
      });

      if (!meeting || meeting.host.id !== client.user.id) {
        client.emit('error', { message: 'Only host can admit participants' });
        return;
      }

      const waitingParticipants = await this.waitingRoomService.admitAllParticipants(
        client.meetingId,
        client.user.id,
      );

      // Process each waiting participant
      for (const participant of waitingParticipants) {
        const participantSocketId = this.userSocketMap.get(participant.userId);
        if (participantSocketId) {
          const participantSocket = this.server.sockets.sockets.get(participantSocketId) as SocketWithUser;
          
          if (participantSocket) {
            await participantSocket.leave(`waiting-${client.meetingId}`);
            participantSocket.isInWaitingRoom = false;

            const fullToken = await this.liveKitService.generateParticipantToken(
              `meeting-${client.meetingId}`,
              `user-${participant.userId}`,
              participant.username,
              JSON.stringify({
                role: 'participant',
                admittedBy: client.user.id,
                admittedAt: new Date().toISOString(),
              })
            );

            await participantSocket.join(client.meetingId);

            participantSocket.emit('waiting-room:admitted', {
              message: 'You have been admitted to the meeting',
              livekitToken: fullToken,
              livekitWsUrl: this.liveKitService.getWebSocketUrl(),
            });
          }
        }

        // Notify all participants
        this.server.to(client.meetingId).emit('meeting:user-joined', {
          userId: participant.userId,
          username: participant.username,
          isHost: false,
        });
      }

      // Clear waiting room display for host
      this.notifyHostWaitingRoomUpdate(client.meetingId);

      this.logger.log(`✅ Host ${client.user.username} admitted all ${waitingParticipants.length} participants to meeting ${client.meetingId}`);

    } catch (error) {
      this.logger.error('❌ Failed to admit all participants:', error.message);
      client.emit('error', { message: 'Failed to admit all participants' });
    }
  }

  /**
   * UC-03: Host denies participant entry
   */
  @SubscribeMessage('waiting-room:deny')
  async handleDenyParticipant(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { participantId: string; reason?: string },
  ) {
    if (!client.meetingId || !client.user) return;

    try {
      const participant = await this.waitingRoomService.denyParticipant(
        client.meetingId,
        data.participantId,
        client.user.id,
      );

      if (!participant) {
        client.emit('error', { message: 'Participant not found in waiting room' });
        return;
      }

      // Find and disconnect participant
      const participantSocketId = this.userSocketMap.get(data.participantId);
      if (participantSocketId) {
        const participantSocket = this.server.sockets.sockets.get(participantSocketId);
        if (participantSocket) {
          participantSocket.emit('waiting-room:denied', {
            message: data.reason || 'Your request to join the meeting was denied.',
          });
          participantSocket.disconnect();
        }
      }

      this.notifyHostWaitingRoomUpdate(client.meetingId);

      this.logger.log(`❌ Host ${client.user.username} denied ${participant.username} entry to meeting ${client.meetingId}`);

    } catch (error) {
      this.logger.error('❌ Failed to deny participant:', error.message);
      client.emit('error', { message: 'Failed to deny participant' });
    }
  }

  /**
   * UC-07: Data channel chat (LiveKit integration)
   */
  @SubscribeMessage('livekit:data-received')
  async handleLiveKitDataReceived(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { payload: string; fromParticipant: string },
  ) {
    try {
      const parsedData = JSON.parse(data.payload);
      
      if (parsedData.type === 'chat') {
        // Save chat message to database
        const meeting = await this.meetingRepository.findOne({
          where: { id: client.meetingId },
        });

        if (meeting && client.user) {
          const chatMessage = this.chatMessageRepository.create({
            meeting,
            sender: client.user,
            message: parsedData.message,
            type: MessageType.TEXT,
            metadata: {
              source: 'livekit_datachannel',
              timestamp: parsedData.timestamp,
            },
          });

          await this.chatMessageRepository.save(chatMessage);
        }
      } else if (parsedData.type === 'reaction') {
        // Handle reactions - broadcast to all participants
        if (client.meetingId) {
          client.to(client.meetingId).emit('meeting:reaction', {
            userId: client.userId,
            username: client.user?.username,
            emoji: parsedData.emoji,
            timestamp: parsedData.timestamp,
          });
        }
      }

    } catch (error) {
      this.logger.error('❌ Failed to process LiveKit data:', error.message);
    }
  }

  /**
   * Notify host about waiting room updates
   */
  private notifyHostWaitingRoomUpdate(meetingId: string) {
    const waitingStats = this.waitingRoomService.getWaitingRoomStats(meetingId);
    
    this.server.to(meetingId).emit('waiting-room:updated', {
      totalWaiting: waitingStats.totalWaiting,
      participants: waitingStats.participants,
    });
  }

  /**
   * Add or update participant in database
   */
  private async addOrUpdateParticipant(meeting: Meeting, user: User, isHost: boolean) {
    const existingParticipant = await this.participantRepository.findOne({
      where: { meeting: { id: meeting.id }, user: { id: user.id } },
    });

    if (existingParticipant) {
      existingParticipant.is_online = true;
      existingParticipant.joined_at = new Date();
      await this.participantRepository.save(existingParticipant);
    } else {
      const participant = this.participantRepository.create({
        meeting,
        user,
        role: isHost ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT,
        is_online: true,
        joined_at: new Date(),
      });
      await this.participantRepository.save(participant);
    }
  }

  /**
   * Extract user from JWT token (mock implementation)
   */
  private async extractUserFromToken(token: string): Promise<User | null> {
    // TODO: Implement proper JWT verification and user extraction
    // This is a mock implementation
    return {
      id: 'mock-user-id',
      username: 'mock-user',
      email: 'mock@example.com',
    } as User;
  }
}