# Docker Testing Integration

This document describes the testing capabilities integrated into the `./docker-start.sh` helper script.

## Overview

The `docker-start.sh` script now includes comprehensive testing commands that handle:
- Test environment setup and teardown
- Dependency installation (including Playwright browsers)
- Application startup and health checking
- Running different types of tests
- RBAC system validation
- Test artifact cleanup

## Available Testing Commands

### `./docker-start.sh test-setup`
**Purpose**: One-time setup of the test environment

**What it does:**
- Installs Node.js dependencies if missing
- Installs test-specific dependencies (vitest, playwright, etc.)
- Downloads Playwright browsers
- Starts the application (frontend + backend + database)
- Waits for services to be ready
- Validates that all endpoints are accessible

**Usage:**
```bash
./docker-start.sh test-setup
```

**Output:**
```
🔧 Setting up test environment...
================================
📦 Installing dependencies...
📦 Installing test dependencies...
🎭 Installing Playwright browsers...
🚀 Starting application...
⏳ Waiting for services to be ready...
✅ Test environment setup complete
```

### `./docker-start.sh test`
**Purpose**: Run the complete test suite

**What it does:**
- Ensures application is running (starts if needed)
- Runs unit tests with coverage
- Runs API integration tests
- Runs UI tests with Playwright (if available)
- Provides comprehensive test results

**Usage:**
```bash
./docker-start.sh test
```

**Output:**
```
🧪 Running all tests...
================================
✅ Test environment ready

1️⃣ Running unit tests...
2️⃣ Running API integration tests...
3️⃣ Running UI tests...

🎉 All tests passed successfully!
```

### `./docker-start.sh test-unit`
**Purpose**: Run only unit tests

**What it does:**
- Installs dependencies if needed
- Runs unit tests with coverage reporting
- Generates coverage report in `coverage/` directory

**Usage:**
```bash
./docker-start.sh test-unit
```

### `./docker-start.sh test-api`
**Purpose**: Run API integration tests

**What it does:**
- Ensures backend is running
- Runs API integration tests
- Tests all RBAC endpoints and functionality

**Usage:**
```bash
./docker-start.sh test-api
```

### `./docker-start.sh test-ui`
**Purpose**: Run UI tests with Playwright

**What it does:**
- Ensures full application is running (frontend + backend)
- Installs Playwright browsers if needed
- Runs UI tests across multiple browsers
- Generates test report in `playwright-report/` directory

**Usage:**
```bash
./docker-start.sh test-ui
```

### `./docker-start.sh test-rbac`
**Purpose**: Run RBAC-specific tests and validation

**What it does:**
- Ensures application is running
- Runs RBAC unit tests
- Runs RBAC API integration tests
- Validates RBAC system integrity:
  - Admin user has all 32 permissions
  - System has 6+ roles
  - System has exactly 32 permissions
  - All RBAC endpoints are functional

**Usage:**
```bash
./docker-start.sh test-rbac
```

**Output:**
```
🔐 Running RBAC-specific tests...
=================================
✅ Backend is ready
1️⃣ Running RBAC unit tests...
2️⃣ Running RBAC API tests...
3️⃣ Validating RBAC system integrity...
✅ RBAC system validation passed
✅ Admin has 32 permissions
✅ System has 6 roles
✅ System has 32 total permissions
🎉 All RBAC tests completed successfully!
```

### `./docker-start.sh test-cleanup`
**Purpose**: Clean up test environment and artifacts

**What it does:**
- Stops all Docker containers
- Removes test artifacts (coverage/, playwright-report/, etc.)
- Optionally removes node_modules
- Optionally cleans Docker resources

**Usage:**
```bash
./docker-start.sh test-cleanup
```

## Integration with Existing Commands

The testing commands integrate seamlessly with existing docker-start.sh functionality:

```bash
# Start development environment
./docker-start.sh dev

# Run tests on running environment
./docker-start.sh test-unit

# Check application health
./docker-start.sh health

# View logs if tests fail
./docker-start.sh logs

# Stop everything when done
./docker-start.sh stop
```

## Error Handling

The testing commands include robust error handling:

