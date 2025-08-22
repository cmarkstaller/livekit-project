# Simple Token Server with Telegram Bot Integration

A LiveKit token server that includes room management capabilities and can be controlled via Telegram bot commands.

## Features

- **Token Generation**: Generate LiveKit access tokens for participants
- **Room Management**: Create, delete, and monitor rooms via REST API
- **Telegram Bot**: Control room operations through Telegram commands
- **Admin Authentication**: Secure admin endpoints with token-based authentication

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file with the following variables:

```bash
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=ws://localhost:7880

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_ADMIN_IDS=123456789,987654321

# Admin Authentication
ADMIN_SECRET=your_admin_secret_here

# Server Configuration
PORT=3001
```

### 3. Telegram Bot Setup

1. **Create a bot**: Message [@BotFather](https://t.me/botfather) on Telegram
2. **Get your bot token**: BotFather will give you a token like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
3. **Set webhook**: Your bot will receive messages via webhook at `/telegram-webhook`
4. **Get your user ID**: Message [@userinfobot](https://t.me/userinfobot) to get your Telegram user ID
5. **Update environment variables**: Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_IDS`

### 4. Start the Server

```bash
npm start
```

## API Endpoints

### Public Endpoints

- `POST /token` - Generate LiveKit access token
- `GET /rooms` - List all active rooms
- `GET /health` - Health check

### Admin Endpoints (require Authorization header)

- `POST /admin/create-room` - Create a new room
- `DELETE /admin/delete-room` - Delete a room
- `GET /admin/room-info/:roomName` - Get detailed room information

### Telegram Webhook

- `POST /telegram-webhook` - Handles incoming Telegram messages

## Telegram Bot Commands

- `/create-room <name>` - Create a new room
- `/delete-room <name>` - Delete a room
- `/list-rooms` - List all active rooms
- `/help` - Show help message

## Usage Examples

### Generate a token

```bash
curl -X POST http://localhost:3001/token \
  -H "Content-Type: application/json" \
  -d '{"roomName": "meeting-123", "participantName": "John", "role": "host"}'
```

### Create a room (admin only)

```bash
curl -X POST http://localhost:3001/admin/create-room \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_secret_here" \
  -d '{"roomName": "team-meeting", "maxParticipants": 25}'
```

### Delete a room (admin only)

```bash
curl -X DELETE http://localhost:3001/admin/delete-room \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_secret_here" \
  -d '{"roomName": "team-meeting"}'
```

## Security Notes

- The `ADMIN_SECRET` should be a strong, random string
- Only authorized Telegram users (specified in `TELEGRAM_ADMIN_IDS`) can use the bot
- Admin endpoints require the `Authorization: Bearer <secret>` header
- Consider implementing proper JWT authentication for production use

## Development

```bash
npm run dev
```

This will start the server with nodemon for automatic restarts during development. 