#!/bin/bash

# Setup GitHub Secrets for automatic deployment
# This script configures all necessary secrets for GitHub Actions deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 GitHub Actions Deployment Setup${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Please install it first:"
    echo "  brew install gh"
    echo "  gh auth login"
    exit 1
fi

# Check if we're authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Please authenticate with GitHub:${NC}"
    gh auth login
fi

# Get repository name
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo -e "${YELLOW}Enter your GitHub repository (e.g., username/ccsyacht-frontend):${NC}"
    read REPO
fi

echo -e "${GREEN}Setting up secrets for: $REPO${NC}"

# Set SERVER_HOST
echo -e "${YELLOW}Setting SERVER_HOST...${NC}"
gh secret set SERVER_HOST --body="167.235.135.241" --repo="$REPO"

# Set SERVER_USER
echo -e "${YELLOW}Setting SERVER_USER...${NC}"
gh secret set SERVER_USER --body="root" --repo="$REPO"

# Set SERVER_SSH_KEY
echo -e "${YELLOW}Setting SERVER_SSH_KEY...${NC}"
gh secret set SERVER_SSH_KEY --body="$(cat ~/.ssh/css_key)" --repo="$REPO"

echo -e "${GREEN}✅ All secrets configured!${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Commit and push the GitHub Actions workflow:"
echo "   git add .github/workflows/deploy.yml"
echo "   git commit -m 'Add GitHub Actions deployment'"
echo "   git push origin main"
echo ""
echo "2. Check your deployment at:"
echo "   https://github.com/$REPO/actions"
echo ""
echo "3. Every push to 'main' will now automatically deploy!"
echo ""
echo -e "${YELLOW}Optional: Add environment variables as secrets:${NC}"
echo "   gh secret set NEXT_PUBLIC_API_URL --body='your-api-url' --repo='$REPO'"
echo "   gh secret set DATABASE_URL --body='your-database-url' --repo='$REPO'"