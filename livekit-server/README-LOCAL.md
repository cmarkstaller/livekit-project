# LiveKit Server - Local Development

This guide will help you run the LiveKit server locally for development using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Node.js (for running tests)
- Ports 7880 and 7882 available on your machine

## Quick Start

### Option 1: Using the startup script (Recommended)

```bash
cd livekit-server
./start-local.sh
```

This script will:
- Check if Docker is running
- Verify ports are available
- Start the LiveKit server
- Optionally run tests
- Provide server information

### Option 2: Manual startup

```bash
cd livekit-server

# Start the server
docker compose up -d

# Check if it's running
curl http://localhost:7880

# View logs
docker compose logs -f
```

## Server Configuration

The local server uses the same configuration as your Fly.io deployment:

- **URL**: `ws://localhost:7880`
- **HTTP Port**: 7880 (WebSocket connections and API)
- **UDP Port**: 7882 (WebRTC media streams)
- **API Key**: `APIrCXwmt7s57ZW`
- **API Secret**: `QYkjeMONn2jjeNO1P7gQpewngLCJjH5i0fIlYbwUbWjB`

## Testing

### Run the local test suite

```bash
cd livekit-server
node test-local.js
```

### Run the original test suite (against Fly.io)

```bash
cd livekit-server/test
npm install
npm test
```

## Development Workflow

1. **Start the server**: `./start-local.sh`
2. **Make changes** to your application
3. **Test locally** using the test scripts
4. **View logs**: `docker compose logs -f`
5. **Stop the server**: `docker compose down`

## Troubleshooting

### Port already in use
```bash
# Check what's using the ports
lsof -i :7880
lsof -i :7882

# Stop existing containers
docker compose down
```

### Server not starting
```bash
# Check Docker logs
docker compose logs

# Restart the container
docker compose restart
```

### Connection issues
- Ensure Docker is running
- Check if ports 7880 and 7882 are available
- Verify the API keys are correct
- Make sure your firewall allows local connections

## Files Overview

- `docker-compose.yml` - Docker configuration for local development
- `start-local.sh` - Automated startup script
- `test-local.js` - Test suite for local server
- `fly.toml` - Original Fly.io deployment configuration
- `test/` - Original test suite for Fly.io deployment

## Next Steps

Once your local LiveKit server is running, you can:

1. Connect your client applications to `ws://localhost:7880`
2. Use the API keys for authentication
3. Test WebRTC functionality locally
4. Develop and debug your LiveKit integration

## Stopping the Server

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (if you want to reset everything)
docker compose down -v
``` 