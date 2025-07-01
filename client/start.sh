#!/bin/bash

echo "🚀 Starting LiveKit Frontend Client..."
echo "📝 Make sure LiveKit server and token server are running first!"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🌐 Starting development server on http://localhost:3000"
echo "📱 Open your browser and join a room!"
echo ""

npm run dev 