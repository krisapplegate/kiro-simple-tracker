#!/bin/bash

# Location Tracker - Complete Data Cleanup Script
# This script removes all objects from all tenants and cleans up MinIO storage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
DB_CONTAINER="simple-tracker-database-1"
MINIO_CONTAINER="simple-tracker-minio-1"
DB_USER="tracker_user"
DB_NAME="location_tracker"
MINIO_BUCKET="location-images"

# Show help
show_help() {
    cat << EOF
Location Tracker - Complete Data Cleanup Script

Usage: $0 [options]

This script will:
1. Delete all objects from all tenants (preserves users and tenants)
2. Delete all location history
3. Delete all images from database
4. Clean up all MinIO storage
5. Optionally stop running simulators

Options:
    --stop-simulators   Stop all running simulator containers first
    --keep-images       Keep MinIO images (only clean database records)
    --dry-run          Show what would be deleted without actually deleting
    --force            Skip confirmation prompts
    --help             Show this help

Examples:
    $0                          # Interactive cleanup with confirmation
    $0 --force                  # Force cleanup without confirmation
    $0 --stop-simulators        # Stop simulators first, then cleanup
    $0 --dry-run               # Show what would be deleted
    $0 --keep-images           # Clean database but keep MinIO files

WARNING: This will permanently delete all tracking data!
Make sure to backup any important data before running this script.

EOF
}

# Check if containers are running
check_containers() {
    print_status "Checking container status..."
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
        print_error "Database container '${DB_CONTAINER}' is not running"
        print_error "Please start the application with: docker-compose up -d"
        exit 1
    fi
    
    if ! docker ps --format "{{.Names}}" | grep -q "^${MINIO_CONTAINER}$"; then
        print_warning "MinIO container '${MINIO_CONTAINER}' is not running"
        print_warning "MinIO cleanup will be skipped"
        SKIP_MINIO=true
    fi
    
    print_success "Required containers are running"
}

# Stop simulator containers
stop_simulators() {
    print_status "Stopping all simulator containers..."
    
    local simulators=$(docker ps --filter "name=sim-" --format "{{.Names}}")
    if [ -z "$simulators" ]; then
        print_status "No simulator containers are running"
        return
    fi
    
    echo "$simulators" | while read container; do
        if [ ! -z "$container" ]; then
            print_status "Stopping $container..."
            docker stop "$container" >/dev/null 2>&1 || true
        fi
    done
    
    print_success "All simulators stopped"
}

# Get database statistics
get_db_stats() {
    print_status "Getting current database statistics..."
    
    local objects=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM objects;" 2>/dev/null | tr -d ' ')
    local locations=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM location_history;" 2>/dev/null | tr -d ' ')
    local images=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM images;" 2>/dev/null | tr -d ' ')
    local tenants=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(DISTINCT tenant_id) FROM objects;" 2>/dev/null | tr -d ' ')
    
    if [ $? -eq 0 ]; then
        print_status "Current data:"
        print_status "  - Objects: ${objects:-0}"
        print_status "  - Location records: ${locations:-0}" 
        print_status "  - Image records: ${images:-0}"
        print_status "  - Tenants with objects: ${tenants:-0}"
    else
        print_warning "Could not retrieve database statistics"
    fi
}

# Get MinIO statistics
get_minio_stats() {
    if [ "$SKIP_MINIO" = true ]; then
        return
    fi
    
    print_status "Getting MinIO storage statistics..."
    
    # Try to get object count from MinIO
    local minio_count=$(docker exec "$MINIO_CONTAINER" mc ls minio/"$MINIO_BUCKET"/images/ 2>/dev/null | wc -l || echo "0")
    print_status "  - MinIO objects: $minio_count"
}

# Clean database
clean_database() {
    print_status "Cleaning database..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would execute the following SQL commands:"
        echo "  DELETE FROM images;"
        echo "  DELETE FROM location_history;"
        echo "  DELETE FROM objects;"
        return
    fi
    
    # Delete in correct order due to foreign key constraints
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        DELETE FROM images;
        DELETE FROM location_history;
        DELETE FROM objects;
    " >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Database cleaned successfully"
    else
        print_error "Failed to clean database"
        exit 1
    fi
}

# Clean MinIO storage
clean_minio() {
    if [ "$SKIP_MINIO" = true ]; then
        print_status "Skipping MinIO cleanup (container not running)"
        return
    fi
    
    if [ "$KEEP_IMAGES" = true ]; then
        print_status "Skipping MinIO cleanup (--keep-images specified)"
        return
    fi
    
    print_status "Cleaning MinIO storage..."
    
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would remove all objects from MinIO bucket: $MINIO_BUCKET"
        return
    fi
    
    # Remove all objects from the bucket
    docker exec "$MINIO_CONTAINER" mc rm --recursive --force minio/"$MINIO_BUCKET"/images/ >/dev/null 2>&1 || true
    
    print_success "MinIO storage cleaned"
}

# Confirm action
confirm_action() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo ""
    print_warning "This will permanently delete ALL tracking data including:"
    print_warning "  - All objects from all tenants"
    print_warning "  - All location history"
    print_warning "  - All image records"
    if [ "$KEEP_IMAGES" != true ]; then
        print_warning "  - All MinIO image files"
    fi
    echo ""
    print_warning "Users and tenants will be preserved."
    echo ""
    
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_status "Operation cancelled"
        exit 0
    fi
}

# Main cleanup function
main_cleanup() {
    print_status "Starting complete data cleanup..."
    
    if [ "$STOP_SIMULATORS" = true ]; then
        stop_simulators
    fi
    
    check_containers
    get_db_stats
    get_minio_stats
    
    if [ "$DRY_RUN" != true ]; then
        confirm_action
    fi
    
    clean_database
    clean_minio
    
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN completed - no data was actually deleted"
    else
        print_success "Complete data cleanup finished!"
        print_status "The system is now clean and ready for fresh data"
    fi
}

# Parse command line arguments
STOP_SIMULATORS=false
KEEP_IMAGES=false
DRY_RUN=false
FORCE=false
SKIP_MINIO=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --stop-simulators)
            STOP_SIMULATORS=true
            shift
            ;;
        --keep-images)
            KEEP_IMAGES=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# Run main cleanup
main_cleanup