### Application Startup
- Automatically starts application if not running
- Waits for services with timeout (60 seconds)
- Validates endpoints are accessible before running tests
- Provides clear error messages if startup fails

### Dependency Management
- Checks for required dependencies before running tests
- Automatically installs missing test dependencies
- Downloads Playwright browsers if needed
- Handles npm install failures gracefully

### Test Execution
- Stops execution if any test suite fails
- Provides clear success/failure indicators
- Preserves test artifacts for debugging
- Returns appropriate exit codes for CI/CD

## CI/CD Integration

The docker-start.sh testing commands are designed for CI/CD environments:

### GitHub Actions Example
```yaml
- name: Setup test environment
  run: ./docker-start.sh test-setup

- name: Run all tests
  run: ./docker-start.sh test

- name: Cleanup
  run: ./docker-start.sh test-cleanup
  if: always()
```

### Local Development
```bash
# Quick test cycle
./docker-start.sh test-unit    # Fast feedback
./docker-start.sh test-api     # Integration validation
./docker-start.sh test-ui      # Full UI validation
```

## Performance Considerations

### Startup Time
- First run: ~2-3 minutes (includes dependency installation)
- Subsequent runs: ~30 seconds (reuses existing setup)
- Unit tests only: ~10 seconds (no application startup needed)

### Resource Usage
- Full test suite: ~2GB RAM, ~1GB disk
- Unit tests only: ~500MB RAM, ~100MB disk
- Cleanup removes ~500MB of test artifacts

### Optimization Tips
```bash
# Keep application running between test runs
./docker-start.sh dev
./docker-start.sh test-unit    # Fast, reuses running app
./docker-start.sh test-api     # Fast, reuses running app

# Use watch mode for development
npm run test:unit:watch        # Fastest feedback loop
```

## Troubleshooting

### Common Issues

1. **"Backend failed to start"**
   ```bash
   # Check Docker is running
   docker info
   
   # Check for port conflicts
   lsof -i :3001
   
   # View detailed logs
   ./docker-start.sh logs
   ```

2. **"Playwright browsers not found"**
   ```bash
   # Reinstall browsers
   npx playwright install
   
   # Or use test-setup to reinstall everything
   ./docker-start.sh test-cleanup
   ./docker-start.sh test-setup
   ```

3. **"Permission denied" errors**
   ```bash
   # Make script executable
   chmod +x docker-start.sh
   
   # Check Docker permissions
   docker ps
   ```

4. **Tests fail with "Connection refused"**
   ```bash
   # Verify application is healthy
   ./docker-start.sh health
   
   # Restart if needed
   ./docker-start.sh stop
   ./docker-start.sh dev
   ```

### Debug Mode

For detailed debugging, run commands with verbose output:

```bash
# Enable debug mode
set -x

# Run test command
./docker-start.sh test-unit

# Disable debug mode
set +x
```

### Manual Verification

Verify the test environment manually:

```bash
# Check application endpoints
curl http://localhost:3000          # Frontend
curl http://localhost:3001/api/health  # Backend health

# Check test dependencies
npm list vitest @playwright/test

# Check Playwright installation
npx playwright --version
```

## Best Practices

### Development Workflow
1. Run `./docker-start.sh test-setup` once per development session
2. Use `./docker-start.sh test-unit` for quick feedback during development
3. Run `./docker-start.sh test-api` before committing changes
4. Run `./docker-start.sh test` before creating pull requests
5. Use `./docker-start.sh test-cleanup` to free up resources when done

### CI/CD Workflow
1. Always run `./docker-start.sh test-setup` in CI environment
2. Run `./docker-start.sh test` for comprehensive validation
3. Use `./docker-start.sh test-rbac` for security-critical changes
4. Always run `./docker-start.sh test-cleanup` in cleanup steps

### Performance Optimization
1. Keep the application running during development
2. Use unit tests for rapid iteration
3. Run full test suite only before commits/deployments
4. Clean up regularly to free disk space

This integration makes testing accessible to all developers regardless of their familiarity with the testing tools, while providing the flexibility for advanced users to use the underlying npm scripts directly.