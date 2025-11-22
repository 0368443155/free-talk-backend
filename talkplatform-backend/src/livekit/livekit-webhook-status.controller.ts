import {
    Controller,
    Get,
    Logger,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import axios from 'axios';

/**
 * LiveKit Webhook Status Controller
 * 
 * Kiểm tra và cung cấp thông tin về webhook configuration
 */
@ApiTags('LiveKit Webhook')
@Controller('livekit/webhook-status')
export class LiveKitWebhookStatusController {
    private readonly logger = new Logger(LiveKitWebhookStatusController.name);

    /**
     * Get current ngrok tunnel URL
     */
    @Get('ngrok-url')
    @ApiOperation({ summary: 'Get current ngrok tunnel URL' })
    @ApiResponse({ status: 200, description: 'Ngrok URL retrieved successfully' })
    async getNgrokUrl() {
        try {
            // Try to get ngrok URL from local ngrok API
            const response = await axios.get('http://localhost:4040/api/tunnels', {
                timeout: 3000,
            });

            const tunnels = response.data?.tunnels || [];
            
            if (tunnels.length === 0) {
                return {
                    success: false,
                    message: 'No ngrok tunnels found. Make sure ngrok is running.',
                    url: null,
                };
            }

            // Find HTTPS tunnel (preferred)
            const httpsTunnel = tunnels.find((t: any) => t.proto === 'https');
            const tunnel = httpsTunnel || tunnels[0];

            const publicUrl = tunnel.public_url;
            const webhookUrl = `${publicUrl}/webhooks/livekit`;

            return {
                success: true,
                ngrokUrl: publicUrl,
                webhookUrl: webhookUrl,
                tunnel: {
                    name: tunnel.name,
                    proto: tunnel.proto,
                    config: tunnel.config,
                },
                instructions: {
                    step1: 'Copy the webhookUrl above',
                    step2: 'Go to https://cloud.livekit.io/projects/p_3fki8uttl2h/settings',
                    step3: 'Find "Webhooks" section',
                    step4: `Paste this URL: ${webhookUrl}`,
                    step5: 'Enable these events: room_started, room_finished, participant_joined, participant_left, track_published, track_unpublished',
                    step6: 'Save and test by joining a meeting',
                },
            };
        } catch (error: any) {
            this.logger.error(`Failed to get ngrok URL: ${error.message}`);
            
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    message: 'Ngrok is not running. Start ngrok with: ngrok http 3000',
                    url: null,
                    error: 'ECONNREFUSED',
                };
            }

            return {
                success: false,
                message: 'Failed to get ngrok URL',
                error: error.message,
                url: null,
            };
        }
    }

    /**
     * Test webhook endpoint accessibility
     */
    @Get('test')
    @ApiOperation({ summary: 'Test webhook endpoint' })
    @ApiResponse({ status: 200, description: 'Webhook endpoint is accessible' })
    async testWebhook() {
        return {
            success: true,
            message: 'Webhook endpoint is accessible',
            endpoint: '/webhooks/livekit',
            timestamp: new Date().toISOString(),
            note: 'This endpoint is ready to receive webhooks from LiveKit Cloud',
        };
    }

    /**
     * Get webhook configuration instructions
     */
    @Get('instructions')
    @ApiOperation({ summary: 'Get webhook configuration instructions' })
    async getInstructions() {
        try {
            // Try to get current ngrok URL
            const ngrokInfo = await this.getNgrokUrl();
            
            return {
                instructions: {
                    title: 'How to configure LiveKit Cloud Webhook',
                    steps: [
                        {
                            step: 1,
                            action: 'Get current ngrok URL',
                            command: 'GET /livekit/webhook-status/ngrok-url',
                            result: ngrokInfo.success ? `Current URL: ${ngrokInfo.webhookUrl}` : 'Ngrok not running',
                        },
                        {
                            step: 2,
                            action: 'Open LiveKit Cloud Dashboard',
                            url: 'https://cloud.livekit.io/projects/p_3fki8uttl2h/settings',
                        },
                        {
                            step: 3,
                            action: 'Find "Webhooks" section',
                            description: 'Scroll down to find webhook configuration',
                        },
                        {
                            step: 4,
                            action: 'Update webhook URL',
                            description: ngrokInfo.success 
                                ? `Paste this URL: ${ngrokInfo.webhookUrl}`
                                : 'Get URL from step 1 first',
                        },
                        {
                            step: 5,
                            action: 'Enable webhook events',
                            events: [
                                'room_started',
                                'room_finished',
                                'participant_joined',
                                'participant_left',
                                'track_published',
                                'track_unpublished',
                            ],
                        },
                        {
                            step: 6,
                            action: 'Save configuration',
                            description: 'Click Save button',
                        },
                        {
                            step: 7,
                            action: 'Test webhook',
                            description: 'Join a meeting and check backend logs for webhook events',
                        },
                    ],
                },
                currentNgrokInfo: ngrokInfo,
                troubleshooting: {
                    'Ngrok URL changed': 'If ngrok restarts, the URL changes. Update it in LiveKit Cloud.',
                    'Webhook not receiving': 'Check if ngrok is running and URL is correct in LiveKit Cloud.',
                    '401 Unauthorized': 'Check LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env',
                    '404 Not Found': 'Make sure backend is running and /webhooks/livekit endpoint exists',
                },
            };
        } catch (error: any) {
            return {
                error: error.message,
                instructions: 'See troubleshooting section',
            };
        }
    }
}


