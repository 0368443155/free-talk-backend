import {
    Controller,
    Post,
    Body,
    Headers,
    Logger,
    Get,
    Param,
    Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingStatus } from '../features/meeting/entities/meeting.entity';
import { MeetingParticipant } from '../features/meeting/entities/meeting-participant.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { LiveKitEventDetail, LiveKitEventType, TrackType, TrackSource } from './entities/livekit-event-detail.entity';

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
        @InjectRepository(WebhookEvent)
        private webhookEventRepo: Repository<WebhookEvent>,
        @InjectRepository(LiveKitEventDetail)
        private eventDetailRepo: Repository<LiveKitEventDetail>,
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
        @Req() req: RawBodyRequest<Request>,
        @Body() body: any,
        @Headers('authorization') authHeader: string,
        @Headers() allHeaders?: Record<string, string | string[]>,
    ) {
        this.logger.log(`🔔 ========== WEBHOOK RECEIVED ==========`);
        this.logger.log(`📥 Timestamp: ${new Date().toISOString()}`);
        
        // Try to get body from multiple sources
        let actualBody = body;
        
        // If body is undefined, try to get from rawBody (if available)
        if (!actualBody && req.rawBody) {
            try {
                actualBody = JSON.parse(req.rawBody.toString());
                this.logger.log(`📥 Got body from rawBody (${req.rawBody.length} bytes)`);
            } catch (e) {
                this.logger.warn(`⚠️ Failed to parse rawBody: ${e.message}`);
            }
        }
        
        // If still undefined, try to get from request body directly
        if (!actualBody && (req as any).body) {
            actualBody = (req as any).body;
            this.logger.log(`📥 Got body from req.body`);
        }
        
        // Check if body is empty or undefined
        const bodyIsEmpty = !actualBody || (typeof actualBody === 'object' && Object.keys(actualBody).length === 0);
        this.logger.log(`📥 Body is empty/undefined: ${bodyIsEmpty}`);
        this.logger.log(`📥 Body type: ${typeof actualBody}`);
        this.logger.log(`📥 Body keys: ${actualBody ? Object.keys(actualBody).join(', ') : 'N/A'}`);
        this.logger.log(`📥 Auth header: ${authHeader ? 'Present' : 'Missing'}`);
        this.logger.log(`📥 Content-Type: ${req.headers['content-type'] || 'N/A'}`);
        this.logger.log(`📥 Content-Length: ${req.headers['content-length'] || 'N/A'}`);
        this.logger.log(`📥 All headers: ${JSON.stringify(Object.keys(allHeaders || {}))}`);
        
        // CRITICAL: Always log full body for debugging unknown events
        this.logger.log(`📥 FULL RAW WEBHOOK BODY (for debugging):`);
        this.logger.log(JSON.stringify(actualBody, null, 2));
        
        // CRITICAL: Save raw body IMMEDIATELY before any parsing
        // This ensures we always have the original data from LiveKit
        // If body is empty, save metadata about the request instead
        let rawBodyString: string;
        if (bodyIsEmpty) {
            // Save request metadata when body is empty
            rawBodyString = JSON.stringify({
                _empty: true,
                _timestamp: new Date().toISOString(),
                _headers: Object.keys(allHeaders || {}),
                _hasAuth: !!authHeader,
                _bodyType: typeof actualBody,
                _bodyValue: actualBody,
                _contentType: req.headers['content-type'],
                _contentLength: req.headers['content-length'],
                _rawBodyAvailable: !!req.rawBody,
                _rawBodyLength: req.rawBody ? req.rawBody.length : 0,
            });
            this.logger.warn(`⚠️ WARNING: Webhook body is empty! Saving request metadata instead.`);
        } else {
            rawBodyString = JSON.stringify(actualBody);
        }
        this.logger.log(`💾 Raw body stringified (${rawBodyString.length} chars):`, rawBodyString.substring(0, 500));
        
        try {
            // Log raw body for debugging (especially for test events)
            this.logger.log(`📥 Raw webhook body:`, JSON.stringify(body, null, 2));

            // Verify webhook signature để đảm bảo request từ LiveKit
            let event: any;
            try {
                // Use actualBody instead of body
                const bodyString = actualBody ? JSON.stringify(actualBody) : (req.rawBody ? req.rawBody.toString() : '{}');
                event = await this.webhookReceiver.receive(
                    bodyString,
                    authHeader,
                );
                this.logger.log(`✅ Webhook signature verified successfully`);
                this.logger.log(`📨 Parsed event keys: ${Object.keys(event || {}).join(', ')}`);
                this.logger.log(`📨 Event.event property: ${event?.event || 'NOT FOUND'}`);
                // Log full parsed event structure
                this.logger.log(`📨 Full parsed event:`, JSON.stringify(event, null, 2));
            } catch (verifyError: any) {
                // Test events might not have proper signature - handle gracefully
                this.logger.warn(`⚠️ Webhook signature verification failed: ${verifyError.message}`);
                this.logger.warn(`⚠️ This might be a test event or unverified webhook. Attempting to parse anyway...`);
                
                // Try to parse as test event or direct event
                if (actualBody && (actualBody.event || actualBody.test)) {
                    event = actualBody;
                    this.logger.log(`📨 Received webhook (test/unverified): ${event.event || 'test'}`);
                } else {
                    // Try to detect event type from body structure
                    let detectedEventType = 'unknown';
                    
                    // Check for common LiveKit webhook patterns
                    if (actualBody?.room && actualBody?.participant) {
                        // Could be participant_joined, participant_left, track_published, etc.
                        if (actualBody?.track) {
                            detectedEventType = actualBody?.track?.muted === false ? 'track_published' : 'track_unpublished';
                        } else if (actualBody?.participant?.state === 'ACTIVE') {
                            detectedEventType = 'participant_joined';
                        } else {
                            detectedEventType = 'participant_left';
                        }
                    } else if (actualBody?.room && !actualBody?.participant) {
                        // Room-level events
                        if (actualBody?.room?.num_participants === 0) {
                            detectedEventType = 'room_finished';
                        } else {
                            detectedEventType = 'room_started';
                        }
                    } else if (actualBody?.test === true || actualBody?.type === 'test') {
                        detectedEventType = 'test';
                    }
                    
                    this.logger.log(`🔍 Detected event type from body structure: ${detectedEventType}`);
                    this.logger.debug(`📋 Full body structure:`, JSON.stringify(actualBody, null, 2));
                    
                    event = {
                        event: detectedEventType,
                        ...actualBody,
                    };
                    this.logger.log(`📨 Created event object with detected type: ${detectedEventType}`);
                }
            }

            // Ensure event is defined
            if (!event) {
                this.logger.error(`❌ Event is undefined after parsing!`);
                this.logger.error(`❌ Original body:`, JSON.stringify(actualBody, null, 2));
                this.logger.error(`❌ Body is empty: ${bodyIsEmpty}`);
                
                // Use original body if available, otherwise create minimal object with metadata
                if (actualBody && typeof actualBody === 'object' && !bodyIsEmpty) {
                    event = actualBody;
                    this.logger.log(`📨 Using original body as event object`);
                } else {
                    // Create event with metadata about empty request
                    event = { 
                        event: 'unknown',
                        _emptyBody: true,
                        _timestamp: new Date().toISOString(),
                        _hasAuth: !!authHeader,
                    };
                    this.logger.error(`❌ Body is empty or invalid, created fallback with metadata`);
                }
            }

            // Extract event type with better fallback logic
            // LiveKit webhookReceiver.receive() returns an object with 'event' property
            let eventType = event?.event;
            
            // If event type is still not found, try actualBody
            if (!eventType) {
                eventType = actualBody?.event;
                this.logger.log(`🔍 Event type from actualBody.event: ${eventType || 'NOT FOUND'}`);
            }
            
            // If still unknown, try to infer from event structure
            if (!eventType || eventType === 'unknown') {
                this.logger.log(`🔍 Attempting to infer event type from structure...`);
                this.logger.log(`🔍 Event has room: ${!!event?.room}, participant: ${!!event?.participant}, track: ${!!event?.track}`);
                
                if (event?.room && event?.participant && event?.track) {
                    // Track events - check if published or unpublished
                    const trackState = event.track?.muted !== undefined ? (event.track.muted ? 'unpublished' : 'published') : 'published';
                    eventType = `track_${trackState}`;
                } else if (event?.room && event?.participant) {
                    // Participant events - check state or default to joined
                    if (event.participant?.state === 'ACTIVE' || event.participant?.joined_at) {
                        eventType = 'participant_joined';
                    } else {
                        eventType = 'participant_left';
                    }
                } else if (event?.room) {
                    // Room events - check participant count
                    if (event.room?.num_participants === 0 || event.room?.empty === true) {
                        eventType = 'room_finished';
                    } else {
                        eventType = 'room_started';
                    }
                } else {
                    eventType = 'unknown';
                }
                this.logger.log(`🔍 Inferred event type: ${eventType}`);
            }

            this.logger.log(`📨 Received LiveKit webhook: ${eventType}`);
            this.logger.debug(`Event data:`, JSON.stringify(event, null, 2));
            const isTestEvent = eventType === 'test' || 
                               eventType === 'webhook_test' || 
                               actualBody?.test === true ||
                               (!event?.room && !actualBody?.room); // Test events usually don't have room data

            // Create webhook event record (will save after processing)
            this.logger.log(`📝 Creating webhook event record...`);
            
            // CRITICAL: Use the raw body we saved at the beginning, NOT the parsed event
            // This ensures we always have the original data from LiveKit Cloud
            this.logger.log(`💾 Using RAW body saved at start (${rawBodyString.length} chars)`);
            this.logger.log(`💾 Raw body preview:`, rawBodyString.substring(0, 500));
            
            const webhookEvent = this.webhookEventRepo.create({
                event: eventType,
                roomName: event?.room?.name || actualBody?.room?.name || null,
                participantIdentity: event?.participant?.identity || actualBody?.participant?.identity || null,
                eventData: rawBodyString, // Use the raw body saved at the start, NOT parsed event
                isTestEvent: isTestEvent,
                processed: false,
            });
            this.logger.log(`📝 Webhook event created: Event=${webhookEvent.event}, Room=${webhookEvent.roomName}, IsTest=${webhookEvent.isTestEvent}`);

            // Handle test events specially
            if (isTestEvent) {
                this.logger.log(`🧪 Test webhook received - webhook endpoint is working!`);
                webhookEvent.processed = true;
                webhookEvent.errorMessage = null;
                
                // Save test event with error handling
                try {
                    const saved = await this.webhookEventRepo.save(webhookEvent);
                    this.logger.log(`💾 ✅ Saved test webhook event to database: ID=${saved.id}, Event=${saved.event}`);
                } catch (saveError: any) {
                    this.logger.error(`❌ Failed to save test webhook event: ${saveError.message}`, saveError.stack);
                    // Still return success to prevent LiveKit from retrying
                }
                
                return {
                    success: true,
                    event: 'test',
                    message: 'Webhook endpoint is accessible and working',
                    timestamp: new Date().toISOString()
                };
            }

            // Route to appropriate handler for real events
            let savedWebhookEvent: WebhookEvent | null = null;
            try {
                switch (eventType) {
                    case 'room_started':
                        await this.handleRoomStarted(event);
                        webhookEvent.processed = true;
                        break;

                    case 'room_finished':
                        await this.handleRoomFinished(event);
                        webhookEvent.processed = true;
                        break;

                    case 'participant_joined':
                        await this.handleParticipantJoined(event);
                        webhookEvent.processed = true;
                        break;

                    case 'participant_left':
                        await this.handleParticipantLeft(event);
                        webhookEvent.processed = true;
                        break;

                    case 'track_published':
                        await this.handleTrackPublished(event);
                        webhookEvent.processed = true;
                        break;

                    case 'track_unpublished':
                        await this.handleTrackUnpublished(event);
                        webhookEvent.processed = true;
                        break;

                    default:
                        this.logger.warn(`⚠️ Unhandled event type: ${eventType}`);
                        this.logger.debug(`Full event data:`, JSON.stringify(event, null, 2));
                        webhookEvent.processed = false;
                        webhookEvent.errorMessage = `Unhandled event type: ${eventType}`;
                }
            } catch (handlerError: any) {
                this.logger.error(`❌ Error handling event ${eventType}:`, handlerError.message);
                this.logger.error(`❌ Error stack:`, handlerError.stack);
                webhookEvent.processed = false;
                webhookEvent.errorMessage = handlerError.message || handlerError.toString();
            } finally {
                // Always save webhook event to database (even if processing failed)
                try {
                    savedWebhookEvent = await this.webhookEventRepo.save(webhookEvent);
                    this.logger.log(`💾 ✅ Saved webhook event to database: ID=${savedWebhookEvent.id}, Event=${savedWebhookEvent.event}, Processed=${savedWebhookEvent.processed}`);
                    if (savedWebhookEvent.errorMessage) {
                        this.logger.warn(`⚠️ Event had error: ${savedWebhookEvent.errorMessage}`);
                    }
                } catch (saveError: any) {
                    // Critical: If we can't save, log extensively
                    this.logger.error(`❌ CRITICAL: Failed to save webhook event to database!`);
                    this.logger.error(`❌ Save error: ${saveError.message}`, saveError.stack);
                    this.logger.error(`❌ Event data that failed to save:`, {
                        event: webhookEvent.event,
                        roomName: webhookEvent.roomName,
                        participantIdentity: webhookEvent.participantIdentity,
                        isTestEvent: webhookEvent.isTestEvent,
                        processed: webhookEvent.processed,
                        errorMessage: webhookEvent.errorMessage,
                    });
                    // Try to save a minimal record
                    try {
                        const minimalEvent = this.webhookEventRepo.create({
                            event: webhookEvent.event || 'unknown',
                            roomName: webhookEvent.roomName,
                            participantIdentity: webhookEvent.participantIdentity,
                            eventData: `Save failed: ${saveError.message}`,
                            isTestEvent: webhookEvent.isTestEvent,
                            processed: false,
                            errorMessage: `Database save error: ${saveError.message}`,
                        });
                        await this.webhookEventRepo.save(minimalEvent);
                        this.logger.log(`💾 ✅ Saved minimal webhook event record as fallback`);
                    } catch (fallbackError: any) {
                        this.logger.error(`❌ CRITICAL: Even fallback save failed! ${fallbackError.message}`);
                    }
                }

                // Save event detail after webhook event is saved (so we have the ID)
                if (savedWebhookEvent && !isTestEvent) {
                    try {
                        const eventTypeMap: Record<string, LiveKitEventType> = {
                            'room_started': LiveKitEventType.ROOM_STARTED,
                            'room_finished': LiveKitEventType.ROOM_FINISHED,
                            'participant_joined': LiveKitEventType.PARTICIPANT_JOINED,
                            'participant_left': LiveKitEventType.PARTICIPANT_LEFT,
                            'track_published': LiveKitEventType.TRACK_PUBLISHED,
                            'track_unpublished': LiveKitEventType.TRACK_UNPUBLISHED,
                        };
                        
                        const detailEventType = eventTypeMap[eventType];
                        if (detailEventType) {
                            await this.saveEventDetail(detailEventType, event, savedWebhookEvent.id);
                        }
                    } catch (detailError: any) {
                        this.logger.error(`❌ Failed to save event detail: ${detailError.message}`);
                        // Don't fail the whole webhook if detail save fails
                    }
                }
            }

            return {
                success: true,
                event: eventType,
                timestamp: new Date().toISOString()
            };

        } catch (error: any) {
            this.logger.error(`❌ Webhook processing failed: ${error.message}`, error.stack);
            this.logger.error(`❌ Error details:`, {
                message: error.message,
                stack: error.stack,
                body: JSON.stringify(body, null, 2)
            });

            // Try to save error event to database for debugging
            try {
                const errorEvent = this.webhookEventRepo.create({
                    event: actualBody?.event || 'error',
                    roomName: actualBody?.room?.name || null,
                    participantIdentity: actualBody?.participant?.identity || null,
                    eventData: JSON.stringify({ error: error.message, body: actualBody }),
                    isTestEvent: false,
                    processed: false,
                    errorMessage: `Webhook processing failed: ${error.message}`,
                });
                await this.webhookEventRepo.save(errorEvent);
                this.logger.log(`💾 ✅ Saved error webhook event to database: ID=${errorEvent.id}`);
            } catch (saveError: any) {
                this.logger.error(`❌ CRITICAL: Failed to save error event: ${saveError.message}`);
            }

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
     * Extract meeting ID from LiveKit room name
     * Room name format: "meeting-{meetingId}" or just "{meetingId}"
     */
    private extractMeetingId(roomName: string): string {
        // Remove "meeting-" prefix if present
        if (roomName.startsWith('meeting-')) {
            return roomName.replace('meeting-', '');
        }
        return roomName;
    }

    /**
     * Helper method to save event detail to database
     */
    private async saveEventDetail(
        eventType: LiveKitEventType,
        event: any,
        webhookEventId?: number,
    ): Promise<void> {
        try {
            const room = event?.room;
            const participant = event?.participant;
            const track = event?.track;
            const roomName = room?.name;
            const meetingId = roomName ? this.extractMeetingId(roomName) : null;

            // Extract participant user ID from identity (assuming identity is user ID)
            const participantIdentity = participant?.identity;
            let participantUserId: string | null = null;
            if (participantIdentity) {
                // Try to find user by identity (could be user ID or email)
                try {
                    // If identity looks like UUID, use it directly
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (uuidRegex.test(participantIdentity)) {
                        participantUserId = participantIdentity;
                    }
                } catch (e) {
                    // Ignore errors
                }
            }

            const eventDetail = this.eventDetailRepo.create({
                event_type: eventType,
                meeting_id: meetingId,
                room_name: roomName,
                participant_identity: participantIdentity,
                participant_user_id: participantUserId,
                participant_name: participant?.name || null,
                track_type: track?.type ? (track.type as TrackType) : null,
                track_source: track?.source ? (track.source as TrackSource) : null,
                track_sid: track?.sid || null,
                track_muted: track?.muted ?? null,
                room_num_participants: room?.num_participants ?? null,
                room_duration_seconds: room?.duration ?? null,
                event_data: event, // Save full event data as JSON
                webhook_event_id: webhookEventId || null,
            });

            await this.eventDetailRepo.save(eventDetail);
            this.logger.log(`💾 ✅ Saved event detail: ${eventType} for meeting ${meetingId || 'N/A'}`);
        } catch (error: any) {
            this.logger.error(`❌ Failed to save event detail: ${error.message}`, error.stack);
            // Don't throw - we still want to process the webhook even if detail save fails
        }
    }

    /**
     * Handle room_started event
     * Được gọi khi room được tạo trên LiveKit server
     */
    private async handleRoomStarted(event: any) {
        const { room } = event;
        const roomName = room.name;
        const meetingId = this.extractMeetingId(roomName);

        this.logger.log(`🎬 Room started: ${roomName} (meeting ID: ${meetingId})`);

        try {
            // Tìm meeting trong database bằng ID (extract từ room name)
            const meeting = await this.meetingRepo.findOne({
                where: { id: meetingId }
            });

            if (meeting) {
                // Update meeting status
                meeting.status = MeetingStatus.LIVE;
                meeting.started_at = new Date();
                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated meeting ${meetingId} to LIVE status`);
            } else {
                this.logger.warn(`⚠️ Meeting ${meetingId} not found in database (room name: ${roomName})`);
                // Log available meetings for debugging
                const recentMeetings = await this.meetingRepo.find({
                    take: 5,
                    order: { created_at: 'DESC' }
                });
                this.logger.debug(`Recent meetings:`, recentMeetings.map(m => m.id));
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
        const meetingId = this.extractMeetingId(roomName);
        const duration = room.duration; // Duration in seconds

        this.logger.log(`🏁 Room finished: ${roomName} (meeting ID: ${meetingId}), duration: ${duration}s`);

        try {
            const meeting = await this.meetingRepo.findOne({
                where: { id: meetingId }
            });

            if (meeting) {
                // Update meeting status
                meeting.status = MeetingStatus.ENDED;
                meeting.ended_at = new Date();
                meeting.current_participants = 0;
                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated meeting ${meetingId} to ENDED status`);
            } else {
                this.logger.warn(`⚠️ Meeting ${meetingId} not found in database (room name: ${roomName})`);
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
        const meetingId = this.extractMeetingId(roomName);
        const participantIdentity = participant.identity;
        const participantName = participant.name || participantIdentity;

        this.logger.log(`👤 Participant joined: ${participantName} (${participantIdentity}) in room ${roomName} (meeting ID: ${meetingId})`);

        try {
            const meeting = await this.meetingRepo.findOne({
                where: { id: meetingId }
            });

            if (meeting) {
                // Increment current participants count
                meeting.current_participants = (meeting.current_participants || 0) + 1;

                // Update total participants if needed
                if (meeting.current_participants > meeting.total_participants) {
                    meeting.total_participants = meeting.current_participants;
                }

                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated participant count for ${meetingId}: ${meeting.current_participants}`);
            } else {
                this.logger.warn(`⚠️ Meeting ${meetingId} not found in database (room name: ${roomName})`);
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
        const meetingId = this.extractMeetingId(roomName);
        const participantIdentity = participant.identity;
        const participantName = participant.name || participantIdentity;

        this.logger.log(`👋 Participant left: ${participantName} (${participantIdentity}) from room ${roomName} (meeting ID: ${meetingId})`);

        try {
            const meeting = await this.meetingRepo.findOne({
                where: { id: meetingId }
            });

            if (meeting) {
                // Decrement current participants count
                meeting.current_participants = Math.max(0, (meeting.current_participants || 0) - 1);
                await this.meetingRepo.save(meeting);

                this.logger.log(`✅ Updated participant count for ${meetingId}: ${meeting.current_participants}`);
            } else {
                this.logger.warn(`⚠️ Meeting ${meetingId} not found in database (room name: ${roomName})`);
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

    /**
     * Get recent webhook events for debugging
     */
    @Get('events')
    async getRecentEvents() {
        try {
            const events = await this.webhookEventRepo.find({
                order: { createdAt: 'DESC' },
                take: 50,
            });

            return {
                success: true,
                count: events.length,
                events: events.map(e => ({
                    id: e.id,
                    event: e.event,
                    roomName: e.roomName,
                    participantIdentity: e.participantIdentity,
                    isTestEvent: e.isTestEvent,
                    processed: e.processed,
                    errorMessage: e.errorMessage,
                    createdAt: e.createdAt,
                    // Include raw event data for debugging
                    eventData: e.eventData ? JSON.parse(e.eventData) : null,
                })),
            };
        } catch (error: any) {
            this.logger.error(`Failed to get webhook events: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get raw event data for a specific webhook event (for debugging)
     */
    @Get('events/:id/raw')
    async getRawEventData(@Param('id') id: number) {
        try {
            const event = await this.webhookEventRepo.findOne({
                where: { id },
            });

            if (!event) {
                return {
                    success: false,
                    error: 'Event not found',
                };
            }

            return {
                success: true,
                event: {
                    id: event.id,
                    event: event.event,
                    roomName: event.roomName,
                    participantIdentity: event.participantIdentity,
                    isTestEvent: event.isTestEvent,
                    processed: event.processed,
                    errorMessage: event.errorMessage,
                    createdAt: event.createdAt,
                    // Raw event data as parsed JSON
                    rawEventData: event.eventData ? JSON.parse(event.eventData) : null,
                },
            };
        } catch (error: any) {
            this.logger.error(`Failed to get raw event data: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get webhook event statistics
     */
    @Get('stats')
    async getWebhookStats() {
        try {
            const totalEvents = await this.webhookEventRepo.count();
            const processedEvents = await this.webhookEventRepo.count({ where: { processed: true } });
            const testEvents = await this.webhookEventRepo.count({ where: { isTestEvent: true } });
            const failedEvents = await this.webhookEventRepo.count({ where: { processed: false, isTestEvent: false } });

            const eventsByType = await this.webhookEventRepo
                .createQueryBuilder('event')
                .select('event.event', 'eventType')
                .addSelect('COUNT(*)', 'count')
                .groupBy('event.event')
                .orderBy('count', 'DESC')
                .getRawMany();

            const recentEvents = await this.webhookEventRepo.find({
                order: { createdAt: 'DESC' },
                take: 10,
            });

            return {
                success: true,
                statistics: {
                    total: totalEvents,
                    processed: processedEvents,
                    failed: failedEvents,
                    testEvents: testEvents,
                    successRate: totalEvents > 0 ? ((processedEvents / totalEvents) * 100).toFixed(2) + '%' : '0%',
                },
                eventsByType,
                recentEvents: recentEvents.map(e => ({
                    event: e.event,
                    roomName: e.roomName,
                    processed: e.processed,
                    createdAt: e.createdAt,
                })),
            };
        } catch (error: any) {
            this.logger.error(`Failed to get webhook stats: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
