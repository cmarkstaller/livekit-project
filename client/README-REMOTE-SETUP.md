# Remote Server Setup for LiveKit Client

This guide explains how to configure your LiveKit client to work with remote servers instead of local ones.

## What Changed

The client code has been updated to use configurable URLs instead of hardcoded localhost addresses:

- **LiveKit Server**: Changed from `ws://localhost:7880` to configurable remote URL
- **Token Server**: Changed from `http://localhost:3001` to configurable remote URL

## Configuration Options

### Option 1: Edit config.js (Recommended)

1. Open `client/config.js`
2. Update the URLs in `BASE_CONFIG`:

```javascript
const BASE_CONFIG = {
    // Your remote LiveKit server WebSocket URL
    LIVEKIT_SERVER_URL: 'wss://your-livekit-server.com',
    
    // Your remote token server base URL  
    TOKEN_SERVER_URL: 'https://your-token-server.com',
};
```

### Option 2: Use Environment Variables

1. Create a `.env` file in the `client/` directory
2. Add your server URLs:

```bash
VITE_LIVEKIT_SERVER_URL=wss://your-livekit-server.com
VITE_TOKEN_SERVER_URL=https://your-token-server.com
```

## URL Format Examples

### LiveKit Server URLs
- **Secure (Recommended)**: `wss://livekit.yourdomain.com`
- **Insecure**: `ws://livekit.yourdomain.com:7880`

### Token Server URLs
- **Secure (Recommended)**: `https://tokens.yourdomain.com`
- **Insecure**: `http://tokens.yourdomain.com:3001`

## Important Notes

1. **Use HTTPS/WSS for production**: Secure connections are recommended for production use
2. **CORS**: Ensure your remote token server allows requests from your client's domain
3. **Firewall**: Make sure your remote servers are accessible from the internet
4. **SSL Certificates**: For production, ensure your servers have valid SSL certificates

## Testing

After updating the configuration:

1. Restart your development server: `npm run dev`
2. Try joining a room to test the connection
3. Check the browser console for any connection errors

## Troubleshooting

- **Connection refused**: Check if your remote servers are running and accessible
- **CORS errors**: Verify your token server allows requests from your client domain
- **SSL errors**: Ensure your servers have valid SSL certificates for HTTPS/WSS 