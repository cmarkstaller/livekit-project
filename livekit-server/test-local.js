const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');

// Configuration for local development
const LIVEKIT_URL = 'ws://localhost:7880';
const API_KEY = 'APIrCXwmt7s57ZW';
const API_SECRET = 'QYkjeMONn2jjeNO1P7gQpewngLCJjH5i0fIlYbwUbWjB';

// Initialize RoomServiceClient for local server
const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);

async function testLocalLiveKit() {
    console.log('🧪 Testing Local LiveKit Server...\n');

    try {
        // Test 1: Server Connection
        console.log('1️⃣ Testing server connection...');
        const rooms = await roomService.listRooms();
        console.log('✅ Server connection successful!');
        console.log(`   Found ${rooms.length} existing rooms\n`);

        // Test 2: Room Management
        console.log('2️⃣ Testing room management...');
        const testRoomName = `test-room-${Date.now()}`;
        
        // Create a test room
        await roomService.createRoom({
            name: testRoomName,
            maxParticipants: 10,
            emptyTimeout: 5 * 60, // 5 minutes
            maxDuration: 60 * 60, // 1 hour
        });
        console.log(`✅ Created test room: ${testRoomName}`);

        // List rooms to verify creation
        const updatedRooms = await roomService.listRooms();
        const createdRoom = updatedRooms.find(room => room.name === testRoomName);
        if (createdRoom) {
            console.log(`✅ Room found in list: ${createdRoom.name}`);
        }

        // Delete the test room
        await roomService.deleteRoom(testRoomName);
        console.log(`✅ Deleted test room: ${testRoomName}\n`);

        // Test 3: Token Generation
        console.log('3️⃣ Testing token generation...');
        const testUser = 'test-user-123';
        const testRoom = 'test-room-token';
        
        const token = new AccessToken(API_KEY, API_SECRET, {
            identity: testUser,
            name: 'Test User',
        });
        
        token.addGrant({
            room: testRoom,
            roomJoin: true,
            roomPublish: true,
            roomSubscribe: true,
        });

        const jwt = token.toJwt();
        console.log(`✅ Generated JWT token for user: ${testUser}`);
        console.log(`   Token length: ${jwt.length} characters`);
        console.log(`   Room: ${testRoom}\n`);

        // Test 4: Room Service Operations
        console.log('4️⃣ Testing room service operations...');
        const detailedRoomName = `detailed-room-${Date.now()}`;
        
        await roomService.createRoom({
            name: detailedRoomName,
            maxParticipants: 5,
            emptyTimeout: 10 * 60, // 10 minutes
            maxDuration: 2 * 60 * 60, // 2 hours
            metadata: JSON.stringify({
                description: 'Test room for local development',
                createdBy: 'test-script',
                timestamp: new Date().toISOString()
            })
        });
        
        const detailedRooms = await roomService.listRooms();
        const detailedRoom = detailedRooms.find(room => room.name === detailedRoomName);
        
        if (detailedRoom) {
            console.log(`✅ Detailed room created: ${detailedRoom.name}`);
            console.log(`   Max participants: ${detailedRoom.maxParticipants}`);
            console.log(`   Empty timeout: ${detailedRoom.emptyTimeout}s`);
            console.log(`   Max duration: ${detailedRoom.maxDuration}s`);
            console.log(`   Metadata: ${detailedRoom.metadata}`);
        }

        // Clean up
        await roomService.deleteRoom(detailedRoomName);
        console.log(`✅ Cleaned up detailed room: ${detailedRoomName}\n`);

        console.log('🎉 All tests passed! Your local LiveKit server is working correctly.');
        console.log('\n📋 Server Information:');
        console.log(`   URL: ${LIVEKIT_URL}`);
        console.log(`   HTTP Port: 7880`);
        console.log(`   UDP Port: 7882`);
        console.log(`   API Key: ${API_KEY}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\n🔧 Troubleshooting tips:');
        console.error('   1. Make sure Docker is running');
        console.error('   2. Ensure the LiveKit container is started: docker-compose up -d');
        console.error('   3. Check if ports 7880 and 7882 are available');
        console.error('   4. Verify the API keys are correct');
        process.exit(1);
    }
}

// Run the tests
testLocalLiveKit(); 