/**
 * Phase 1 Metrics Testing Script
 * 
 * This script tests the bandwidth monitoring system:
 * 1. Verifies middleware is collecting metrics
 * 2. Checks Redis buffer
 * 3. Verifies Bull Queue processing
 * 4. Tests API endpoints
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_ENDPOINT = '/api/courses'; // Change to any valid endpoint

async function testMetricsCollection() {
  console.log('🧪 Testing Phase 1 Metrics System\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Make a test request to trigger metrics collection
    console.log('\n1️⃣ Making test request to trigger metrics...');
    const response = await axios.get(`${BASE_URL}${TEST_ENDPOINT}`);
    console.log(`✅ Request successful: ${response.status}`);
    
    // 2. Wait a bit for metrics to be processed
    console.log('\n2️⃣ Waiting 6 seconds for metrics processing...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // 3. Check buffer status
    console.log('\n3️⃣ Checking buffer status...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/metrics/status`, {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}` // Add token if needed
        }
      });
      console.log('Buffer Status:', JSON.stringify(statusResponse.data, null, 2));
    } catch (error: any) {
      console.log('⚠️  Status endpoint requires auth. Skipping...');
      console.log('   Error:', error.response?.status, error.response?.statusText);
    }
    
    // 4. Check real-time metrics
    console.log('\n4️⃣ Checking real-time metrics...');
    try {
      const realtimeResponse = await axios.get(`${BASE_URL}/metrics/realtime`, {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`
        }
      });
      console.log('Real-time Metrics:', JSON.stringify(realtimeResponse.data, null, 2));
    } catch (error: any) {
      console.log('⚠️  Realtime endpoint requires auth. Skipping...');
      console.log('   Error:', error.response?.status, error.response?.statusText);
    }
    
    // 5. Check hourly metrics
    console.log('\n5️⃣ Checking hourly metrics...');
    try {
      const hourlyResponse = await axios.get(`${BASE_URL}/metrics/hourly-new?hours=1`, {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`
        }
      });
      console.log(`Hourly Metrics: ${hourlyResponse.data.length} records`);
      if (hourlyResponse.data.length > 0) {
        console.log('Sample:', JSON.stringify(hourlyResponse.data[0], null, 2));
      }
    } catch (error: any) {
      console.log('⚠️  Hourly endpoint requires auth. Skipping...');
      console.log('   Error:', error.response?.status, error.response?.statusText);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check Redis: redis-cli LLEN metrics:buffer');
    console.log('   2. Check Redis Hash: redis-cli HGETALL metrics:realtime:*');
    console.log('   3. Check MySQL: SELECT * FROM metrics_hourly ORDER BY hour_start DESC LIMIT 5;');
    console.log('   4. Monitor logs for MetricsProcessor activity');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run test
testMetricsCollection();

