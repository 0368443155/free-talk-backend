import {
    Controller,
    Post,
    Body,
    Headers,
    Logger,
} from '@nestjs/common';
import { WebhookReceiver } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingStatus } from '../features/meeting/entities/meeting.entity';
import { MeetingParticipant } from '../features/meeting/entities/meeting-participant.entity';

/**
 * LiveKit Webhook Controller
 * 
 * Nhận và xử lý webhooks từ LiveKit Cloud để sync data real-time
 * 
 * Events được xử lý:
 * - room_started: Room được tạo
 * - room_finished: Room kết thúc
 * - participant_joined: User join room
 * - participant_left: User leave room
 * - track_published: Camera/mic được bật
 * - track_unpublished: Camera/mic được tắt
 */
@Controller('webhooks/livekit')
export class LiveKitWebhookController {
    private readonly logger = new Logger(LiveKitWebhookController.name);
    private readonly webhookReceiver: WebhookReceiver;

    constructor(
        private configService: ConfigService,
        @InjectRepository(Meeting)
        private meetingRepo: Repository<Meeting>,
        @InjectRepository(MeetingParticipant)
        private participantRepo: Repository<MeetingParticipant>,
    ) {
        const apiKey = this.configService.get<string>('LIVEKIT_API_KEY');
        const apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET');

        if (!apiKey || !apiSecret) {
            throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required for webhook verification');
        }

        this.webhookReceiver = new WebhookReceiver(apiKey, apiSecret);
    }

