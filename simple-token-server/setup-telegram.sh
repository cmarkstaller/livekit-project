#!/bin/bash

# Setup script for Telegram bot integration
echo "🤖 Setting up Telegram bot integration..."

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN environment variable is not set"
    echo "Please set it first: export TELEGRAM_BOT_TOKEN='your_bot_token_here'"
    exit 1
fi

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Server is not running on port 3001"
    echo "Please start the server first: npm start"
    exit 1
fi

# Get your server's public URL (you'll need to update this)
SERVER_URL="http://localhost:3001"
echo "📡 Setting webhook to: $SERVER_URL/telegram-webhook"

# Set the webhook
RESPONSE=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -d "url=$SERVER_URL/telegram-webhook")

echo "📤 Webhook response: $RESPONSE"

# Test the webhook
echo "🧪 Testing webhook..."
TEST_RESPONSE=$(curl -s -X POST "$SERVER_URL/telegram-webhook" \
    -H "Content-Type: application/json" \
    -d '{"message":{"text":"/help","chat":{"id":123},"from":{"id":123}}}')

echo "📥 Test response: $TEST_RESPONSE"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure your server is accessible from the internet (or use ngrok for local development)"
echo "2. Update the SERVER_URL in this script to your public URL"
echo "3. Test the bot by sending /help to your bot on Telegram"
echo ""
echo "For local development with ngrok:"
echo "ngrok http 3001"
echo "Then update SERVER_URL to your ngrok URL" 