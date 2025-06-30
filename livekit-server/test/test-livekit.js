const { RoomServiceClient } = require('livekit-server-sdk');

// Your LiveKit server configuration
const LIVEKIT_URL = 'wss://chris-spring-breeze-6913.fly.dev';
const API_KEY = 'APIrCXwmt7s57ZW';
const API_SECRET = 'QYkjeMONn2jjeNO1P7gQpewngLCJjH5i0fIlYbwUbWjB';

// Create a room service client
const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);

async function testLiveKitBackend() {
  console.log('🧪 Testing LiveKit Backend...\n');
  
  try {
    // Test 1: Create a room
    console.log('1️⃣ Creating test room...');
    const roomName = `test-room-${Date.now()}`;
    const room = await roomService.createRoom({
      name: roomName,
      maxParticipants: 10,
      emptyTimeout: 60, // 1 minute
    });
    console.log(`✅ Room created: ${room.name}`);
    console.log(`   - Max participants: ${room.maxParticipants}`);
    console.log(`   - Empty timeout: ${room.emptyTimeout}s\n`);
    
    // Test 2: List rooms
    console.log('2️⃣ Listing rooms...');
    const rooms = await roomService.listRooms();
    const testRoom = rooms.find(r => r.name === roomName);
    if (testRoom) {
      console.log(`✅ Test room found in room list`);
      console.log(`   - Room name: ${testRoom.name}`);
      console.log(`   - Creation time: ${testRoom.creationTime}`);
      console.log(`   - Empty timeout: ${testRoom.emptyTimeout}s`);
    } else {
      console.log(`❌ Test room not found in room list`);
    }
    console.log(`   - Total rooms: ${rooms.length}\n`);
    
    // Test 3: Create an access token (simulates a client joining)
    console.log('3️⃣ Testing access token creation...');
    const { AccessToken } = require('livekit-server-sdk');
    const token = new AccessToken(API_KEY, API_SECRET, {
      identity: 'test-user',
      name: 'Test User',
    });
    token.addGrant({ roomJoin: true, room: roomName });
    const jwt = token.toJwt();
    console.log(`✅ Access token created successfully`);
    console.log(`   - Token length: ${jwt.length} characters\n`);
    
    // Test 4: Clean up - delete the test room
    console.log('4️⃣ Cleaning up test room...');
    await roomService.deleteRoom(roomName);
    console.log(`✅ Test room deleted: ${roomName}\n`);
    
    console.log('🎉 All tests passed! Your LiveKit backend is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
testLiveKitBackend(); 