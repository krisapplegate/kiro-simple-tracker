#!/bin/bash

# Location Tracker Docker Startup Script

echo "🚀 Location Tracker Docker Setup"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [dev|prod|stop|logs|clean|db|health|backup|restore|migrate]"
    echo ""
    echo "Main Commands:"
    echo "  dev     - Start development environment (default)"
    echo "  prod    - Start production environment"
    echo "  stop    - Stop all containers"
    echo "  logs    - Show container logs"
    echo "  clean   - Stop containers and remove volumes (⚠️  removes data)"
    echo ""
    echo "Database Commands:"
    echo "  db      - Access database shell"
    echo "  migrate - Run database migrations"
    echo "  health  - Check application health"
    echo "  backup  - Backup database to file"
    echo "  restore - Restore database from backup"
    echo ""
}

# Default to development if no argument provided
MODE=${1:-dev}

case $MODE in
    "dev")
        echo "🔧 Starting development environment..."
        echo "Frontend:  http://localhost:3000"
        echo "Backend:   http://localhost:3001"
        echo "Database:  PostgreSQL on port 5432"
        echo "Health:    http://localhost:3001/api/health"
        echo ""
        echo "Starting containers..."
        docker-compose up --build -d
        echo ""
        echo "✅ Development containers started in background"
        echo "📊 Check status: docker-compose ps"
        echo "📋 View logs:    $0 logs"
        echo "🛑 Stop:         $0 stop"
        ;;
    "prod")
        echo "🏭 Starting production environment..."
        echo "Application: http://localhost"
        echo "Backend API: http://localhost:3001"
        echo "Database:    PostgreSQL (internal)"
        echo ""
        echo "Starting production containers..."
        docker-compose -f docker-compose.prod.yml up --build -d
        echo ""
        echo "✅ Production containers started in background"
        echo "📊 Check status: docker-compose -f docker-compose.prod.yml ps"
        echo "📋 View logs:    $0 logs"
        echo "🛑 Stop:         $0 stop"
        ;;
    "stop")
        echo "🛑 Stopping all containers..."
        docker-compose down
        docker-compose -f docker-compose.prod.yml down
        echo "✅ All containers stopped"
        ;;
    "logs")
        echo "📋 Showing container logs (Ctrl+C to exit)..."
        if docker-compose ps | grep -q "Up"; then
            docker-compose logs -f
        elif docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
            docker-compose -f docker-compose.prod.yml logs -f
        else
            echo "❌ No running containers found"
        fi
        ;;
    "clean")
        echo "🧹 Cleaning up containers and volumes..."
        echo "⚠️  This will remove all data including the database!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker-compose -f docker-compose.prod.yml down -v
            docker system prune -f
            echo "✅ Cleanup complete - all data removed"
        else
            echo "❌ Cleanup cancelled"
        fi
        ;;
    "db")
        echo "🗄️  Accessing database shell..."
        if docker-compose ps | grep -q "database.*Up"; then
            docker-compose exec database psql -U tracker_user -d location_tracker
        elif docker-compose -f docker-compose.prod.yml ps | grep -q "database.*Up"; then
            docker-compose -f docker-compose.prod.yml exec database psql -U tracker_user -d location_tracker
        else
            echo "❌ Database container not running. Start with '$0 dev' or '$0 prod' first."
            exit 1
        fi
        ;;
    "health")
        echo "🏥 Checking application health..."
        if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "✅ Backend is healthy"
            curl -s http://localhost:3001/api/health | jq . 2>/dev/null || curl -s http://localhost:3001/api/health
        else
            echo "❌ Backend is not responding"
        fi
        
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Frontend is accessible"
        else
            echo "❌ Frontend is not accessible"
        fi
        ;;
    "backup")
        echo "💾 Creating database backup..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        if docker-compose ps | grep -q "database.*Up"; then
            docker-compose exec -T database pg_dump -U tracker_user -d location_tracker > "$BACKUP_FILE"
            echo "✅ Database backed up to: $BACKUP_FILE"
        elif docker-compose -f docker-compose.prod.yml ps | grep -q "database.*Up"; then
            docker-compose -f docker-compose.prod.yml exec -T database pg_dump -U tracker_user -d location_tracker > "$BACKUP_FILE"
            echo "✅ Database backed up to: $BACKUP_FILE"
        else
            echo "❌ Database container not running"
            exit 1
        fi
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "❌ Please specify backup file: $0 restore <backup_file.sql>"
            exit 1
        fi
        
        if [ ! -f "$2" ]; then
            echo "❌ Backup file not found: $2"
            exit 1
        fi
        
        echo "🔄 Restoring database from: $2"
        echo "⚠️  This will overwrite existing data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if docker-compose ps | grep -q "database.*Up"; then
                docker-compose exec -T database psql -U tracker_user -d location_tracker < "$2"
                echo "✅ Database restored successfully"
            elif docker-compose -f docker-compose.prod.yml ps | grep -q "database.*Up"; then
                docker-compose -f docker-compose.prod.yml exec -T database psql -U tracker_user -d location_tracker < "$2"
                echo "✅ Database restored successfully"
            else
                echo "❌ Database container not running"
                exit 1
            fi
        else
            echo "❌ Restore cancelled"
        fi
        ;;
    "migrate")
        echo "🗄️  Running database migrations..."
        if [ -f "scripts/migrate.sh" ]; then
            ./scripts/migrate.sh
        else
            echo "❌ Migration script not found. Running manual migration..."
            if docker-compose ps database | grep -q "Up"; then
                docker-compose exec -T database psql -U tracker_user -d location_tracker < database/migrate_add_created_by.sql
                echo "✅ Migration completed"
            else
                echo "❌ Database container not running. Start with '$0 dev' first."
                exit 1
            fi
        fi
        ;;
    *)
        echo "❌ Unknown command: $MODE"
        show_usage
        exit 1
        ;;
esac