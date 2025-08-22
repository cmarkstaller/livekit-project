// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3001;

// LiveKit API credentials
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_REST_URL = process.env.LIVEKIT_REST_URL || 'http://127.0.0.1:7880';
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL || 'ws://127.0.0.1:7880';


// Telegram Bot configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_ADMIN_IDS = process.env.TELEGRAM_ADMIN_IDS ? 
  process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : 
  [123456789]; // Replace with your Telegram user ID

// Initialize Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// RoomServiceClient for room management
const roomService = new RoomServiceClient(LIVEKIT_REST_URL, API_KEY, API_SECRET);

// Configure CORS more explicitly
app.use(cors({
  //origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin token required' });
  }
  
  const token = authHeader.substring(7);
  // Simple token validation - you might want to implement proper JWT validation
  if (token !== process.env.ADMIN_SECRET || !process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid admin token' });
  }
  
  next();
};

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

// Room management endpoints
app.post('/admin/create-room', requireAdmin, async (req, res) => {
  try {
    const { roomName, maxParticipants = 20 } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    // Create room using LiveKit
    await roomService.createRoom({
      name: roomName,
      maxParticipants: maxParticipants,
      emptyTimeout: 10 * 60, // 10 minutes
      maxPublishers: 10
    });

    console.log(`✅ Room created: ${roomName}`);
    res.json({ success: true, roomName, message: 'Room created successfully' });
    
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.delete('/admin/delete-room', requireAdmin, async (req, res) => {
  try {
    const { roomName } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    // Delete room using LiveKit
    await roomService.deleteRoom(roomName);

    console.log(`🗑️ Room deleted: ${roomName}`);
    res.json({ success: true, roomName, message: 'Room deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

app.get('/admin/room-info/:roomName', requireAdmin, async (req, res) => {
  try {
    const { roomName } = req.params;
    
    // Get room information
    const room = await roomService.getRoom(roomName);
    const participants = await roomService.listParticipants(roomName);
    
    res.json({
      roomName,
      room,
      participants: participants.map(p => ({
        identity: p.identity,
        name: p.name,
        canPublish: p.permission?.canPublish || false,
        joinedAt: p.joinedAt
      }))
    });
    
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room info' });
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

// Telegram webhook endpoint
app.post('/telegram-webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text.trim();

    // Check if user is admin
    if (!TELEGRAM_ADMIN_IDS.includes(userId)) {
      await bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
      return res.status(200).json({ ok: true });
    }

    // Handle commands
    if (text.startsWith('/create-room')) {
      const roomName = text.split(' ')[1];
      if (!roomName) {
        await bot.sendMessage(chatId, '❌ Usage: /create-room <room-name>');
        return res.status(200).json({ ok: true });
      }

      try {
        await roomService.createRoom({
          name: roomName,
          maxParticipants: 20,
          emptyTimeout: 10 * 60,
          maxPublishers: 10
        });
        await bot.sendMessage(chatId, `✅ Room "${roomName}" created successfully!`);
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Failed to create room: ${error.message}`);
      }
    }
    else if (text.startsWith('/delete-room')) {
      const roomName = text.split(' ')[1];
      if (!roomName) {
        await bot.sendMessage(chatId, '❌ Usage: /delete-room <room-name>');
        return res.status(200).json({ ok: true });
      }

      try {
        await roomService.deleteRoom(roomName);
        await bot.sendMessage(chatId, `🗑️ Room "${roomName}" deleted successfully!`);
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Failed to delete room: ${error.message}`);
      }
    }
    else if (text === '/list-rooms') {
      try {
        const rooms = await roomService.listRooms();
        if (rooms.length === 0) {
          await bot.sendMessage(chatId, '📝 No active rooms found.');
        } else {
          const roomList = rooms.map(room => `• ${room.name}`).join('\n');
          await bot.sendMessage(chatId, `📝 Active rooms:\n${roomList}`);
        }
      } catch (error) {
        await bot.sendMessage(chatId, `❌ Failed to list rooms: ${error.message}`);
      }
    }
    else if (text === '/help') {
      const helpText = `🤖 LiveKit Room Management Bot

Commands:
/create-room <name> - Create a new room
/delete-room <name> - Delete a room
/list-rooms - List all active rooms
/help - Show this help message

Example: /create-room team-meeting`;
      await bot.sendMessage(chatId, helpText);
    }
    else if (text.startsWith('/')) {
      await bot.sendMessage(chatId, '❌ Unknown command. Use /help for available commands.');
    }

    res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Token Server running on port ${PORT}`);
  console.log(`📝 POST /token - Generate a token`);
  console.log(`📝 POST /admin/create-room - Create a room (admin only)`);
  console.log(`📝 DELETE /admin/delete-room - Delete a room (admin only)`);
  console.log(`📝 GET /admin/room-info/:name - Get room info (admin only)`);
  console.log(`📝 POST /telegram-webhook - Telegram bot webhook`);
  console.log(`📝 GET /health - Health check`);
  
  if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log(`⚠️  Please set TELEGRAM_BOT_TOKEN environment variable`);
  }
}); 