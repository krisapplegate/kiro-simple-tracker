# Data Cleanup Guide

This guide explains how to clean up tracking data from the Location Tracker application.

## Overview

The cleanup scripts help you remove all tracking data while preserving the application structure (users, tenants, configurations). This is useful for:

- **Development**: Resetting data between testing sessions
- **Demos**: Starting with a clean slate
- **Maintenance**: Clearing old data periodically
- **Troubleshooting**: Removing corrupted data

## What Gets Cleaned

### Database Records
- ✅ **Objects**: All tracked objects from all tenants
- ✅ **Location History**: All location update records
- ✅ **Images**: All image metadata records
- ❌ **Users**: Preserved (login accounts)
- ❌ **Tenants**: Preserved (workspaces)
- ❌ **Object Type Configs**: Preserved (emoji icons)

### MinIO Storage
- ✅ **Image Files**: All uploaded camera images
- ❌ **Bucket Structure**: Preserved

## Cleanup Scripts

### 1. Main Cleanup Script
**Location**: `scripts/cleanup-all-data.sh`

```bash
# Interactive cleanup with confirmation
./scripts/cleanup-all-data.sh

# Force cleanup without confirmation
./scripts/cleanup-all-data.sh --force

# Preview what would be deleted (safe)
./scripts/cleanup-all-data.sh --dry-run

# Stop simulators first, then cleanup
./scripts/cleanup-all-data.sh --stop-simulators --force

# Keep MinIO images, only clean database
./scripts/cleanup-all-data.sh --keep-images --force
```

### 2. Simulator Directory Wrapper
**Location**: `simulator/cleanup-data.sh`

```bash
cd simulator

# Same options as main script
./cleanup-data.sh --dry-run
./cleanup-data.sh --force
```

### 3. Integrated with Simulator Runner
**Location**: `simulator/run-simulator.sh`

```bash
cd simulator

# Preview cleanup
./run-simulator.sh cleanup --dry-run

# Force cleanup
./run-simulator.sh cleanup --force

# Stop simulators and cleanup
./run-simulator.sh cleanup --stop-simulators --force
```

## Command Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview what would be deleted without actually deleting |
| `--force` | Skip confirmation prompts |
| `--stop-simulators` | Stop all running simulator containers first |
| `--keep-images` | Keep MinIO images, only clean database records |
| `--help` | Show detailed help information |

## Safety Features

### 1. Dry Run Mode
Always test with `--dry-run` first to see what would be deleted:

```bash
./scripts/cleanup-all-data.sh --dry-run
```

### 2. Confirmation Prompts
Interactive mode requires typing "yes" to confirm:

```bash
./scripts/cleanup-all-data.sh
# Will prompt: "Are you sure you want to continue? (type 'yes' to confirm):"
```

### 3. Container Checks
Script verifies required containers are running before proceeding.

### 4. Statistics Display
Shows current data counts before cleanup:

```
Current data:
  - Objects: 6
  - Location records: 796
  - Image records: 466
  - Tenants with objects: 1
```

## Common Workflows

### Development Reset
```bash
# Stop simulators and clean everything
cd simulator
./run-simulator.sh cleanup --stop-simulators --force

# Start fresh simulators
./run-simulator.sh multi
```

### Demo Preparation
```bash
# Clean data but keep images for faster demo
./scripts/cleanup-all-data.sh --keep-images --force

# Or clean everything for completely fresh demo
./scripts/cleanup-all-data.sh --force
```

### Troubleshooting
```bash
# Preview what's in the system
./scripts/cleanup-all-data.sh --dry-run

# Clean specific issues (database only)
./scripts/cleanup-all-data.sh --keep-images --force
```

## After Cleanup

After running cleanup, the system will be in a clean state:

1. **Login still works** - User accounts are preserved
2. **Workspaces exist** - Tenant structure is preserved  
3. **Icons work** - Object type configurations are preserved
4. **No tracking data** - Ready for fresh objects and locations

## Recovery

If you need to restore data after cleanup:

1. **Database backup**: Restore from PostgreSQL backup if available
2. **MinIO backup**: Restore image files if backed up separately
3. **Fresh start**: Run simulators to generate new test data

## Integration with Development

### Docker Compose Integration
The cleanup scripts work with the standard Docker Compose setup:

```bash
# Ensure containers are running
docker-compose up -d

# Run cleanup
./scripts/cleanup-all-data.sh --force

# Restart if needed
docker-compose restart
```

### CI/CD Integration
Use in automated testing:

```bash
# Clean before tests
./scripts/cleanup-all-data.sh --force

# Run tests
npm test

# Clean after tests
./scripts/cleanup-all-data.sh --force
```

## Troubleshooting

### Container Not Running
```
Error: Database container 'simple-tracker-database-1' is not running
```
**Solution**: Start the application first:
```bash
docker-compose up -d
```

### Permission Denied
```
Error: Permission denied
```
**Solution**: Make scripts executable:
```bash
chmod +x scripts/cleanup-all-data.sh
chmod +x simulator/cleanup-data.sh
```

### MinIO Access Issues
```
Warning: MinIO container 'simple-tracker-minio-1' is not running
```
**Solution**: MinIO cleanup will be skipped automatically. Database cleanup will still work.

## Best Practices

1. **Always use --dry-run first** to preview changes
2. **Stop simulators** before cleanup to avoid conflicts
3. **Backup important data** before cleanup in production
4. **Use --keep-images** during development to save time
5. **Combine with simulator restart** for complete reset