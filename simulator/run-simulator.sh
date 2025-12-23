#!/bin/bash

# Location Tracker Simulator Runner
# This script helps build and run the simulator with common configurations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="location-simulator"

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

# Show help
show_help() {
    cat << EOF
Location Tracker Simulator Runner

Usage: $0 [command] [options]

Commands:
    build           Build the Docker image
    run             Run simulator with default settings
    nyc             Run NYC taxi simulation (🚕)
    sf              Run San Francisco delivery truck (🚚)
    drone           Run circular drone patrol (🚁)
    pedestrian      Run random walking pedestrian (🚶)
    vehicle         Run general vehicle simulation (🚗)
    asset           Run asset tracking simulation (🚲)
    device          Run IoT device simulation (📱)
    multi           Run multiple simulators (with camera images enabled)
    stop            Stop all running simulators
    logs            Show logs from running simulators
    clean           Remove simulator containers and images
    cleanup         Clean all tracking data (objects, locations, images)
    help            Show this help

Options (for run command):
    --api-url URL           Backend API URL (default: http://localhost:3001)
    --name NAME             Object name
    --type TYPE             Object type
    --pattern PATTERN       Movement pattern (random|circle|square|street)
    --lat LAT               Center latitude
    --lng LNG               Center longitude
    --speed SPEED           Movement speed
    --interval MS           Update interval in milliseconds
    --verbose               Enable verbose logging
    --images                Enable camera image generation and upload
    --image-interval N      Upload image every N updates (default: 3)

Examples:
    $0 build                                    # Build the image
    $0 run                                      # Run with defaults
    $0 run --name "My Vehicle" --pattern circle # Custom vehicle
    $0 nyc                                      # NYC taxi simulation (🚕)
    $0 sf                                       # SF delivery truck (🚚)
    $0 drone                                    # Security drone patrol (🚁)
    $0 pedestrian                               # Walking pedestrian (🚶)
    $0 vehicle                                  # General vehicle (🚗)
    $0 asset                                    # Asset tracking (🚲)
    $0 device                                   # IoT device (📱)
    $0 multi                                    # Run multiple simulators
    $0 logs                                     # View logs
    $0 stop                                     # Stop all simulators
    $0 cleanup --dry-run                       # Preview data cleanup
    $0 cleanup --force                         # Clean all tracking data

EOF
}

# Build Docker image
build_image() {
    print_status "Building simulator Docker image..."
    cd "$SCRIPT_DIR"
    docker build -t "$IMAGE_NAME" .
    print_success "Image built successfully: $IMAGE_NAME"
}

# Check if image exists, build if not
ensure_image() {
    if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        print_warning "Image $IMAGE_NAME not found, building..."
        build_image
    fi
}

# Run simulator with custom parameters
run_simulator() {
    ensure_image
    
    local name="simulator-$$"
    local api_url="http://host.docker.internal:3001"
    local object_name="Simulator Vehicle"
    local object_type="vehicle"
    local pattern="random"
    local lat="40.7128"
    local lng="-74.0060"
    local speed="0.0001"
    local interval="5000"
    local verbose=""
    local images=""
    local image_interval="3"
    local extra_args=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --api-url)
                api_url="$2"
                shift 2
                ;;
            --name)
                object_name="$2"
                shift 2
                ;;
            --type)
                object_type="$2"
                shift 2
                ;;
            --pattern)
                pattern="$2"
                shift 2
                ;;
            --lat)
                lat="$2"
                shift 2
                ;;
            --lng)
                lng="$2"
                shift 2
                ;;
            --speed)
                speed="$2"
                shift 2
                ;;
            --interval)
                interval="$2"
                shift 2
                ;;
            --verbose)
                verbose="--verbose true"
                shift
                ;;
            --images)
                images="--includeImages true"
                shift
                ;;
            --image-interval)
                image_interval="$2"
                shift 2
                ;;
            *)
                extra_args="$extra_args $1"
                shift
                ;;
        esac
    done

    print_status "Starting simulator: $object_name"
    print_status "API URL: $api_url"
    print_status "Pattern: $pattern, Speed: $speed, Interval: ${interval}ms"

    docker run --rm --name "$name" "$IMAGE_NAME" \
        --apiUrl "$api_url" \
        --objectName "$object_name" \
        --objectType "$object_type" \
        --pattern "$pattern" \
        --centerLat "$lat" \
        --centerLng "$lng" \
        --speed "$speed" \
        --updateInterval "$interval" \
        $verbose \
        $images \
        --imageInterval "$image_interval" \
        $extra_args
}

# Predefined simulation scenarios
run_nyc_taxi() {
    print_status "Starting NYC Taxi simulation..."
    ensure_image
    
    # Remove existing container if it exists
    docker rm -f "sim-nyc-taxi" >/dev/null 2>&1 || true
    
    docker run -d --name "sim-nyc-taxi" "$IMAGE_NAME" \
        --apiUrl "http://host.docker.internal:3001" \
        --objectName "NYC Taxi #$(date +%s)" \
        --objectType "taxi" \
        --pattern "street" \
        --centerLat "40.7128" \
        --centerLng "-74.0060" \
        --speed "0.0002" \
        --updateInterval "3000" \
        --includeImages "true" \
        --imageInterval "2" \
        --verbose "true"
    print_success "NYC Taxi simulator started (container: sim-nyc-taxi)"
}

run_sf_delivery() {
    print_status "Starting San Francisco delivery truck simulation..."
    ensure_image
    
    # Remove existing container if it exists
    docker rm -f "sim-sf-delivery" >/dev/null 2>&1 || true
    
    docker run -d --name "sim-sf-delivery" "$IMAGE_NAME" \
        --apiUrl "http://host.docker.internal:3001" \
        --objectName "SF Delivery #$(date +%s)" \
        --objectType "delivery" \
        --pattern "street" \
        --centerLat "37.7749" \
        --centerLng "-122.4194" \
        --speed "0.0001" \
        --updateInterval "4000" \
        --includeImages "true" \
        --imageInterval "2" \
        --verbose "true"
    print_success "SF Delivery simulator started (container: sim-sf-delivery)"
}

run_drone() {
    print_status "Starting drone patrol simulation..."
    ensure_image
    
    # Remove existing container if it exists
    docker rm -f "sim-drone" >/dev/null 2>&1 || true
    
    docker run -d --name "sim-drone" "$IMAGE_NAME" \
        --apiUrl "http://host.docker.internal:3001" \
        --objectName "Security Drone #$(date +%s)" \
        --objectType "drone" \
        --pattern "circle" \
        --centerLat "40.7589" \
        --centerLng "-73.9851" \
        --speed "0.0003" \
        --updateInterval "2000" \
        --radius "0.005" \
        --includeImages "true" \
        --imageInterval "1" \
        --verbose "true"
    print_success "Drone simulator started (container: sim-drone)"
}

run_pedestrian() {
    print_status "Starting pedestrian simulation..."
    ensure_image
    
    # Remove existing container if it exists
    docker rm -f "sim-pedestrian" >/dev/null 2>&1 || true
    
    docker run -d --name "sim-pedestrian" "$IMAGE_NAME" \
        --apiUrl "http://host.docker.internal:3001" \
        --objectName "Pedestrian #$(date +%s)" \
        --objectType "person" \
        --pattern "random" \
        --centerLat "40.7505" \
        --centerLng "-73.9934" \
        --speed "0.00005" \
        --updateInterval "6000" \
        --radius "0.003" \
        --includeImages "true" \
        --imageInterval "3" \
        --verbose "true"
    print_success "Pedestrian simulator started (container: sim-pedestrian)"
}

run_vehicle() {
    print_status "Starting general vehicle simulation..."
    ensure_image
    
    # Remove existing container if it exists
    docker rm -f "sim-vehicle" >/dev/null 2>&1 || true
    
    docker run -d --name "sim-vehicle" "$IMAGE_NAME" \
        --apiUrl "http://host.docker.internal:3001" \
        --objectName "Vehicle #$(date +%s)" \
        --objectType "vehicle" \
        --pattern "street" \
        --centerLat "34.0522" \
        --centerLng "-118.2437" \
        --speed "0.0001" \
        --updateInterval "4500" \
        --includeImages "true" \
        --imageInterval "2" \
        --verbose "true"
    print_success "Vehicle simulator started (container: sim-vehicle)"
}

run_asset() {
    print_status "Starting asset tracking simulation..."
    ensure_image
    
    # Remove existing container if it exists
    docker rm -f "sim-asset" >/dev/null 2>&1 || true
    
    docker run -d --name "sim-asset" "$IMAGE_NAME" \
        --apiUrl "http://host.docker.internal:3001" \
        --objectName "Bike Share #$(date +%s)" \
        --objectType "asset" \
        --pattern "random" \
        --centerLat "41.8781" \
        --centerLng "-87.6298" \
        --speed "0.00008" \
        --updateInterval "8000" \
        --includeImages "true" \
        --imageInterval "4" \
        --verbose "true"
    print_success "Asset simulator started (container: sim-asset)"
}

run_device() {
    print_status "Starting IoT device simulation..."
    ensure_image
    
    # Remove existing container if it exists
    docker rm -f "sim-device" >/dev/null 2>&1 || true
    
    docker run -d --name "sim-device" "$IMAGE_NAME" \
        --apiUrl "http://host.docker.internal:3001" \
        --objectName "IoT Sensor #$(date +%s)" \
        --objectType "device" \
        --pattern "random" \
        --centerLat "47.6062" \
        --centerLng "-122.3321" \
        --speed "0.00002" \
        --updateInterval "10000" \
        --includeImages "true" \
        --imageInterval "5" \
        --verbose "true"
    print_success "Device simulator started (container: sim-device)"
}

run_multiple() {
    print_status "Starting multiple simulators..."
    run_nyc_taxi
    sleep 2
    run_sf_delivery
    sleep 2
    run_drone
    sleep 2
    run_pedestrian
    print_success "All simulators started!"
    print_status "Use '$0 logs' to view logs or '$0 stop' to stop all"
}

stop_simulators() {
    print_status "Stopping all simulator containers..."
    docker ps --filter "name=sim-" --format "{{.Names}}" | while read container; do
        if [ ! -z "$container" ]; then
            print_status "Stopping $container..."
            docker stop "$container" >/dev/null 2>&1 || true
        fi
    done
    print_success "All simulators stopped"
}

show_logs() {
    print_status "Showing logs from running simulators..."
    containers=$(docker ps --filter "name=sim-" --format "{{.Names}}")
    if [ -z "$containers" ]; then
        print_warning "No simulator containers are currently running"
        return
    fi
    
    echo "$containers" | while read container; do
        if [ ! -z "$container" ]; then
            print_status "Logs from $container:"
            docker logs --tail 10 "$container"
            echo ""
        fi
    done
}

clean_up() {
    print_status "Cleaning up simulator containers and images..."
    
    # Stop and remove containers
    docker ps -a --filter "name=sim-" --format "{{.Names}}" | while read container; do
        if [ ! -z "$container" ]; then
            print_status "Removing container $container..."
            docker rm -f "$container" >/dev/null 2>&1 || true
        fi
    done
    
    # Remove image
    if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        print_status "Removing image $IMAGE_NAME..."
        docker rmi "$IMAGE_NAME" >/dev/null 2>&1 || true
    fi
    
    print_success "Cleanup completed"
}

run_data_cleanup() {
    print_status "Running data cleanup script..."
    
    # Check if cleanup script exists
    local cleanup_script="$SCRIPT_DIR/cleanup-data.sh"
    if [ ! -f "$cleanup_script" ]; then
        print_error "Cleanup script not found at $cleanup_script"
        exit 1
    fi
    
    # Pass all remaining arguments to the cleanup script
    shift # Remove 'cleanup' from arguments
    exec "$cleanup_script" "$@"
}

# Main command handling
case "${1:-help}" in
    build)
        build_image
        ;;
    run)
        shift
        run_simulator "$@"
        ;;
    nyc)
        run_nyc_taxi
        ;;
    sf)
        run_sf_delivery
        ;;
    drone)
        run_drone
        ;;
    pedestrian)
        run_pedestrian
        ;;
    vehicle)
        run_vehicle
        ;;
    asset)
        run_asset
        ;;
    device)
        run_device
        ;;
    multi)
        run_multiple
        ;;
    stop)
        stop_simulators
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_up
        ;;
    cleanup)
        run_data_cleanup "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac