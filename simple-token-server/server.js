const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
const PORT = process.env.PORT || 3001;

// LiveKit API credentials
const API_KEY = process.env.LIVEKIT_API_KEY || 'APIrCXwmt7s57ZW';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'QYkjeMONn2jjeNO1P7gQpewngLCJjH5i0fIlYbwUbWjB';

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
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'roomName and participantName are required'
      });
    }

    // Create access token
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantName,
      name: participantName
    });

    // Grant permissions using a grant object
    const grant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,    // You can make this conditional if you want to distinguish viewers
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Token Server running on port ${PORT}`);
  console.log(`📝 POST /token - Generate a token`);
  console.log(`📝 GET /health - Health check`);
}); 