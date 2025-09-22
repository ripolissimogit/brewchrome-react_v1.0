#!/usr/bin/env node

const API_BASE = 'https://brewchrome-backend-736130833520.us-central1.run.app';

async function testHealthEndpoint() {
  console.log('🔍 Testing /health endpoint...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('✅ Health:', data);
    return true;
  } catch (error) {
    console.log('❌ Health failed:', error.message);
    return false;
  }
}

async function testImageProcessing() {
  console.log('🔍 Testing /process endpoint...');
  try {
    // Create a simple test image (1x1 PNG)
    const testImageData =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(testImageData, 'base64');

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'test.png');

    const response = await fetch(`${API_BASE}/process`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    console.log('✅ Image processing:', data);
    return data.success;
  } catch (error) {
    console.log('❌ Image processing failed:', error.message);
    return false;
  }
}

async function testUrlFetch() {
  console.log('🔍 Testing /fetch_url endpoint...');
  try {
    const response = await fetch(`${API_BASE}/fetch_url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://picsum.photos/100/100',
      }),
    });

    const data = await response.json();
    console.log('✅ URL fetch:', data);
    return data.success;
  } catch (error) {
    console.log('❌ URL fetch failed:', error.message);
    return false;
  }
}

async function testFrontendApiProxy() {
  console.log('🔍 Testing frontend API proxy...');
  try {
    // Test through Vercel proxy
    const response = await fetch(
      'https://brewchrome-react-v1-0-8ffxnf7du-ripolissimos-projects.vercel.app/api/health'
    );

    if (response.status === 401 || response.status === 403) {
      console.log('⚠️  Frontend proxy blocked by authentication');
      return false;
    }

    const data = await response.json();
    console.log('✅ Frontend proxy:', data);
    return true;
  } catch (error) {
    console.log('❌ Frontend proxy failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Integration Tests\n');

  const results = {
    health: await testHealthEndpoint(),
    image: await testImageProcessing(),
    urlFetch: await testUrlFetch(),
    frontendProxy: await testFrontendApiProxy(),
  };

  console.log('\n📊 Test Results:');
  console.log('Health endpoint:', results.health ? '✅' : '❌');
  console.log('Image processing:', results.image ? '✅' : '❌');
  console.log('URL fetch:', results.urlFetch ? '✅' : '❌');
  console.log('Frontend proxy:', results.frontendProxy ? '✅' : '❌');

  const allPassed = Object.values(results).every((r) => r);
  console.log(
    '\n🎯 Overall:',
    allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'
  );

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };
