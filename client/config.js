// Configuration file for LiveKit client
// Update these URLs to point to your remote servers

const BASE_CONFIG = {
    // Your remote LiveKit server WebSocket URL
    // Use wss:// for secure connections (recommended for production)
    LIVEKIT_SERVER_URL: 'wss://twarp.cs.byu.edu/livekit/',
    
    // Your remote token server base URL  
    // Use https:// for secure connections (recommended for production)
    TOKEN_SERVER_URL: 'https://twarp.cs.byu.edu',
};

// Example URLs:
// LIVEKIT_SERVER_URL: 'wss://livekit.yourdomain.com'
// TOKEN_SERVER_URL: 'https://tokens.yourdomain.com'

export const CONFIG = {
    // Getter methods to support environment variable overrides
    get livekitUrl() {
        return import.meta.env.VITE_LIVEKIT_SERVER_URL || BASE_CONFIG.LIVEKIT_SERVER_URL;
    },
    
    get tokenServerUrl() {
        return import.meta.env.VITE_TOKEN_SERVER_URL || BASE_CONFIG.TOKEN_SERVER_URL;
    }
}; 