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
    echo "Usage: $0 [dev|prod|stop|logs|clean|db|health|backup|restore|migrate|test|test-unit|test-api|test-ui|test-setup|test-cleanup]"
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
    echo "Testing Commands:"
    echo "  test         - Run all tests (unit + integration + UI)"
    echo "  test-unit    - Run unit tests only"
    echo "  test-api     - Run API integration tests only"
    echo "  test-ui      - Run UI tests with Playwright"
    echo "  test-rbac    - Run RBAC-specific tests"
    echo "  test-setup   - Setup test environment"
    echo "  test-cleanup - Cleanup test data and containers"
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
    "test")
        echo "🧪 Running all tests..."
        echo "================================"
        
        # Ensure application is running
        if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "🚀 Starting test environment..."
            $0 dev
            echo "⏳ Waiting for services to be ready..."
            sleep 15
            
            # Wait for backend to be ready
            timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done' || {
                echo "❌ Backend failed to start"
                exit 1
            }
            
            # Wait for frontend to be ready
            timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done' || {
                echo "❌ Frontend failed to start"
                exit 1
            }
        fi
        
        echo "✅ Test environment ready"
        echo ""
        
        # Run tests in order
        echo "1️⃣ Running unit tests..."
        npm run test:unit || {
            echo "❌ Unit tests failed"
            exit 1
        }
        
        echo ""
        echo "2️⃣ Running API integration tests..."
        npm run test:api || {
            echo "❌ API tests failed"
            exit 1
        }
        
        echo ""
        echo "3️⃣ Running UI tests..."
        if command -v npx > /dev/null 2>&1; then
            if [ ! -d "node_modules/@playwright" ]; then
                echo "📦 Installing Playwright browsers..."
                npx playwright install
            fi
            npm run test:ui || {
                echo "❌ UI tests failed"
                exit 1
            }
        else
            echo "⚠️  Playwright not available, skipping UI tests"
        fi
        
        echo ""
        echo "🎉 All tests passed successfully!"
        ;;
    "test-unit")
        echo "🧪 Running unit tests..."
        echo "========================"
        
        if [ ! -f "package.json" ]; then
            echo "❌ package.json not found. Run from project root."
            exit 1
        fi
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing dependencies..."
            npm install
        fi
        
        # Run unit tests with coverage
        npm run test:unit:coverage || {
            echo "❌ Unit tests failed"
            exit 1
        }
        
        echo "✅ Unit tests completed successfully"
        echo "📊 Coverage report available in coverage/ directory"
        ;;
    "test-api")
        echo "🌐 Running API integration tests..."
        echo "==================================="
        
        # Ensure backend is running
        if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "🚀 Starting backend for API tests..."
            $0 dev
            echo "⏳ Waiting for backend to be ready..."
            timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done' || {
                echo "❌ Backend failed to start"
                exit 1
            }
        fi
        
        echo "✅ Backend is ready"
        
        # Run API tests
        npm run test:api || {
            echo "❌ API tests failed"
            exit 1
        }
        
        echo "✅ API tests completed successfully"
        ;;
    "test-ui")
        echo "🖥️  Running UI tests with Playwright..."
        echo "======================================"
        
        # Ensure full application is running
        if ! curl -s http://localhost:3000 > /dev/null 2>&1 || ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "🚀 Starting full application for UI tests..."
            $0 dev
            echo "⏳ Waiting for services to be ready..."
            sleep 15
            
            timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done' || {
                echo "❌ Backend failed to start"
                exit 1
            }
            
            timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done' || {
                echo "❌ Frontend failed to start"
                exit 1
            }
        fi
        
        echo "✅ Application is ready"
        
        # Install Playwright if needed
        if [ ! -d "node_modules/@playwright" ]; then
            echo "📦 Installing Playwright browsers..."
            npx playwright install
        fi
        
        # Run UI tests
        npm run test:ui || {
            echo "❌ UI tests failed"
            exit 1
        }
        
        echo "✅ UI tests completed successfully"
        echo "📊 Test report available in playwright-report/ directory"
        ;;
    "test-rbac")
        echo "🔐 Running RBAC-specific tests..."
        echo "================================="
        
        # Ensure application is running
        if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "🚀 Starting application for RBAC tests..."
            $0 dev
            echo "⏳ Waiting for backend to be ready..."
            timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done' || {
                echo "❌ Backend failed to start"
                exit 1
            }
        fi
        
        echo "✅ Backend is ready"
        
        # Run RBAC unit tests
        echo "1️⃣ Running RBAC unit tests..."
        npm run test:unit tests/unit/rbac.test.js || {
            echo "❌ RBAC unit tests failed"
            exit 1
        }
        
        # Run RBAC API tests
        echo ""
        echo "2️⃣ Running RBAC API tests..."
        npm run test:api || {
            echo "❌ RBAC API tests failed"
            exit 1
        }
        
        # Validate RBAC system integrity
        echo ""
        echo "3️⃣ Validating RBAC system integrity..."
        
        # Test admin login
        TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
          -H "Content-Type: application/json" \
          -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token' 2>/dev/null)
        
        if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
            echo "❌ Failed to authenticate admin user"
            exit 1
        fi
        
        # Verify admin has all permissions
        PERM_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" \
          http://localhost:3001/api/auth/validate | jq '.permissions | length' 2>/dev/null)
        
        if [ "$PERM_COUNT" != "32" ]; then
            echo "❌ Admin should have 32 permissions, got $PERM_COUNT"
            exit 1
        fi
        
        # Verify roles exist
        ROLE_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" \
          http://localhost:3001/api/rbac/roles | jq 'length' 2>/dev/null)
        
        if [ "$ROLE_COUNT" -lt "6" ]; then
            echo "❌ Should have at least 6 roles, got $ROLE_COUNT"
            exit 1
        fi
        
        # Verify permissions exist
        TOTAL_PERMS=$(curl -s -H "Authorization: Bearer $TOKEN" \
          http://localhost:3001/api/rbac/permissions | jq 'length' 2>/dev/null)
        
        if [ "$TOTAL_PERMS" != "32" ]; then
            echo "❌ Should have exactly 32 permissions, got $TOTAL_PERMS"
            exit 1
        fi
        
        echo "✅ RBAC system validation passed"
        echo "✅ Admin has $PERM_COUNT permissions"
        echo "✅ System has $ROLE_COUNT roles"
        echo "✅ System has $TOTAL_PERMS total permissions"
        echo ""
        echo "🎉 All RBAC tests completed successfully!"
        ;;
    "test-setup")
        echo "🔧 Setting up test environment..."
        echo "================================"
        
        # Install dependencies
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing dependencies..."
            npm install
        fi
        
        # Install test dependencies
        echo "📦 Installing test dependencies..."
        npm install --save-dev vitest @vitest/coverage-v8 @playwright/test supertest jest
        
        # Install Playwright browsers
        if command -v npx > /dev/null 2>&1; then
            echo "🎭 Installing Playwright browsers..."
            npx playwright install
        fi
        
        # Start application
        echo "🚀 Starting application..."
        $0 dev
        
        # Wait for services
        echo "⏳ Waiting for services to be ready..."
        sleep 15
        
        timeout 60 bash -c 'until curl -f http://localhost:3001/api/health; do sleep 2; done' || {
            echo "❌ Backend failed to start"
            exit 1
        }
        
        timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done' || {
            echo "❌ Frontend failed to start"
            exit 1
        }
        
        echo "✅ Test environment setup complete"
        echo "🧪 Ready to run tests with:"
        echo "   $0 test         # All tests"
        echo "   $0 test-unit    # Unit tests only"
        echo "   $0 test-api     # API tests only"
        echo "   $0 test-ui      # UI tests only"
        echo "   $0 test-rbac    # RBAC tests only"
        ;;
    "test-cleanup")
        echo "🧹 Cleaning up test environment..."
        echo "=================================="
        
        # Stop containers
        echo "🛑 Stopping containers..."
        $0 stop
        
        # Clean up test artifacts
        echo "🗑️  Removing test artifacts..."
        rm -rf coverage/ 2>/dev/null || true
        rm -rf playwright-report/ 2>/dev/null || true
        rm -rf test-results/ 2>/dev/null || true
        rm -rf .nyc_output/ 2>/dev/null || true
        
        # Clean up node_modules if requested
        read -p "Remove node_modules? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📦 Removing node_modules..."
            rm -rf node_modules/
        fi
        
        # Clean up Docker resources
        read -p "Clean up Docker resources? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🐳 Cleaning Docker resources..."
            docker system prune -f
        fi
        
        echo "✅ Test cleanup complete"
        ;;
    *)
        echo "❌ Unknown command: $MODE"
        show_usage
        exit 1
        ;;
esac