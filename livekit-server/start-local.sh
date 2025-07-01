#!/bin/bash

# LiveKit Local Development Startup Script

echo "🚀 Starting LiveKit Server for Local Development..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if ports are available
if lsof -Pi :7880 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 7880 is already in use. Stopping existing containers..."
    docker compose down
fi

if lsof -Pi :7882 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 7882 is already in use. Please free up the port and try again."
    exit 1
fi

# Start the LiveKit server
echo "📦 Starting LiveKit server container..."
docker compose up -d

# Wait for the server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 5

# Check if the server is running
if curl -s http://localhost:7880 > /dev/null 2>&1; then
    echo "✅ LiveKit server is running!"
    echo ""
    echo "📋 Server Information:"
    echo "   URL: ws://localhost:7880"
    echo "   HTTP Port: 7880"
    echo "   UDP Port: 7882"
    echo "   API Key: APIrCXwmt7s57ZW"
    echo ""
    
    # Ask if user wants to run tests
    read -p "🧪 Would you like to run the test suite? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Running tests..."
        cd test
        npm install
        cd ..
        node test-local.js
    fi
    
    echo ""
    echo "🎯 Your LiveKit server is ready for development!"
    echo "   Use 'docker compose logs -f' to view logs"
    echo "   Use 'docker compose down' to stop the server"
    
else
    echo "❌ Failed to start LiveKit server. Check the logs:"
    docker compose logs
    exit 1
fi 