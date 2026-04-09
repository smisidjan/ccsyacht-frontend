#!/bin/bash

# Script to ensure nginx configurations have proper upload limits
# This provides a clean, maintainable solution for managing nginx configs

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SSH_KEY="$HOME/.ssh/css_key"
SERVER_USER="root"
SERVER_IP="167.235.135.241"
MAX_UPLOAD_SIZE="100M"

# Function to execute commands on server
ssh_exec() {
    ssh -o PasswordAuthentication=no -i $SSH_KEY $SERVER_USER@$SERVER_IP "$1"
}

echo -e "${YELLOW}🔧 Updating Nginx Configuration for Upload Limits${NC}"

# List of nginx configs that need upload limit
CONFIGS=(
    "/etc/nginx/sites-enabled/papertrail.ccsyacht.com"
    "/etc/nginx/sites-enabled/api.papertrail.ccsyacht.com"
)

for CONFIG in "${CONFIGS[@]}"; do
    echo -e "${YELLOW}Checking $CONFIG...${NC}"

    # Check if config exists
    EXISTS=$(ssh_exec "[ -f $CONFIG ] && echo 'yes' || echo 'no'")

    if [ "$EXISTS" = "yes" ]; then
        # Check if client_max_body_size already exists
        HAS_SETTING=$(ssh_exec "grep -q 'client_max_body_size' $CONFIG && echo 'yes' || echo 'no'")

        if [ "$HAS_SETTING" = "no" ]; then
            echo -e "${YELLOW}  Adding client_max_body_size to $CONFIG${NC}"
            ssh_exec "sed -i '/server_name/a\    \n    # Max upload size for document uploads\n    client_max_body_size $MAX_UPLOAD_SIZE;' $CONFIG"
        else
            echo -e "${GREEN}  ✓ client_max_body_size already configured in $CONFIG${NC}"
            # Update the value if it's different
            ssh_exec "sed -i 's/client_max_body_size.*;/client_max_body_size $MAX_UPLOAD_SIZE;/g' $CONFIG"
        fi
    else
        echo -e "${RED}  Config file not found: $CONFIG${NC}"
    fi
done

# Test nginx configuration
echo -e "${YELLOW}Testing nginx configuration...${NC}"
TEST_RESULT=$(ssh_exec "nginx -t 2>&1")

if echo "$TEST_RESULT" | grep -q "test is successful"; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"

    # Reload nginx
    echo -e "${YELLOW}Reloading nginx...${NC}"
    ssh_exec "systemctl reload nginx"
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed:${NC}"
    echo "$TEST_RESULT"
    exit 1
fi

echo -e "${GREEN}✨ Nginx configuration updated successfully!${NC}"
echo -e "${GREEN}Upload limit set to: $MAX_UPLOAD_SIZE${NC}"