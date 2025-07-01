const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// Your LiveKit API credentials (should match server.js)
const API_KEY = process.env.LIVEKIT_API_KEY || 'APIrCXwmt7s57ZW';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'QYkjeMONn2jjeNO1P7gQpewngLCJjH5i0fIlYbwUbWjB';

async function testTokenServer() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🧪 Starting comprehensive token validation tests...\n');
  
  try {
    // Test 1: Health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Basic token generation
    console.log('\n2️⃣ Testing basic token generation...');
    const testParams = {
      roomName: 'test-room-123',
      participantName: 'test-user-456'
    };
    
    const tokenResponse = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testParams)
    });
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Token response received:', {
      hasToken: !!tokenData.token,
      roomName: tokenData.roomName,
      participantName: tokenData.participantName
    });
    
    if (!tokenData.token) {
      throw new Error('No token received from server');
    }
    
    // Test 3: JWT Structure Validation
    console.log('\n3️⃣ Validating JWT structure...');
    const token = tokenData.token;
    
    // Check if token has 3 parts (header.payload.signature)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error(`Invalid JWT structure. Expected 3 parts, got ${tokenParts.length}`);
    }
    console.log('✅ JWT has correct structure (header.payload.signature)');
    
    // Test 4: Decode JWT without verification (to check claims)
    console.log('\n4️⃣ Decoding JWT claims...');
    const decodedToken = jwt.decode(token);
    
    if (!decodedToken) {
      throw new Error('Failed to decode JWT');
    }
    
    console.log('✅ JWT decoded successfully');
    console.log('📋 Token claims:', {
      iss: decodedToken.iss, // issuer (should be API_KEY)
      sub: decodedToken.sub, // subject (should be participant identity)
      exp: decodedToken.exp, // expiration
      iat: decodedToken.iat, // issued at
      nbf: decodedToken.nbf, // not before
      jti: decodedToken.jti, // JWT ID
      video: decodedToken.video // LiveKit video claims
    });
    
    // Test 5: Validate Token Claims
    console.log('\n5️⃣ Validating token claims...');
    
    // Check issuer
    if (decodedToken.iss !== API_KEY) {
      throw new Error(`Invalid issuer. Expected ${API_KEY}, got ${decodedToken.iss}`);
    }
    console.log('✅ Issuer (API_KEY) is correct');
    
    // Check subject/identity
    if (decodedToken.sub !== testParams.participantName) {
      throw new Error(`Invalid subject. Expected ${testParams.participantName}, got ${decodedToken.sub}`);
    }
    console.log('✅ Subject (participant identity) is correct');
    
    // Check expiration (should be in the future)
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp <= now) {
      throw new Error(`Token has expired. Exp: ${decodedToken.exp}, Now: ${now}`);
    }
    console.log('✅ Token expiration is in the future');
    
    // Check issued at (should be in the past or now)
    if (decodedToken.iat > now) {
      throw new Error(`Token issued at is in the future. Iat: ${decodedToken.iat}, Now: ${now}`);
    }
    console.log('✅ Token issued at is valid');
    
    // Test 6: Validate LiveKit Video Claims
    console.log('\n6️⃣ Validating LiveKit video claims...');
    
    if (!decodedToken.video) {
      throw new Error('Missing video claims in token');
    }
    
    const videoClaims = decodedToken.video;
    console.log('📋 Video claims:', videoClaims);
    
    // Check room name
    if (videoClaims.room !== testParams.roomName) {
      throw new Error(`Invalid room name. Expected ${testParams.roomName}, got ${videoClaims.room}`);
    }
    console.log('✅ Room name is correct');
    
    // Check room join permission
    if (!videoClaims.roomJoin) {
      throw new Error('Missing roomJoin permission');
    }
    console.log('✅ Room join permission is granted');
    
    // Check publish permission
    if (!videoClaims.canPublish) {
      throw new Error('Missing canPublish permission');
    }
    console.log('✅ Publish permission is granted');
    
    // Check subscribe permission
    if (!videoClaims.canSubscribe) {
      throw new Error('Missing canSubscribe permission');
    }
    console.log('✅ Subscribe permission is granted');
    
    // Test 7: Verify JWT Signature
    console.log('\n7️⃣ Verifying JWT signature...');
    
    try {
      const verifiedToken = jwt.verify(token, API_SECRET);
      console.log('✅ JWT signature is valid');
    } catch (signatureError) {
      throw new Error(`JWT signature verification failed: ${signatureError.message}`);
    }
    
    // Test 8: Test with different parameters
    console.log('\n8️⃣ Testing with different parameters...');
    
    const testParams2 = {
      roomName: 'another-room',
      participantName: 'another-user'
    };
    
    const tokenResponse2 = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testParams2)
    });
    
    const tokenData2 = await tokenResponse2.json();
    const decodedToken2 = jwt.decode(tokenData2.token);
    
    if (decodedToken2.sub !== testParams2.participantName) {
      throw new Error(`Second token has wrong subject. Expected ${testParams2.participantName}, got ${decodedToken2.sub}`);
    }
    
    if (decodedToken2.video.room !== testParams2.roomName) {
      throw new Error(`Second token has wrong room. Expected ${testParams2.roomName}, got ${decodedToken2.video.room}`);
    }
    
    console.log('✅ Second token has correct claims');
    
    // Test 9: Test error handling
    console.log('\n9️⃣ Testing error handling...');
    
    // Test missing roomName
    const errorResponse1 = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participantName: 'test-user'
      })
    });
    
    if (errorResponse1.status !== 400) {
      throw new Error(`Expected 400 for missing roomName, got ${errorResponse1.status}`);
    }
    console.log('✅ Missing roomName returns 400 error');
    
    // Test missing participantName
    const errorResponse2 = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomName: 'test-room'
      })
    });
    
    if (errorResponse2.status !== 400) {
      throw new Error(`Expected 400 for missing participantName, got ${errorResponse2.status}`);
    }
    console.log('✅ Missing participantName returns 400 error');
    
    console.log('\n🎉 All tests passed! Token generation is working correctly.');
    console.log('\n📊 Test Summary:');
    console.log('✅ Health endpoint working');
    console.log('✅ Token generation functional');
    console.log('✅ JWT structure valid');
    console.log('✅ Token claims correct');
    console.log('✅ LiveKit permissions granted');
    console.log('✅ JWT signature verified');
    console.log('✅ Multiple tokens work correctly');
    console.log('✅ Error handling works');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTokenServer(); 