/**
 * Phase 2: WebRTC Metrics Testing Script
 * Tests the MeetingMetricsGateway with simulated users
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const METRICS_NAMESPACE = '/meeting-metrics';
const NUM_USERS = 10;
const MEETING_ID = 'test-meeting-phase2-' + Date.now();
const TEST_DURATION = 60000; // 60 seconds

interface UserMetrics {
  uploadBitrate?: number;
  downloadBitrate?: number;
  latency?: number;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  usingRelay?: boolean;
  packetLoss?: number;
}

interface TestUser {
  id: string;
  socket: Socket;
  metricsSent: number;
  startTime: number;
  lastSentTime: number;
}

const users: TestUser[] = [];
let adminSocket: Socket | null = null;
let metricsReceived = 0;
let alertsReceived = 0;

// Simulate a user sending metrics
async function simulateUser(userId: string): Promise<TestUser> {
  const socket = io(`${SOCKET_URL}${METRICS_NAMESPACE}`, {
    auth: {
      userId,
    },
    transports: ['websocket', 'polling'],
  });

  const user: TestUser = {
    id: userId,
    socket,
    metricsSent: 0,
    startTime: Date.now(),
    lastSentTime: 0,
  };

  socket.on('connect', () => {
    console.log(`✅ User ${userId} connected`);
    
    // Simulate metrics every 10 seconds (throttled)
    const metricsInterval = setInterval(() => {
      const metrics: UserMetrics = {
        uploadBitrate: Math.random() * 1000 + 500, // 500-1500 kbps
        downloadBitrate: Math.random() * 2000 + 1000, // 1000-3000 kbps
        latency: Math.random() * 200 + 50, // 50-250 ms
        quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as any,
        usingRelay: Math.random() > 0.8, // 20% chance
        packetLoss: Math.random() * 5, // 0-5%
      };
      
      socket.emit('meeting:metrics', {
        meetingId: MEETING_ID,
        metrics,
        timestamp: Date.now(),
      });
      
      user.metricsSent++;
      user.lastSentTime = Date.now();
      
      console.log(`📊 User ${userId} sent metrics: ${metrics.quality}, relay: ${metrics.usingRelay}`);
    }, 10000); // 10 seconds
    
    // Cleanup interval on disconnect
    socket.on('disconnect', () => {
      clearInterval(metricsInterval);
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User ${userId} disconnected`);
  });

  socket.on('error', (error) => {
    console.error(`❌ User ${userId} error:`, error);
  });

  return user;
}

// Admin socket to receive broadcasts
function setupAdminSocket() {
  adminSocket = io(`${SOCKET_URL}${METRICS_NAMESPACE}`, {
    auth: {
      userId: 'admin',
    },
    transports: ['websocket', 'polling'],
  });

  adminSocket.on('connect', () => {
    console.log('✅ Admin connected');
    adminSocket?.emit('admin:subscribe');
  });

  adminSocket.on('meeting:metrics:update', (data: any) => {
    metricsReceived++;
    console.log(`📈 Admin received metrics update #${metricsReceived}:`, {
      meetingId: data.meetingId,
      userId: data.userId,
      quality: data.metrics.quality,
      latency: data.metrics.latency,
    });
  });

  adminSocket.on('meeting:alerts', (data: any) => {
    alertsReceived++;
    console.log(`🚨 Admin received alert #${alertsReceived}:`, {
      meetingId: data.meetingId,
      userId: data.userId,
      alerts: data.alerts,
    });
  });

  adminSocket.on('disconnect', () => {
    console.log('❌ Admin disconnected');
  });
}

// Main test function
async function runTest() {
  console.log('🚀 Starting Phase 2 WebRTC Metrics Test');
  console.log('==========================================');
  console.log(`Meeting ID: ${MEETING_ID}`);
  console.log(`Number of users: ${NUM_USERS}`);
  console.log(`Test duration: ${TEST_DURATION / 1000}s`);
  console.log('');

  // Setup admin socket
  setupAdminSocket();

  // Wait for admin to connect
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create users
  console.log('Creating users...');
  for (let i = 0; i < NUM_USERS; i++) {
    const userId = `user-${i}`;
    const user = await simulateUser(userId);
    users.push(user);
    await new Promise(resolve => setTimeout(resolve, 100)); // Stagger connections
  }

  console.log(`✅ All ${NUM_USERS} users created`);
  console.log('');

  // Run test for specified duration
  console.log('⏳ Running test...');
  await new Promise(resolve => setTimeout(resolve, TEST_DURATION));

  // Collect statistics
  console.log('');
  console.log('📊 Test Results:');
  console.log('==========================================');
  
  const totalMetricsSent = users.reduce((sum, u) => sum + u.metricsSent, 0);
  const avgMetricsPerUser = totalMetricsSent / NUM_USERS;
  const testDurationMinutes = TEST_DURATION / 60000;
  const metricsPerMinute = avgMetricsPerUser / testDurationMinutes;
  
  console.log(`Total metrics sent: ${totalMetricsSent}`);
  console.log(`Average per user: ${avgMetricsPerUser.toFixed(2)}`);
  console.log(`Metrics per user per minute: ${metricsPerMinute.toFixed(2)}`);
  console.log(`✅ Target: < 10 metrics/user/minute (${metricsPerMinute < 10 ? 'PASS' : 'FAIL'})`);
  console.log('');
  
  console.log(`Metrics updates received by admin: ${metricsReceived}`);
  console.log(`Alerts received by admin: ${alertsReceived}`);
  console.log('');

  // Per-user statistics
  console.log('Per-user statistics:');
  users.forEach(user => {
    const duration = (Date.now() - user.startTime) / 1000;
    const rate = user.metricsSent / (duration / 60);
    console.log(`  ${user.id}: ${user.metricsSent} metrics, ${rate.toFixed(2)}/min`);
  });
  console.log('');

  // Cleanup
  console.log('🧹 Cleaning up...');
  users.forEach(user => {
    user.socket.disconnect();
  });
  adminSocket?.disconnect();
  
  console.log('');
  console.log('✅ Test completed!');
  
  // Final verdict
  if (metricsPerMinute < 10) {
    console.log('✅ PASS: Metrics rate is within target (< 10/user/minute)');
    process.exit(0);
  } else {
    console.log('❌ FAIL: Metrics rate exceeds target (>= 10/user/minute)');
    process.exit(1);
  }
}

// Run test
runTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

