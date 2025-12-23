#!/usr/bin/env python3
"""
Bulk create GitHub issues from JSON files
"""

import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: requests module not found")
    print("Install with: pip install requests")
    sys.exit(1)

# Configuration
REPO_OWNER = "krisapplegate"
REPO_NAME = "kiro-simple-tracker"
GITHUB_API_URL = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues"
ISSUES_DIR = "github-issues"

def get_github_token():
    """Get GitHub token from environment"""
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        print("❌ Error: GITHUB_TOKEN environment variable not set")
        print()
        print("To fix this:")
        print("  1. Go to https://github.com/settings/tokens")
        print("  2. Generate new token (classic)")
        print("  3. Select 'repo' scope")
        print("  4. Copy the token")
        print("  5. Run: export GITHUB_TOKEN='your_token_here'")
        print()
        sys.exit(1)
    return token

def create_issue(token, issue_data, filename):
    """Create a single GitHub issue"""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(GITHUB_API_URL, headers=headers, json=issue_data)

        if response.status_code == 201:
            issue_url = response.json().get('html_url')
            issue_number = response.json().get('number')
            return True, issue_number, issue_url
        else:
            error_msg = response.json().get('message', 'Unknown error')
            return False, None, error_msg
    except Exception as e:
        return False, None, str(e)

def main():
    print("=" * 60)
    print("  GitHub Bulk Issue Creator")
    print("  Architecture Review - Location Tracker")
    print("=" * 60)
    print()

    # Check if issues directory exists
    if not os.path.exists(ISSUES_DIR):
        print(f"❌ Error: {ISSUES_DIR} directory not found")
        sys.exit(1)

    # Get GitHub token
    token = get_github_token()
    print("✓ GitHub token found")
    print()

    # Get all issue JSON files
    issue_files = sorted(Path(ISSUES_DIR).glob("phase*.json"))
    print(f"Found {len(issue_files)} issue files")
    print()

    # Confirm before creating
    print("This will create the following issues:")
    for issue_file in issue_files:
        with open(issue_file) as f:
            data = json.load(f)
        print(f"  - {issue_file.name}: {data['title']}")
    print()

    response = input("Proceed with creating these issues? [y/N]: ")
    if response.lower() != 'y':
        print("Cancelled.")
        sys.exit(0)
    print()

    # Create issues
    created = []
    failed = []

    print("Creating issues...")
    print("-" * 60)

    for issue_file in issue_files:
        with open(issue_file) as f:
            issue_data = json.load(f)

        print(f"Creating: {issue_file.name}...", end=" ")

        success, issue_number, result = create_issue(token, issue_data, issue_file.name)

        if success:
            print(f"✓ #{issue_number}")
            print(f"  URL: {result}")
            created.append((issue_file.name, issue_number, result))
        else:
            print(f"✗ Failed")
            print(f"  Error: {result}")
            failed.append((issue_file.name, result))

        # Rate limiting: wait 1 second between requests
        time.sleep(1)

    print()
    print("=" * 60)
    print("  Summary")
    print("=" * 60)
    print(f"Total issues: {len(issue_files)}")
    print(f"Created:      {len(created)} ✓")
    print(f"Failed:       {len(failed)} ✗")
    print()

    if created:
        print("Successfully created issues:")
        for filename, number, url in created:
            print(f"  #{number}: {filename}")
        print()
        print(f"View all issues: https://github.com/{REPO_OWNER}/{REPO_NAME}/issues")

    if failed:
        print()
        print("Failed issues:")
        for filename, error in failed:
            print(f"  {filename}: {error}")

    if failed:
        sys.exit(1)
    else:
        print()
        print("✓ All issues created successfully!")

if __name__ == "__main__":
    main()
