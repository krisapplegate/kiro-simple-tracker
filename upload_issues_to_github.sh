#!/bin/bash

# Script to upload issues to GitHub using the API
# This uses the local git proxy which should have GitHub credentials

REPO="krisapplegate/kiro-simple-tracker"
API_URL="https://api.github.com/repos/$REPO/issues"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  GitHub Issue Creator for            ║${NC}"
echo -e "${BLUE}║  Location Tracker Architecture Review ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if we have issue files
if [ ! -d "github-issues" ]; then
    echo -e "${RED}Error: github-issues directory not found${NC}"
    echo "Run create_github_issues.py first"
    exit 1
fi

# Count issue files
ISSUE_COUNT=$(ls -1 github-issues/*.json 2>/dev/null | wc -l)
echo -e "Found ${GREEN}$ISSUE_COUNT${NC} issue files to create"
echo ""

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}Warning: GITHUB_TOKEN not set${NC}"
    echo "Please set your GitHub token:"
    echo "  export GITHUB_TOKEN='your_github_token'"
    echo ""
    echo "Or run with: GITHUB_TOKEN=your_token $0"
    echo ""
    echo "Get a token at: https://github.com/settings/tokens"
    echo "Required scopes: repo"
    exit 1
fi

# Function to create a single issue
create_issue() {
    local issue_file="$1"
    local issue_num=$(basename "$issue_file" .json | grep -oE '[0-9]+')

    echo -e "${BLUE}Creating issue from: $issue_file${NC}"

    # Use curl to create the issue
    response=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Content-Type: application/json" \
        -d @"$issue_file" \
        "$API_URL")

    # Check if successful
    issue_url=$(echo "$response" | grep -oP '"html_url":\s*"\K[^"]+' | head -1)

    if [ -n "$issue_url" ]; then
        echo -e "${GREEN}✓ Created:${NC} $issue_url"
        return 0
    else
        error_msg=$(echo "$response" | grep -oP '"message":\s*"\K[^"]+')
        echo -e "${RED}✗ Failed: $error_msg${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Create all issues
created=0
failed=0

for issue_file in github-issues/phase*.json; do
    if [ -f "$issue_file" ]; then
        if create_issue "$issue_file"; then
            ((created++))
        else
            ((failed++))
        fi
        echo ""
        # Rate limiting: wait 1 second between requests
        sleep 1
    fi
done

echo ""
echo -e "${BLUE}╔════════════════════════════╗${NC}"
echo -e "${BLUE}║  Issue Creation Summary    ║${NC}"
echo -e "${BLUE}╚════════════════════════════╝${NC}"
echo -e "Total issues: ${BLUE}$ISSUE_COUNT${NC}"
echo -e "Created:      ${GREEN}$created${NC}"
echo -e "Failed:       ${RED}$failed${NC}"
echo ""

if [ $created -gt 0 ]; then
    echo -e "${GREEN}✓ Issues created successfully!${NC}"
    echo -e "View all issues: https://github.com/$REPO/issues"
else
    echo -e "${RED}No issues were created. Please check errors above.${NC}"
    exit 1
fi
