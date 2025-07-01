# LiveKit Server

This directory contains the LiveKit server configuration and tests for deployment on Fly.io.

## Configuration

### `fly.toml`
The main configuration file for deploying LiveKit server on Fly.io.

#### Key Configuration:
- **App Name**: `chris-spring-breeze-6913`
- **Primary Region**: Denver (`den`)
- **Image**: Uses official `livekit/livekit-server:latest` Docker image

#### Exposed Ports:
- **Port 7880 (TCP)**: HTTP service port for WebSocket connections and API requests
- **Port 7882 (UDP)**: Media port for WebRTC audio/video streams

#### Environment Variables:
- `LIVEKIT_KEYS`: API keys for server authentication
- `LIVEKIT_TCP_PORT`: TCP port for signaling (7880)
- `LIVEKIT_UDP_PORT`: UDP port for media (7882)
- `LIVEKIT_ROOM_AUTO_CREATE`: Automatically create rooms when needed
- `LIVEKIT_ROOM_DEFAULT_MAX_PARTICIPANTS`: Maximum 20 participants per room
- `LIVEKIT_ROOM_DEFAULT_EMPTY_TIMEOUT`: Close empty rooms after 10 minutes
- `LIVEKIT_ROOM_DEFAULT_MAX_DURATION`: Maximum room duration of 24 hours

#### Resource Allocation:
- **Memory**: 1GB
- **CPU**: 1 shared CPU
- **Concurrency**: 20-25 connections

## Tests

### `test/test-livekit.js`
A comprehensive test suite that validates the LiveKit server deployment.

#### What the Tests Do:

1. **Test 1: Server Connection**
   - Connects to the LiveKit server via WebSocket
   - Verifies the server is reachable and responding

2. **Test 2: Room Management**
   - Creates a test room using the RoomServiceClient
   - Lists all rooms to verify room creation
   - Deletes the test room to clean up

3. **Test 3: Token Generation**
   - Creates a JWT access token for a test user
   - Simulates what a token server would do
   - Validates token creation and structure

4. **Test 4: Room Service Operations**
   - Tests room creation with specific parameters
   - Verifies room metadata and configuration
   - Tests room deletion

#### Important Notes:
- The token generation test **simulates** a token server but is not for production use
- In production, you need a separate token server (see `../token-server/`)
- These tests use the same API keys as your LiveKit server configuration
- Tests run against your deployed Fly.io instance

## Deployment

To deploy this LiveKit server:

```bash
cd livekit-server
fly deploy
```

The server will be available at your Fly.io app URL with the configured ports exposed for WebRTC functionality. 