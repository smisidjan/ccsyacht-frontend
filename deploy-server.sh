#!/bin/bash

# Server-based deployment script for CCS Yacht Frontend
# This builds the Docker image directly on the server to avoid platform issues

set -e

# Configuration
SERVER_IP="167.235.135.241"
SERVER_USER="root"
SSH_KEY="~/.ssh/css_key"
REMOTE_DIR="/root/ccsyacht-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting CCS Yacht Frontend Server Deployment${NC}"

# Function to execute SSH commands
ssh_exec() {
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "$1"
}

# Step 1: Create directory structure on server
echo -e "${YELLOW}📁 Creating remote directory structure...${NC}"
ssh_exec "mkdir -p $REMOTE_DIR"

# Step 2: Copy all necessary files to server
echo -e "${YELLOW}📤 Copying project files to server...${NC}"
# Create a temporary tar file excluding node_modules and .next
tar --exclude='node_modules' --exclude='.next' --exclude='.git' -czf frontend.tar.gz .
scp -i $SSH_KEY frontend.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
rm frontend.tar.gz

# Step 3: Extract files on server
echo -e "${YELLOW}📦 Extracting files on server...${NC}"
ssh_exec "cd $REMOTE_DIR && tar -xzf frontend.tar.gz && rm frontend.tar.gz"

# Step 4: Copy production env file
echo -e "${YELLOW}🔐 Setting up environment variables...${NC}"
scp -i $SSH_KEY .env.production $SERVER_USER@$SERVER_IP:$REMOTE_DIR/.env

# Step 5: Stop existing container if running
echo -e "${YELLOW}🛑 Stopping existing container (if any)...${NC}"
ssh_exec "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml down || true"

# Step 6: Build Docker image on server
echo -e "${YELLOW}🔨 Building Docker image on server (this may take a few minutes)...${NC}"
ssh_exec "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml build --no-cache"

# Step 7: Start the new container
echo -e "${YELLOW}🎯 Starting new container...${NC}"
ssh_exec "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d"

# Step 8: Wait for container to be ready
echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 5

# Step 9: Check container status
echo -e "${YELLOW}✅ Checking container status...${NC}"
ssh_exec "docker ps | grep ccsyacht-frontend"

# Step 10: Check container logs
echo -e "${YELLOW}📋 Container logs:${NC}"
ssh_exec "docker logs --tail 20 ccsyacht-frontend"

# Step 11: Copy nginx configuration
echo -e "${YELLOW}🔧 Setting up nginx configuration...${NC}"
scp -i $SSH_KEY nginx-frontend.conf $SERVER_USER@$SERVER_IP:/etc/nginx/sites-available/ccsyacht-frontend
ssh_exec "ln -sf /etc/nginx/sites-available/ccsyacht-frontend /etc/nginx/sites-enabled/ || true"

# Step 12: Test nginx configuration
echo -e "${YELLOW}🔍 Testing nginx configuration...${NC}"
ssh_exec "nginx -t"

# Step 13: Reload nginx
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
ssh_exec "systemctl reload nginx"

echo -e "${GREEN}✨ Deployment completed!${NC}"
echo -e "${GREEN}🌐 Frontend should be accessible at:${NC}"
echo -e "${GREEN}   - http://$SERVER_IP:3000 (direct)${NC}"
echo -e "${GREEN}   - http://papertrail.ccsyacht.com (via nginx)${NC}"
echo -e "${GREEN}📝 API is proxied to backend on port 9000${NC}"