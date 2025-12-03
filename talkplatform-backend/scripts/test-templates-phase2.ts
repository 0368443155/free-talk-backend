import 'reflect-metadata';
import 'dotenv/config';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || ''; // Set this in .env

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

async function testTemplatesAPI() {
  const results: TestResult[] = [];
  const headers = TEST_USER_TOKEN ? { Authorization: `Bearer ${TEST_USER_TOKEN}` } : {};

  console.log('🧪 Testing Course Templates API...\n');
  console.log(`API URL: ${API_URL}${API_PREFIX}\n`);

  // Test 1: Get Templates (Public)
  try {
    console.log('1️⃣ Testing GET /api/v1/course-templates (public)...');
    const response = await axios.get(`${API_URL}${API_PREFIX}/course-templates`, {
      params: { page: 1, limit: 10 },
    });
    results.push({
      name: 'GET /course-templates',
      passed: true,
      data: { count: response.data.data?.length || 0, total: response.data.total },
    });
    console.log('✅ Passed - Found', response.data.total || 0, 'templates\n');
  } catch (error: any) {
      results.push({
        name: 'GET /api/v1/course-templates',
        passed: false,
        error: error.response?.data?.message || error.message,
      });
      console.log('❌ Failed:', error.response?.data?.message || error.message, '\n');
  }

  // Test 2: Create Template (Requires Auth)
  if (TEST_USER_TOKEN) {
    try {
      console.log('2️⃣ Testing POST /api/v1/course-templates (create template)...');
      const templateData = {
        name: 'Test Template - English Conversation',
        description: 'A test template for English conversation course',
        isPublic: false,
        category: 'English',
        level: 'beginner',
        language: 'en',
        sessionsPerWeek: 2,
        sessionStructure: [
          {
            sessionNumber: 1,
            title: 'Introduction & Greetings',
            description: 'Learn basic greetings',
            durationMinutes: 120,
            topics: ['Greetings', 'Introductions', 'Basic Phrases'],
            lessonCount: 3,
          },
          {
            sessionNumber: 2,
            title: 'Daily Conversations',
            description: 'Practice daily scenarios',
            durationMinutes: 120,
            topics: ['Shopping', 'Restaurant', 'Transportation'],
            lessonCount: 4,
          },
        ],
        suggestedPriceFull: 199.99,
        suggestedPriceSession: 19.99,
        tags: ['english', 'conversation', 'beginner'],
      };

      const response = await axios.post(`${API_URL}${API_PREFIX}/course-templates`, templateData, { headers });
      const templateId = response.data.data?.id;

      results.push({
        name: 'POST /api/v1/course-templates',
        passed: true,
        data: { templateId },
      });
      console.log('✅ Passed - Template created:', templateId, '\n');

      // Test 3: Get Template by ID
      if (templateId) {
        try {
          console.log('3️⃣ Testing GET /api/v1/course-templates/:id...');
          const getResponse = await axios.get(`${API_URL}${API_PREFIX}/course-templates/${templateId}`);
          results.push({
            name: 'GET /course-templates/:id',
            passed: true,
            data: { name: getResponse.data.name },
          });
          console.log('✅ Passed - Template retrieved:', getResponse.data.name, '\n');
        } catch (error: any) {
          results.push({
            name: 'GET /course-templates/:id',
            passed: false,
            error: error.response?.data?.message || error.message,
          });
          console.log('❌ Failed:', error.response?.data?.message || error.message, '\n');
        }

        // Test 4: Create Course from Template
        try {
          console.log('4️⃣ Testing POST /api/v1/course-templates/:id/use (create course from template)...');
          const courseData = {
            title: 'English Conversation - Test Course',
            description: 'Test course created from template',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            priceFullCourse: 199.99,
            maxStudents: 20,
          };

          const useResponse = await axios.post(
            `${API_URL}${API_PREFIX}/course-templates/${templateId}/use`,
            courseData,
            { headers },
          );
          const courseId = useResponse.data.data?.id;

          results.push({
            name: 'POST /course-templates/:id/use',
            passed: true,
            data: { courseId },
          });
          console.log('✅ Passed - Course created:', courseId, '\n');
        } catch (error: any) {
          results.push({
            name: 'POST /course-templates/:id/use',
            passed: false,
            error: error.response?.data?.message || error.message,
          });
          console.log('❌ Failed:', error.response?.data?.message || error.message, '\n');
        }

        // Test 5: Rate Template
        try {
          console.log('5️⃣ Testing POST /api/v1/course-templates/:id/rate...');
          const rateResponse = await axios.post(
            `${API_URL}${API_PREFIX}/course-templates/${templateId}/rate`,
            { rating: 5, review: 'Great template!' },
            { headers },
          );
          results.push({
            name: 'POST /course-templates/:id/rate',
            passed: true,
            data: { rating: rateResponse.data.data?.rating },
          });
          console.log('✅ Passed - Template rated\n');
        } catch (error: any) {
          results.push({
            name: 'POST /course-templates/:id/rate',
            passed: false,
            error: error.response?.data?.message || error.message,
          });
          console.log('❌ Failed:', error.response?.data?.message || error.message, '\n');
        }

        // Test 6: Get My Templates
        try {
          console.log('6️⃣ Testing GET /api/v1/course-templates/my-templates...');
          const myTemplatesResponse = await axios.get(`${API_URL}${API_PREFIX}/course-templates/my-templates`, {
            headers,
            params: { page: 1, limit: 10 },
          });
          results.push({
            name: 'GET /course-templates/my-templates',
            passed: true,
            data: { count: myTemplatesResponse.data.data?.length || 0 },
          });
          console.log('✅ Passed - Found', myTemplatesResponse.data.total || 0, 'my templates\n');
        } catch (error: any) {
          results.push({
            name: 'GET /course-templates/my-templates',
            passed: false,
            error: error.response?.data?.message || error.message,
          });
          console.log('❌ Failed:', error.response?.data?.message || error.message, '\n');
        }
      }
    } catch (error: any) {
      results.push({
        name: 'POST /course-templates',
        passed: false,
        error: error.response?.data?.message || error.message,
      });
      console.log('❌ Failed:', error.response?.data?.message || error.message, '\n');
    }
  } else {
    console.log('⚠️  Skipping authenticated tests (TEST_USER_TOKEN not set)\n');
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.data) {
      console.log(`   Data:`, result.data);
    }
  });
  console.log('='.repeat(50));
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
testTemplatesAPI().catch(console.error);

