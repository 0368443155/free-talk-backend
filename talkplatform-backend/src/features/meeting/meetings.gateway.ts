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
import { Injectable, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { MeetingChatMessage, MessageType } from './entities/meeting-chat-message.entity';
import { BlockedParticipant } from './entities/blocked-participant.entity';
import { User } from '../../users/user.entity';

interface SocketWithUser extends Socket {
  user?: User;
  meetingId?: string;
  userId?: string;
}

// Map userId to socketId for direct messaging
const userSocketMap = new Map<string, string>();
const peerConnectionMap = new Map<string, Set<string>>();

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow both frontend & backend
    credentials: true,
  },
  //namespace: '/meetings',
  // Optimize WebSocket performance
  transports: ['websocket', 'polling'],
  // Increase max payload for video signaling
  maxHttpBufferSize: 1e8, // 100 MB
  // Enable compression for better bandwidth
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
  },
  // Ping settings for connection health
  pingTimeout: 60000,
  pingInterval: 25000,
  // Add cookie support
  allowEIO3: true,
})
@Injectable()
export class MeetingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(MeetingChatMessage)
    private readonly chatMessageRepository: Repository<MeetingChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BlockedParticipant)
    private readonly blockedParticipantRepository: Repository<BlockedParticipant>,
  ) {}

  async handleConnection(client: SocketWithUser) {
    console.log(`🟢 Client connected:`, {
      socketId: client.id,
      transport: (client as any).conn?.transport?.name,
      hasAuth: !!client.handshake.auth.token,
      query: client.handshake.query,
    });

    // Extract userId and meetingId from query or auth
    const userId = client.handshake.query.userId as string || client.handshake.auth.userId;
    const meetingId = client.handshake.query.meetingId as string || client.handshake.auth.meetingId;

    console.log('📋 Connection details:', { userId, meetingId });

    // Validate and fetch user (optional authentication check)
    if (userId) {
      try {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
          client.user = user;
          client.userId = userId;
          console.log('✅ User authenticated:', user.username);
        }
      } catch (error) {
        console.error('❌ Failed to authenticate user:', error);
      }
    }
  }

  async handleDisconnect(client: SocketWithUser) {
    console.log(`🔴 Client disconnected:`, {
      socketId: client.id,
      userId: client.userId,
      meetingId: client.meetingId,
      userName: client.user?.username,
    });

    // When a client disconnects unexpectedly (tab closed, network lost),
    // ensure we mark them offline and notify the room immediately
    try {
      if (client.meetingId && client.user) {
        await this.participantRepository.update(
          {
            meeting: { id: client.meetingId },
            user: { id: client.user.id },
          },
          { is_online: false, left_at: new Date() },
        );

        this.server.to(client.meetingId).emit('meeting:user-left', {
          userId: client.user.id,
          userName: client.user.username,
          timestamp: new Date(),
        });

        client.leave(client.meetingId);
        client.meetingId = undefined;
      }
    } catch (e) {
      console.error('❌ Error handling disconnect cleanup:', e);
    }
  }

  @SubscribeMessage('meeting:join')
  async handleJoinMeeting(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { meetingId: string; userId: string },
  ) {
    console.log(`📡 Received meeting:join from socket ${client.id}:`, data);
    const { meetingId, userId } = data;

    try {
      // Optimized: Single query with all needed relations
      const participant = await this.participantRepository.findOne({
        where: {
          meeting: { id: meetingId },
          user: { id: userId },
        },
        relations: ['user', 'meeting'],
      });

      if (!participant) {
        console.error(`❌ Participant not found for user ${userId} in meeting ${meetingId}`);
        client.emit('error', { message: 'Not authorized to join this meeting' });
        return;
      }

      console.log(`✅ Participant found:`, {
        userId: participant.user.id,
        userName: participant.user.username, // 🔥 FIX: Use username instead of name
        role: participant.role,
        wasOnline: participant.is_online,
      });

      // 🔥 FIX: Check if already in room to handle duplicate joins gracefully
      const wasInRoom = client.rooms.has(meetingId);
      
      // Join room (idempotent - safe to call multiple times)
      client.join(meetingId);
      client.meetingId = meetingId;
      client.user = participant.user;
      client.userId = userId;

      // Map userId to socketId for direct messaging
      userSocketMap.set(userId, client.id);
      peerConnectionMap.set(userId, new Set());
      
      if (wasInRoom) {
        console.log(`ℹ️ User ${userId} already in room ${meetingId}, skipping duplicate join`);
        // Still emit success to acknowledge
        client.emit('meeting:joined', {
          meetingId,
          userId,
          userName: participant.user.username, // 🔥 FIX: Use username instead of name
          timestamp: new Date(),
        });
        return;
      }
      
      console.log(`User ${userId} mapped to socket ${client.id}`);

      // Optimized: Update participant status with single query
      await this.participantRepository.update(
        { id: participant.id },
        { is_online: true }
      );

      // Optimized: Get all online participants in single query
      const participants = await this.participantRepository.find({
        where: { meeting: { id: meetingId }, is_online: true },
        relations: ['user'],
        select: {
          id: true,
          role: true,
          is_muted: true,
          is_video_off: true,
          is_hand_raised: true,
          user: {
            id: true,
            username: true, // 🔥 FIX: Use username instead of name
            avatar_url: true,
          },
        },
      });

      // Notify others (broadcast to room, excluding sender)
      console.log(`📢 Broadcasting user-joined to room ${meetingId}:`, {
        userId: participant.user.id,
        userName: participant.user.username, // 🔥 FIX: Use username instead of name
      });
      client.to(meetingId).emit('meeting:user-joined', {
        userId: participant.user.id,
        userName: participant.user.username, // 🔥 FIX: Use username instead of name
        avatarUrl: participant.user.avatar_url,
        role: participant.role,
        timestamp: new Date(),
      });

      // Send current participants to new user
      client.emit('meeting:participants', {
        participants: participants.map((p) => ({
          userId: p.user.id,
          userName: p.user.username, // 🔥 FIX: Use username instead of name
          avatarUrl: p.user.avatar_url,
          role: p.role,
          isMuted: p.is_muted,
          isVideoOff: p.is_video_off,
          isHandRaised: p.is_hand_raised,
        })),
      });

      // Send YouTube sync state
      const meeting = participant.meeting;
      if (meeting.youtube_video_id) {
        client.emit('youtube:sync', {
          videoId: meeting.youtube_video_id,
          currentTime: meeting.youtube_current_time,
          isPlaying: meeting.youtube_is_playing,
        });
      }

      // 🔥 FIX: Emit success event
      client.emit('meeting:joined', {
        meetingId,
        userId,
        userName: participant.user.username, // 🔥 FIX: Use username instead of name
        timestamp: new Date(),
      });

      console.log(`✅ User ${userId} successfully joined meeting ${meetingId} via socket`);
    } catch (error) {
      console.error(`❌ Error in handleJoinMeeting:`, error);
      // 🔥 FIX: Emit more detailed error
      const errorMessage = error instanceof Error ? error.message : 'Failed to join meeting';
      client.emit('meeting:join-error', { 
        message: errorMessage,
        meetingId,
        userId,
      });
    }
  }

  @SubscribeMessage('meeting:request-peers')
  async handleRequestPeers(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.userId) {
      console.error('❌ No meeting or user ID for request-peers');
      return;
    }

    console.log(`📡 ${client.userId} requesting existing peers in meeting ${client.meetingId}`);

    // Get all online participants except self
    const participants = await this.participantRepository.find({
      where: { meeting: { id: client.meetingId }, is_online: true },
      relations: ['user'],
      select: {
        id: true,
        user: { id: true, username: true },
      },
    });

    const otherUsers = participants
      .filter((p) => p.user.id !== client.userId)
      .map((p) => ({
        userId: p.user.id,
        userName: p.user.username,
      }));

    console.log(`📤 Sending ${otherUsers.length} existing peers to ${client.userId}`);

    // Send existing users to the requester
    otherUsers.forEach((user) => {
      client.emit('meeting:user-joined', {
        userId: user.userId,
        userName: user.userName,
      });
    });
  }

  @SubscribeMessage('meeting:leave')
  async handleLeaveMeeting(@ConnectedSocket() client: SocketWithUser) {
    if (client.meetingId && client.user) {
      // Update participant
      await this.participantRepository.update(
        {
          meeting: { id: client.meetingId },
          user: { id: client.user.id },
        },
        { is_online: false, left_at: new Date() },
      );

      // Notify others
      this.server.to(client.meetingId).emit('meeting:user-left', {
        userId: client.user.id,
        userName: client.user.username,
        timestamp: new Date(),
      });

      client.leave(client.meetingId);
      client.meetingId = undefined;
    }
  }

  @SubscribeMessage('webrtc:offer')
  handleWebRTCOffer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; offer: any },
  ) {
    const startTime = Date.now();
    console.log(`📤 WebRTC offer from ${client.userId} to ${data.targetUserId}`);

    // Get target socket ID
    const targetSocketId = userSocketMap.get(data.targetUserId);

    if (targetSocketId) {
      // Send offer directly to target user (no database query needed)
      this.server.to(targetSocketId).emit('webrtc:offer', {
        fromUserId: client.userId,
        offer: data.offer,
      });

      //track peer connection
      const userPeers = peerConnectionMap.get(client.userId!);
      if (userPeers) {
        userPeers.add(data.targetUserId);
      }

      const elapsed = Date.now() - startTime;
      console.log(`✅ Sent offer to socket ${targetSocketId} (${elapsed}ms)`);
    } else {
      console.error(`❌ Target user ${data.targetUserId} not found in socket map`);
      // Notify sender that target is not available
      client.emit('webrtc:error', {
        targetUserId: data.targetUserId,
        error: 'User not connected',
      });
    }
  }

  @SubscribeMessage('webrtc:answer')
  handleWebRTCAnswer(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; answer: any },
  ) {
    const startTime = Date.now();
    console.log(`📤 WebRTC answer from ${client.userId} to ${data.targetUserId}`);

    // Get target socket ID
    const targetSocketId = userSocketMap.get(data.targetUserId);

    if (targetSocketId) {
      // Send answer directly to target user (no database query needed)
      this.server.to(targetSocketId).emit('webrtc:answer', {
        fromUserId: client.userId,
        answer: data.answer,
      });

      // Track peer connection
      const userPeers = peerConnectionMap.get(client.userId!);
      if (userPeers) {
        userPeers.add(data.targetUserId);
      }

      const elapsed = Date.now() - startTime;
      console.log(`✅ Sent answer to socket ${targetSocketId} (${elapsed}ms)`);
    } else {
      console.error(`❌ Target user ${data.targetUserId} not found in socket map`);
      client.emit('webrtc:error', {
        targetUserId: data.targetUserId,
        error: 'User not connected',
      });
    }
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleICECandidate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; candidate: any },
  ) {
    // Optimized: No logging for each ICE candidate to reduce overhead
    // Get target socket ID
    const targetSocketId = userSocketMap.get(data.targetUserId);

    if (targetSocketId) {
      // Send ICE candidate directly to target user (no database query needed)
      // This is the most frequent message, so we optimize by removing logs
      this.server.to(targetSocketId).emit('webrtc:ice-candidate', {
        fromUserId: client.userId,
        candidate: data.candidate,
      });
    } else {
      console.error(`❌ ICE: Target user ${data.targetUserId} not found in socket map`);
    }
  }

  @SubscribeMessage('webrtc:ready')
  handleWebRTCReady(@ConnectedSocket() client: SocketWithUser){
    if(!client.meetingId || !client.userId) return;
    
    console.log(`📡 ${client.userId} is ready for WebRTC`);

    // Notify all others in the room
    client.to(client.meetingId).emit('webrtc:peer-ready', {
      userId: client.userId,
      userName: client.user?.username,
    });
  }

  @SubscribeMessage('media:toggle-mic')
  async handleToggleMic(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isMuted: boolean },
  ) {
    if (!client.meetingId || !client.user) return;

    // Update participant
    await this.participantRepository.update(
      {
        meeting: { id: client.meetingId },
        user: { id: client.user.id },
      },
      { is_muted: data.isMuted },
    );

    // Notify others
    this.server.to(client.meetingId).emit('media:user-muted', {
      userId: client.user.id,
      isMuted: data.isMuted,
    });
  }

  @SubscribeMessage('media:toggle-video')
  async handleToggleVideo(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isVideoOff: boolean },
  ) {
    if (!client.meetingId || !client.user) return;

    // Update participant
    await this.participantRepository.update(
      {
        meeting: { id: client.meetingId },
        user: { id: client.user.id },
      },
      { is_video_off: data.isVideoOff },
    );

    // Notify others
    this.server.to(client.meetingId).emit('media:user-video-off', {
      userId: client.user.id,
      isVideoOff: data.isVideoOff,
    });
  }

  @SubscribeMessage('media:screen-share')
  async handleScreenShare(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { isSharing: boolean },
  ) {
    if (!client.meetingId || !client.user) return;

    // Broadcast screen share state (ephemeral; not persisted)
    this.server.to(client.meetingId).emit('media:user-screen-share', {
      userId: client.user.id,
      isSharing: data.isSharing,
      timestamp: new Date(),
    });
  }

  // Host moderation controls
  private async ensureHost(client: SocketWithUser) {
    if (!client.meetingId || !client.user) return false;
    const participant = await this.participantRepository.findOne({
      where: { meeting: { id: client.meetingId }, user: { id: client.user.id } },
      select: { id: true, role: true },
      relations: ['meeting', 'user'],
    });
    return participant?.role === 'host';
  }

  @SubscribeMessage('admin:mute-user')
  async handleAdminMuteUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; mute?: boolean },
  ) {
    if (!(await this.ensureHost(client))) return;
    
    // Get current state from database
    const participant = await this.participantRepository.findOne({
      where: { meeting: { id: client.meetingId }, user: { id: data.targetUserId } },
    });
    
    if (!participant) return;
    
    // Toggle: if mute is explicitly provided, use it; otherwise toggle current state
    const isMuted = data.mute !== undefined ? data.mute : !participant.is_muted;
    
    await this.participantRepository.update(
      { meeting: { id: client.meetingId }, user: { id: data.targetUserId } },
      { is_muted: isMuted },
    );
    
    this.server.to(client.meetingId!).emit('media:user-muted', {
      userId: data.targetUserId,
      isMuted,
    });
  }

  @SubscribeMessage('admin:video-off-user')
  async handleAdminVideoOffUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; videoOff?: boolean },
  ) {
    if (!(await this.ensureHost(client))) return;
    
    // Get current state from database
    const participant = await this.participantRepository.findOne({
      where: { meeting: { id: client.meetingId }, user: { id: data.targetUserId } },
    });
    
    if (!participant) return;
    
    // Toggle: if videoOff is explicitly provided, use it; otherwise toggle current state
    const isVideoOff = data.videoOff !== undefined ? data.videoOff : !participant.is_video_off;
    
    await this.participantRepository.update(
      { meeting: { id: client.meetingId }, user: { id: data.targetUserId } },
      { is_video_off: isVideoOff },
    );
    
    this.server.to(client.meetingId!).emit('media:user-video-off', {
      userId: data.targetUserId,
      isVideoOff,
    });
  }

  @SubscribeMessage('admin:stop-share-user')
  async handleAdminStopShareUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (!(await this.ensureHost(client))) return;
    // Broadcast a stop-share signal for the target
    this.server.to(client.meetingId!).emit('media:user-screen-share', {
      userId: data.targetUserId,
      isSharing: false,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('admin:kick-user')
  async handleAdminKickUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; reason?: string },
  ) {
    if (!(await this.ensureHost(client))) return;
    // Remove participant from DB
    await this.participantRepository.delete({
      meeting: { id: client.meetingId },
      user: { id: data.targetUserId }
    });
    // Notify the kicked user
    this.server.to(client.meetingId!).emit('user:kicked', {
      userId: data.targetUserId,
      reason: data.reason || 'Kicked by host',
      timestamp: new Date(),
    });
    // Notify others about user leaving
    this.server.to(client.meetingId!).emit('meeting:user-left', {
      userId: data.targetUserId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('admin:block-user')
  async handleAdminBlockUser(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { targetUserId: string; reason?: string },
  ) {
    if (!(await this.ensureHost(client))) return;
    
    // Add to blocked list first
    const blockedParticipant = this.blockedParticipantRepository.create({
      meeting_id: client.meetingId!,
      user_id: data.targetUserId,
      blocked_by: client.user!.id,
      reason: data.reason || 'Blocked by host',
    });
    await this.blockedParticipantRepository.save(blockedParticipant);
    
    // Remove participant from DB
    await this.participantRepository.delete({
      meeting: { id: client.meetingId },
      user: { id: data.targetUserId }
    });
    
    // Notify the blocked user and others
    this.server.to(client.meetingId!).emit('user:blocked', {
      userId: data.targetUserId,
      reason: data.reason || 'Blocked by host',
      timestamp: new Date(),
    });
    
    // Notify others about user leaving
    this.server.to(client.meetingId!).emit('meeting:user-left', {
      userId: data.targetUserId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('chat:message')
async handleChatMessage(
  @ConnectedSocket() client: SocketWithUser,
  @MessageBody() data: { message: string; replyTo?: string },
) {
  console.log('💬 [GATEWAY] Received chat:message:', {
    socketId: client.id,
    userId: client.userId,
    userName: client.user?.name,
    meetingId: client.meetingId,
    messagePreview: data.message.substring(0, 50),
    hasUser: !!client.user,
    hasMeetingId: !!client.meetingId,
    fullData: data,
  });

  if (!client.meetingId || !client.user) {
    console.error('❌ Cannot send message: No meeting or user');
    return;
  }

  console.log('💬 Processing chat message:', {
    from: client.user.username,
    message: data.message,
    meetingId: client.meetingId,
  });

  try {
    // Save message to database
    const chatMessage = this.chatMessageRepository.create({
      meeting: { id: client.meetingId },
      sender: client.user,
      message: data.message,
      type: MessageType.TEXT,
      metadata: data.replyTo ? { reply_to: data.replyTo } : null,
    });

    const savedMessage = await this.chatMessageRepository.save(chatMessage);

    // Broadcast to ALL participants in the room (including sender)
    const broadcastData = {
      id: savedMessage.id,
      message: savedMessage.message,
      senderId: client.user.id, // Use id as senderId
      senderName: client.user.username, // 🔥 FIX: Use username (User entity doesn't have name field)
      senderAvatar: client.user.avatar_url,
      replyTo: data.replyTo,
      timestamp: savedMessage.created_at.toISOString(),
      type: MessageType.TEXT,
    };

    console.log('📢 Broadcasting message to room:', client.meetingId, {
      from: broadcastData.senderName,
      toRoom: client.meetingId,
    });
    
    // Broadcast to entire room (including sender)
    this.server.to(client.meetingId).emit('chat:message', broadcastData);

  } catch (error) {
    console.error('❌ Error saving chat message:', error);
    client.emit('chat:error', { message: 'Failed to send message' });
  }
}

  @SubscribeMessage('youtube:play')
  async handleYouTubePlay(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { videoId?: string; currentTime: number },
  ) {
    if (!client.meetingId) return;

    // Update meeting
    await this.meetingRepository.update(
      { id: client.meetingId },
      {
        youtube_video_id: data.videoId,
        youtube_current_time: data.currentTime,
        youtube_is_playing: true,
      },
    );

    // Broadcast to all
    this.server.to(client.meetingId).emit('youtube:play', {
      videoId: data.videoId,
      currentTime: data.currentTime,
      userId: client.user?.id,
    });
  }

  @SubscribeMessage('youtube:pause')
  async handleYouTubePause(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { currentTime: number },
  ) {
    if (!client.meetingId) return;

    // Update meeting
    await this.meetingRepository.update(
      { id: client.meetingId },
      {
        youtube_current_time: data.currentTime,
        youtube_is_playing: false,
      },
    );

    // Broadcast to all
    this.server.to(client.meetingId).emit('youtube:pause', {
      currentTime: data.currentTime,
      userId: client.user?.id,
    });
  }

  @SubscribeMessage('youtube:seek')
  async handleYouTubeSeek(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { currentTime: number },
  ) {
    if (!client.meetingId) return;

    // Update meeting
    await this.meetingRepository.update(
      { id: client.meetingId },
      { youtube_current_time: data.currentTime },
    );

    // Broadcast to all
    this.server.to(client.meetingId).emit('youtube:seek', {
      currentTime: data.currentTime,
      userId: client.user?.id,
    });
  }

  @SubscribeMessage('youtube:clear')
  async handleYouTubeClear(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId) return;

    console.log('❌ [YouTube] Host clearing video');

    // Update meeting - clear video
    await this.meetingRepository.update(
      { id: client.meetingId },
      {
        youtube_video_id: null,
        youtube_current_time: 0,
        youtube_is_playing: false,
      },
    );

    // Broadcast to all participants (excluding host)
    client.to(client.meetingId).emit('youtube:clear');
  }

  @SubscribeMessage('hand:raise')
  async handleRaiseHand(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.user) return;

    // Update participant
    await this.participantRepository.update(
      {
        meeting: { id: client.meetingId },
        user: { id: client.user.id },
      },
      { is_hand_raised: true },
    );

    // Notify all
    this.server.to(client.meetingId).emit('hand:raised', {
      userId: client.user.id,
      userName: client.user.username,
    });
  }

  @SubscribeMessage('hand:lower')
  async handleLowerHand(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId || !client.user) return;

    // Update participant
    await this.participantRepository.update(
      {
        meeting: { id: client.meetingId },
        user: { id: client.user.id },
      },
      { is_hand_raised: false },
    );

    // Notify all
    this.server.to(client.meetingId).emit('hand:lowered', {
      userId: client.user.id,
    });
  }
}

