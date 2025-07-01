# LiveKit Frontend Client

A modern, responsive video conferencing application built with LiveKit Client SDK.

## Features

- 🎥 **Video Conferencing**: Join rooms with camera and microphone
- 🎤 **Audio Controls**: Mute/unmute microphone
- 📹 **Video Controls**: Enable/disable camera
- 👥 **Participant Management**: See all participants in the room
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔄 **Real-time Updates**: Live participant status and media controls
- 🎨 **Modern UI**: Beautiful, intuitive interface

## Prerequisites

Before running this client, make sure you have:

1. **LiveKit Server** running (see `../livekit-server/README.md`)
2. **Token Server** running (see `../simple-token-server/README.md`)
3. **Node.js** version 16+ installed

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** to `http://localhost:3000`

4. **Join a room**:
   - Enter a room name (e.g., "test-room")
   - Enter your name (e.g., "Alice")
   - Click "Join Room"

## Usage

### Joining a Room

1. Enter a room name (any string)
2. Enter your display name
3. Click "Join Room"
4. Allow camera and microphone permissions when prompted

### During the Call

- **Video Toggle**: Click the video button to enable/disable your camera
- **Audio Toggle**: Click the microphone button to mute/unmute
- **Leave Room**: Click the red phone button to disconnect
- **Participants Panel**: View all participants in the top-right panel

### Multiple Users

To test with multiple users:

1. Open the application in different browser tabs/windows
2. Join the same room name with different participant names
3. Each user will see all other participants' video streams

## Development

### Project Structure

```
client/
├── index.html          # Main HTML file
├── style.css           # Styles and responsive design
├── main.js             # LiveKit client logic
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
└── README.md           # This file
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Configuration

The client is configured to connect to:
- **LiveKit Server**: `ws://localhost:7880` (development)
- **Token Server**: `http://localhost:3001` (development)

For production, update these URLs in `main.js`.

## Troubleshooting

### Common Issues

1. **"Failed to access camera/microphone"**
   - Check browser permissions
   - Ensure no other applications are using the camera/microphone

2. **"Failed to join room"**
   - Verify LiveKit server is running on port 7880
   - Verify token server is running on port 3001
   - Check browser console for detailed error messages

3. **"Token server error"**
   - Ensure the token server is running
   - Check that the API keys match between token server and LiveKit server

4. **Video not showing**
   - Check camera permissions
   - Try refreshing the page
   - Check browser console for errors

### Debug Mode

Debug logging is automatically enabled in development mode. Check the browser console for detailed LiveKit events and connection information.

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Security Notes

- This client connects to local development servers
- For production, use HTTPS and secure WebSocket connections
- API keys should be kept secure and not exposed in client-side code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 