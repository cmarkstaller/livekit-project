# LiveKit Project - Frontend Client Integration Guide

This project contains a complete LiveKit setup with a server and token generation service. This README provides all the information needed for frontend clients to connect successfully.

## 🏗️ Project Architecture

```
livekit-project/
├── livekit-server/          # LiveKit server configuration and deployment
├── simple-token-server/     # Token generation service
└── README.md               # This file
```

## 📋 Prerequisites

### Required Tools & Versions

- **Node.js**: Version 16+ (for token server)
- **Docker**: For running LiveKit server locally
- **LiveKit Client SDK**: Version 2.14.0+ (for frontend integration)

### Frontend Dependencies

```json
{
  "livekit-client": "^2.14.0"
}
```

## 🌐 Server Endpoints

### LiveKit Server
- **Local Development**: `ws://localhost:7880`
- **Production**: `wss://chris-spring-breeze-6913.fly.dev:7880`
- **WebRTC Media Port**: `7882` (UDP)

### Token Server
- **Local Development**: `http://localhost:3001`
- **Health Check**: `GET /health`
- **Token Generation**: `POST /token`

## 🔑 Authentication & API Keys

### LiveKit Server Credentials
```javascript
const API_KEY = "APIrCXwmt7s57ZW";
const API_SECRET = "QYkjeMONn2jjeNO1P7gQpewngLCJjH5i0fIlYbwUbWjB";
```

⚠️ **Security Note**: These are development keys. For production, use environment variables and secure key management.

## 🚀 Frontend Integration Guide

### 1. Install LiveKit Client SDK

```bash
npm install livekit-client@^2.14.0
```

### 2. Token Generation

Before connecting to LiveKit, you need to obtain a token from the token server:

```javascript
// Request a token from your token server
const response = await fetch('http://localhost:3001/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    roomName: 'your-room-name',
    participantName: 'user-display-name'
  })
});

const { token } = await response.json();
```

### 3. Connect to LiveKit Server

```javascript
import { Room, RoomEvent } from 'livekit-client';

// Create a new room instance
const room = new Room();

// Connect to the LiveKit server
await room.connect('ws://localhost:7880', token, {
  autoSubscribe: true,
});

// Listen for connection events
room.on(RoomEvent.Connected, () => {
  console.log('Connected to LiveKit server');
});

room.on(RoomEvent.ParticipantConnected, (participant) => {
  console.log('Participant joined:', participant.identity);
});
```

### 4. Publish Media Streams

```javascript
// Get user media
const mediaStream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
});

// Publish to the room
await room.localParticipant.publishTrack(mediaStream.getVideoTracks()[0]);
await room.localParticipant.publishTrack(mediaStream.getAudioTracks()[0]);
```

### 5. Subscribe to Remote Participants

```javascript
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  console.log('Subscribed to track:', track.kind, 'from:', participant.identity);
  
  // Attach video track to DOM element
  if (track.kind === Track.Kind.Video) {
    const element = track.attach();
    document.getElementById('video-container').appendChild(element);
  }
});
```

## 🔧 Configuration Details

### LiveKit Server Configuration
- **WebSocket Port**: 7880 (TCP)
- **Media Port**: 7882 (UDP)
- **Max Participants**: 20 per room
- **Room Auto-Create**: Enabled
- **Empty Room Timeout**: 10 minutes
- **Max Room Duration**: 24 hours

### Token Server Configuration
- **Port**: 3001
- **CORS**: Enabled for localhost origins
- **Token Expiration**: Default JWT expiration
- **Permissions**: Full publish/subscribe access

## 🌍 Environment-Specific URLs

### Development Environment
```javascript
const LIVEKIT_URL = 'ws://localhost:7880';
const TOKEN_SERVER_URL = 'http://localhost:3001';
```

### Production Environment
```javascript
const LIVEKIT_URL = 'wss://chris-spring-breeze-6913.fly.dev:7880';
const TOKEN_SERVER_URL = 'https://your-token-server-domain.com';
```

## 📱 Complete Frontend Example

```javascript
import { Room, RoomEvent, Track } from 'livekit-client';

class LiveKitClient {
  constructor() {
    this.room = new Room();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.room.on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit');
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant joined:', participant.identity);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      this.handleTrackSubscribed(track, participant);
    });
  }

  async getToken(roomName, participantName) {
    const response = await fetch('http://localhost:3001/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName })
    });
    
    const { token } = await response.json();
    return token;
  }

  async joinRoom(roomName, participantName) {
    try {
      const token = await this.getToken(roomName, participantName);
      await this.room.connect('ws://localhost:7880', token);
      
      // Publish local media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      await this.room.localParticipant.publishTrack(stream.getVideoTracks()[0]);
      await this.room.localParticipant.publishTrack(stream.getAudioTracks()[0]);
      
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  }

  handleTrackSubscribed(track, participant) {
    if (track.kind === Track.Kind.Video) {
      const element = track.attach();
      document.getElementById('video-container').appendChild(element);
    }
  }

  disconnect() {
    this.room.disconnect();
  }
}

// Usage
const client = new LiveKitClient();
client.joinRoom('test-room', 'user-name');
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your token server CORS configuration includes your frontend origin
2. **WebSocket Connection Failed**: Check if LiveKit server is running and accessible
3. **Token Invalid**: Verify API keys match between token server and LiveKit server
4. **Media Permissions**: Ensure browser has microphone/camera permissions

### Debug Mode

Enable debug logging in LiveKit client:

```javascript
import { setLogLevel } from 'livekit-client';
setLogLevel('debug');
```

## 📚 Additional Resources

- [LiveKit Client SDK Documentation](https://docs.livekit.io/reference/client-sdk-js/)
- [LiveKit Server Documentation](https://docs.livekit.io/deploy/)
- [WebRTC Best Practices](https://webrtc.github.io/webrtc/)

## 🔄 Version Compatibility

| Component | Version | Notes |
|-----------|---------|-------|
| LiveKit Client | 2.14.0 | Frontend SDK |
| LiveKit Server | Latest | Docker image |
| LiveKit Server SDK | 2.13.1 | Token generation |
| Node.js | 16+ | Token server runtime |
| Express | 4.18.2 | Token server framework |

---

**Last Updated**: December 2024
**Project Status**: Development Ready 