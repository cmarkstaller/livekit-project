const express = require('express');
const cors = require('cors');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

const app = express();
const PORT = process.env.PORT || 3001;

// LiveKit API credentials
const API_KEY = process.env.LIVEKIT_API_KEY || 'APIrCXwmt7s57ZW';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'QYkjeMONn2jjeNO1P7gQpewngLCJjH5i0fIlYbwUbWjB';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

// RoomServiceClient for room management
const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);

// Configure CORS more explicitly
app.use(cors({
  //origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Simple token generation endpoint
app.post('/token', async (req, res) => {
  console.log('🔑 Token request received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  
  try {
    const { roomName, participantName, role } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'roomName and participantName are required'
      });
    }

    // Determine publish permission based on role
    // If role is 'viewer', do not allow publishing. Otherwise, allow.
    const canPublish = role === 'viewer' ? false : true;

    // Create access token
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantName,
      name: participantName
    });

    // Grant permissions using a grant object
    const grant = {
      room: roomName,
      roomJoin: true,
      canPublish: canPublish,
      canSubscribe: true
    };
    at.addGrant(grant);

    // Generate token (await the Promise)
    const token = await at.toJwt();

    res.json({
      token: token,
      roomName: roomName,
      participantName: participantName
    });

  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// List available rooms endpoint
app.get('/rooms', async (req, res) => {
  try {
    const rooms = await roomService.listRooms();
    // For each room, get the list of participants and count viewers
    const roomsWithViewers = await Promise.all(rooms.map(async (room) => {
      let viewerCount = 0;
      try {
        const participants = await roomService.listParticipants(room.name);
        // Count participants with canPublish === false (viewers)
        viewerCount = participants.filter(p => p.permission && p.permission.canPublish === false).length;
      } catch (err) {
        console.error(`Error listing participants for room ${room.name}:`, err);
      }
      return {
        name: room.name,
        viewerCount,
      };
    }));
    res.json(roomsWithViewers);
  } catch (error) {
    console.error('Error listing rooms:', error);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Token Server running on port ${PORT}`);
  console.log(`📝 POST /token - Generate a token`);
  console.log(`📝 GET /health - Health check`);
}); 