    @Post()
    async handleWebhook(
        @Body() body: any,
        @Headers('authorization') authHeader: string,
    ) {
        try {
            // Verify webhook signature để đảm bảo request từ LiveKit
            const event = await this.webhookReceiver.receive(
                JSON.stringify(body),
                authHeader,
            );

            this.logger.log(`📨 Received LiveKit webhook: ${event.event}`);
            this.logger.debug(`Event data:`, JSON.stringify(event, null, 2));

            // Route to appropriate handler
            switch (event.event) {
                case 'room_started':
                    await this.handleRoomStarted(event);
                    break;

                case 'room_finished':
                    await this.handleRoomFinished(event);
                    break;

                case 'participant_joined':
                    await this.handleParticipantJoined(event);
                    break;

                case 'participant_left':
                    await this.handleParticipantLeft(event);
                    break;

                case 'track_published':
                    await this.handleTrackPublished(event);
                    break;

                case 'track_unpublished':
                    await this.handleTrackUnpublished(event);
                    break;

                default:
                    this.logger.debug(`Unhandled event type: ${event.event}`);
            }

            return {
                success: true,
                event: event.event,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error(`❌ Webhook processing failed: ${error.message}`, error.stack);

            // Return 200 even on error to prevent LiveKit from retrying
            // Log the error for debugging
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Handle room_started event
     * Được gọi khi room được tạo trên LiveKit server
     */
    private async handleRoomStarted(event: any) {
        const { room } = event;
        const roomName = room.name;

        this.logger.log(`🎬 Room started: ${roomName}`);

        try {
            // Tìm meeting trong database bằng ID (room name = meeting ID)
            const meeting = await this.meetingRepo.findOne({
                where: { id: roomName }
            });

            if (meeting) {
                // Update meeting status
                meeting.status = MeetingStatus.LIVE;
                meeting.started_at = new Date();
                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated meeting ${roomName} to LIVE status`);
            } else {
                this.logger.warn(`⚠️ Meeting ${roomName} not found in database`);
                // Room có thể được tạo trực tiếp từ LiveKit mà không qua API của bạn
            }
        } catch (error) {
            this.logger.error(`Failed to handle room_started: ${error.message}`);
        }
    }

    /**
     * Handle room_finished event
     * Được gọi khi room kết thúc
     */
    private async handleRoomFinished(event: any) {
        const { room } = event;
        const roomName = room.name;
        const duration = room.duration; // Duration in seconds

        this.logger.log(`🏁 Room finished: ${roomName}, duration: ${duration}s`);

        try {
            const meeting = await this.meetingRepo.findOne({
                where: { id: roomName }
            });

            if (meeting) {
                // Update meeting status
                meeting.status = MeetingStatus.ENDED;
                meeting.ended_at = new Date();
                meeting.current_participants = 0;
                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated meeting ${roomName} to ENDED status`);
            }
        } catch (error) {
            this.logger.error(`Failed to handle room_finished: ${error.message}`);
        }
    }

    /**
     * Handle participant_joined event
     * Được gọi khi user join room
     */
    private async handleParticipantJoined(event: any) {
        const { room, participant } = event;
        const roomName = room.name;
        const participantIdentity = participant.identity;
        const participantName = participant.name || participantIdentity;

        this.logger.log(`👤 Participant joined: ${participantName} (${participantIdentity}) in room ${roomName}`);

        try {
            const meeting = await this.meetingRepo.findOne({
                where: { id: roomName }
            });

            if (meeting) {
                // Increment current participants count
                meeting.current_participants = (meeting.current_participants || 0) + 1;

                // Update total participants if needed
                if (meeting.current_participants > meeting.total_participants) {
                    meeting.total_participants = meeting.current_participants;
                }

                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated participant count for ${roomName}: ${meeting.current_participants}`);
            }
        } catch (error) {
            this.logger.error(`Failed to handle participant_joined: ${error.message}`);
        }
    }

    /**
     * Handle participant_left event
     * Được gọi khi user leave room
     */
    private async handleParticipantLeft(event: any) {
        const { room, participant } = event;
        const roomName = room.name;
        const participantIdentity = participant.identity;
        const participantName = participant.name || participantIdentity;

        this.logger.log(`👋 Participant left: ${participantName} (${participantIdentity}) from room ${roomName}`);

        try {
            const meeting = await this.meetingRepo.findOne({
                where: { id: roomName }
            });

            if (meeting) {
                // Decrement current participants count
                meeting.current_participants = Math.max(0, (meeting.current_participants || 0) - 1);
                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated participant count for ${roomName}: ${meeting.current_participants}`);
            }
        } catch (error) {
            this.logger.error(`Failed to handle participant_left: ${error.message}`);
        }
    }

    /**
     * Handle track_published event
     * Được gọi khi user bật camera hoặc mic
     */
    private async handleTrackPublished(event: any) {
        const { room, participant, track } = event;
        const roomName = room.name;
        const participantIdentity = participant.identity;
        const trackType = track.type; // 'audio' or 'video'
        const trackSource = track.source; // 'camera', 'microphone', 'screen_share'

        this.logger.log(
            `🎥 Track published: ${trackType} (${trackSource}) by ${participantIdentity} in room ${roomName}`
        );

        // This is where bandwidth starts counting on LiveKit Cloud
        // You can track this for analytics
        try {
            // Optional: Store track publish events for analytics
            // Example: Track when users enable camera vs mic only
            this.logger.debug(`Track details:`, {
                room: roomName,
                participant: participantIdentity,
                type: trackType,
                source: trackSource,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error(`Failed to handle track_published: ${error.message}`);
        }
    }

    /**
     * Handle track_unpublished event
     * Được gọi khi user tắt camera hoặc mic
     */
    private async handleTrackUnpublished(event: any) {
        const { room, participant, track } = event;
        const roomName = room.name;
        const participantIdentity = participant.identity;
        const trackType = track.type;
        const trackSource = track.source;

        this.logger.log(
            `🔇 Track unpublished: ${trackType} (${trackSource}) by ${participantIdentity} in room ${roomName}`
        );

        // Track when users disable camera/mic
        try {
            this.logger.debug(`Track unpublish details:`, {
                room: roomName,
                participant: participantIdentity,
                type: trackType,
                source: trackSource,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error(`Failed to handle track_unpublished: ${error.message}`);
        }
    }
}
