#!/bin/bash

echo "🚀 Simple Deploy - CCS Yacht Frontend"
echo "Building and deploying on server..."

# SSH command to build and deploy on the server
ssh deploy@167.235.135.241 << 'EOF'
cd /srv/applications/ccsyacht-frontend

echo "📥 Pulling latest code..."
git pull

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building application..."
npm run build

echo "🐳 Building Docker image..."
docker build -t ccsyacht-frontend .

echo "🔄 Restarting container..."
docker stop ccsyacht-frontend 2>/dev/null || true
docker rm ccsyacht-frontend 2>/dev/null || true

docker run -d \
  --name ccsyacht-frontend \
  -p 127.0.0.1:3000:3000 \
  --network ccsyacht-network \
  --restart unless-stopped \
  ccsyacht-frontend

echo "✅ Deployment complete!"
docker ps | grep ccsyacht-frontend
EOF