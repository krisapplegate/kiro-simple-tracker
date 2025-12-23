#!/bin/bash

# Simple cleanup script for simulator directory
# This is a wrapper around the main cleanup script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_CLEANUP_SCRIPT="$SCRIPT_DIR/../scripts/cleanup-all-data.sh"

# Check if main cleanup script exists
if [ ! -f "$MAIN_CLEANUP_SCRIPT" ]; then
    echo "Error: Main cleanup script not found at $MAIN_CLEANUP_SCRIPT"
    exit 1
fi

# Pass all arguments to the main cleanup script
exec "$MAIN_CLEANUP_SCRIPT" "$@"