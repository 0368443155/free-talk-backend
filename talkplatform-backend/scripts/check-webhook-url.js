#!/usr/bin/env node

/**
 * Script to check current ngrok URL and provide webhook configuration instructions
 * 
 * Usage: node scripts/check-webhook-url.js
 */

const axios = require('axios');

const NGROK_API = 'http://localhost:4040/api/tunnels';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function getNgrokUrl() {
    try {
        console.log('🔍 Checking ngrok tunnels...\n');
        
        const response = await axios.get(NGROK_API, { timeout: 3000 });
        const tunnels = response.data?.tunnels || [];

        if (tunnels.length === 0) {
            console.log('❌ No ngrok tunnels found!\n');
            console.log('💡 Start ngrok with: ngrok http 3000\n');
            return null;
        }

        // Find HTTPS tunnel (preferred)
        const httpsTunnel = tunnels.find(t => t.proto === 'https');
        const tunnel = httpsTunnel || tunnels[0];

        const publicUrl = tunnel.public_url;
        const webhookUrl = `${publicUrl}/webhooks/livekit`;

        console.log('✅ Ngrok is running!\n');
        console.log('📋 Current Configuration:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Protocol: ${tunnel.proto}`);
        console.log(`   Public URL: ${publicUrl}`);
        console.log(`   Webhook URL: ${webhookUrl}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return webhookUrl;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Ngrok is not running!\n');
            console.log('💡 Start ngrok with: ngrok http 3000\n');
        } else {
            console.log(`❌ Error: ${error.message}\n`);
        }
        return null;
    }
}

async function testWebhookEndpoint(webhookUrl) {
    if (!webhookUrl) return false;

    try {
        console.log('🧪 Testing webhook endpoint...\n');
        const response = await axios.post(webhookUrl, { test: true }, {
            timeout: 5000,
            validateStatus: () => true, // Don't throw on any status
        });

        if (response.status === 200 || response.status === 400) {
            console.log('✅ Webhook endpoint is accessible!\n');
            return true;
        } else {
            console.log(`⚠️  Webhook returned status: ${response.status}\n`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Webhook test failed: ${error.message}\n`);
        return false;
    }
}

function printInstructions(webhookUrl) {
    if (!webhookUrl) {
        console.log('⚠️  Cannot provide instructions without ngrok URL\n');
        return;
    }

    console.log('📝 Configuration Instructions:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Open LiveKit Cloud Dashboard:');
    console.log('   https://cloud.livekit.io/projects/p_3fki8uttl2h/settings\n');
    console.log('2. Find "Webhooks" section (scroll down)\n');
    console.log('3. Update webhook URL:');
    console.log(`   ${webhookUrl}\n`);
    console.log('4. Enable these events:');
    console.log('   ✅ room_started');
    console.log('   ✅ room_finished');
    console.log('   ✅ participant_joined');
    console.log('   ✅ participant_left');
    console.log('   ✅ track_published');
    console.log('   ✅ track_unpublished\n');
    console.log('5. Click "Save"\n');
    console.log('6. Test by joining a meeting and check backend logs\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
    console.log('🚀 LiveKit Webhook URL Checker\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const webhookUrl = await getNgrokUrl();
    
    if (webhookUrl) {
        await testWebhookEndpoint(webhookUrl);
        printInstructions(webhookUrl);
        
        console.log('💡 Quick copy command:');
        console.log(`   echo "${webhookUrl}" | clip  # Windows`);
        console.log(`   echo "${webhookUrl}" | pbcopy  # macOS`);
        console.log(`   echo "${webhookUrl}" | xclip -selection clipboard  # Linux\n`);
    }
}

main().catch(console.error);


