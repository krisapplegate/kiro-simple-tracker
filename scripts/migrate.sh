#!/bin/bash

# Database Migration Script for Location Tracker
# This script runs database migrations safely

echo "🗄️  Location Tracker Database Migration"
echo "======================================"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed or not in PATH"
    exit 1
fi

# Check if database container is running
if ! docker-compose ps database | grep -q "Up"; then
    echo "❌ Database container is not running"
    echo "💡 Start it with: docker-compose up -d database"
    exit 1
fi

echo "✅ Database container is running"

# Function to run migration SQL
run_migration() {
    local migration_file="$1"
    local migration_name="$2"
    
    echo "🔄 Running migration: $migration_name"
    
    if [ ! -f "$migration_file" ]; then
        echo "❌ Migration file not found: $migration_file"
        return 1
    fi
    
    if docker-compose exec -T database psql -U tracker_user -d location_tracker < "$migration_file"; then
        echo "✅ Migration completed: $migration_name"
        return 0
    else
        echo "❌ Migration failed: $migration_name"
        return 1
    fi
}

# Run available migrations
echo ""
echo "Running available migrations..."

# Migration 1: Add created_by column
if run_migration "database/migrate_add_created_by.sql" "Add created_by column"; then
    echo "✅ Migration 1 completed"
else
    echo "❌ Migration 1 failed"
    exit 1
fi

echo ""
echo "🎉 All migrations completed successfully!"
echo ""
echo "You can now:"
echo "  - Start the backend: docker-compose up -d backend"
echo "  - Start the frontend: docker-compose up -d frontend"
echo "  - Check health: curl http://localhost:3001/api/health"