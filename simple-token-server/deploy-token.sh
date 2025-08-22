#!/bin/bash
# Deploy token server code to twarp, preserving .env

rsync -avz --progress --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env*' \
  ./ twarp:~/token-server/

ssh twarp <<'EOF'
cd ~/token-server
npm ci --omit=dev
pm2 restart token-server || pm2 start server.js --name token-server
EOF

echo "✅ Deployment complete."
