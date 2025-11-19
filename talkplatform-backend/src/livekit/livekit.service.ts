import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

export interface LiveKitTokenRequest {
  room: string;
  identity: string;
  name?: string;
  metadata?: string;
  // Video grants (như UC-01 mô tả)
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  canUpdateOwnMetadata?: boolean;
  ingressAdmin?: boolean;
  hidden?: boolean;
  // Recorder/egress permissions
  recorder?: boolean;
  // Room management permissions
  roomCreate?: boolean;
  roomList?: boolean;
  roomRecord?: boolean;
  roomAdmin?: boolean;
}

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly wsUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET') || '';
    this.wsUrl = this.configService.get<string>('LIVEKIT_WS_URL') || 'ws://localhost:7880';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured');
    }
  }

  /**
   * UC-01: Generate LiveKit AccessToken with Video Grants
   * Theo đặc tả: JWT payload với video grants và metadata tùy chỉnh
   */
  async generateAccessToken(request: LiveKitTokenRequest): Promise<string> {
    const {
      room,
      identity,
      name,
      metadata,
      canPublish = true,
      canSubscribe = true,
      canPublishData = true,
      canUpdateOwnMetadata = true,
      ingressAdmin = false,
      hidden = false,
      recorder = false,
      roomCreate = false,
      roomList = false,
      roomRecord = false,
      roomAdmin = false,
    } = request;

    this.logger.debug(`Generating token for ${identity} in room ${room}`);

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name,
      // TTL - Time To Live (UC-01): Token hết hạn ngắn hạn để bảo mật
      ttl: '2h', // 2 giờ
      // Metadata chứa business context (role, org_unit, etc.)
      metadata,
    });

    // Video grants theo đặc tả UC-01
    const videoGrant: VideoGrant = {
      room,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData,
      canUpdateOwnMetadata,
      ingressAdmin,
      hidden,
      recorder,
      roomCreate,
      roomList,
      roomRecord,
      roomAdmin,
    };

    at.addGrant(videoGrant);

    const token = await at.toJwt();
    
    this.logger.log(`Token generated for ${identity} in room ${room} with grants:`, {
      canPublish,
      canSubscribe,
      canPublishData,
      hidden,
      room,
    });

    return token;
  }

  /**
   * Generate token for host - full permissions
   */
  async generateHostToken(room: string, identity: string, name?: string, metadata?: string): Promise<string> {
    return this.generateAccessToken({
      room,
      identity,
      name,
      metadata,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
      ingressAdmin: true,
      roomAdmin: true,
      roomRecord: true,
      hidden: false,
    });
  }

  /**
   * Generate token for regular participant
   */
  async generateParticipantToken(room: string, identity: string, name?: string, metadata?: string): Promise<string> {
    return this.generateAccessToken({
      room,
      identity,
      name,
      metadata,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: false,
      ingressAdmin: false,
      roomAdmin: false,
      hidden: false,
    });
  }

  /**
   * Generate token for waiting room participant - limited permissions
   * UC-03: Waiting Room - không thể publish cho đến khi được admit
   */
  async generateWaitingRoomToken(room: string, identity: string, name?: string, metadata?: string): Promise<string> {
    return this.generateAccessToken({
      room,
      identity,
      name,
      metadata,
      canPublish: false, // Không thể publish khi ở waiting room
      canSubscribe: false, // Không thể nghe/nhìn meeting content
      canPublishData: false, // Không thể chat
      canUpdateOwnMetadata: false,
      ingressAdmin: false,
      hidden: true, // Hidden để host không thấy trong main room
    });
  }

  /**
   * Generate token for AI agents/bots
   * UC-01: Hỗ trợ Non-human Actors
   */
  async generateBotToken(room: string, identity: string, name?: string): Promise<string> {
    return this.generateAccessToken({
      room,
      identity,
      name: name || 'AI Assistant',
      metadata: JSON.stringify({ type: 'bot', automated: true }),
      canPublish: true, // Bot có thể phát audio/video
      canSubscribe: true,
      canPublishData: true, // Bot có thể gửi chat/notifications
      canUpdateOwnMetadata: true,
      ingressAdmin: false,
      hidden: false, // Bot visible trong meeting
      recorder: true, // Bot có thể record nếu cần
    });
  }

  /**
   * Generate token for recording service
   * UC-11: Cloud Recording & Egress
   */
  async generateRecorderToken(room: string, identity?: string): Promise<string> {
    return this.generateAccessToken({
      room,
      identity: identity || `recorder-${Date.now()}`,
      name: 'Recording Service',
      metadata: JSON.stringify({ type: 'recorder', service: true }),
      canPublish: false,
      canSubscribe: true, // Cần subscribe để record
      canPublishData: false,
      canUpdateOwnMetadata: false,
      ingressAdmin: false,
      hidden: true, // Recorder ẩn, không hiện trong UI
      recorder: true,
      roomRecord: true,
    });
  }

  /**
   * Get LiveKit WebSocket URL for client connection
   */
  getWebSocketUrl(): string {
    return this.wsUrl;
  }

  /**
   * Validate token (for debugging/testing)
   */
  async validateToken(token: string): Promise<any> {
    try {
      // Note: LiveKit SDK không có built-in validate, 
      // nhưng ta có thể decode JWT để kiểm tra
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, this.apiSecret);
      return decoded;
    } catch (error) {
      this.logger.error('Token validation failed:', error.message);
      throw new Error('Invalid token');
    }
  }
}