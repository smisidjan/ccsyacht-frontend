#!/bin/bash

# Docker deployment for CCS Yacht Frontend
set -e

echo "🚀 Docker Build & Deploy - CCS Yacht Frontend"

# Build locally without buildx (regular Docker build)
echo "📦 Building Docker image..."
docker build -t ccsyacht-frontend:latest --target production .

# Save the image
echo "💾 Saving Docker image..."
docker save ccsyacht-frontend:latest | gzip > ccsyacht-frontend.tar.gz

# Check size
SIZE=$(ls -lh ccsyacht-frontend.tar.gz | awk '{print $5}')
echo "✅ Docker image saved: ccsyacht-frontend.tar.gz ($SIZE)"

echo ""
echo "📋 Manual deployment steps:"
echo ""
echo "1. Upload the image to server:"
echo "   scp ccsyacht-frontend.tar.gz deploy@167.235.135.241:/tmp/"
echo ""
echo "2. On server, load and run:"
echo "   ssh deploy@167.235.135.241"
echo "   cd /srv/applications/ccsyacht-frontend"
echo "   docker load < /tmp/ccsyacht-frontend.tar.gz"
echo "   docker stop ccsyacht-frontend && docker rm ccsyacht-frontend"
echo "   docker run -d --name ccsyacht-frontend -p 127.0.0.1:3000:3000 --network ccsyacht-network --restart unless-stopped ccsyacht-frontend:latest"
echo ""
echo "✅ Image ready for deployment!"