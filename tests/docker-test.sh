#!/bin/bash

# Test script to verify docker-start.sh testing functionality
# This script tests the testing commands in docker-start.sh

echo "🧪 Testing docker-start.sh testing functionality"
echo "================================================"

# Check if docker-start.sh exists and is executable
if [ ! -f "./docker-start.sh" ]; then
    echo "❌ docker-start.sh not found"
    exit 1
fi

if [ ! -x "./docker-start.sh" ]; then
    echo "❌ docker-start.sh is not executable"
    exit 1
fi

echo "✅ docker-start.sh found and executable"

# Test help command
echo ""
echo "📋 Testing help command..."
./docker-start.sh --help > /dev/null 2>&1 || ./docker-start.sh help > /dev/null 2>&1 || {
    echo "⚠️  Help command not available, testing usage with invalid command..."
    ./docker-start.sh invalid-command 2>&1 | grep -q "Usage:" && echo "✅ Usage information displayed"
}

# Test that test commands are recognized (don't actually run them)
echo ""
echo "🔍 Checking test command recognition..."

# Check if test commands are in the usage output
USAGE_OUTPUT=$(./docker-start.sh invalid-command 2>&1)

if echo "$USAGE_OUTPUT" | grep -q "test.*Run all tests"; then
    echo "✅ 'test' command found in usage"
else
    echo "❌ 'test' command not found in usage"
fi

if echo "$USAGE_OUTPUT" | grep -q "test-unit.*Run unit tests"; then
    echo "✅ 'test-unit' command found in usage"
else
    echo "❌ 'test-unit' command not found in usage"
fi

if echo "$USAGE_OUTPUT" | grep -q "test-api.*Run API"; then
    echo "✅ 'test-api' command found in usage"
else
    echo "❌ 'test-api' command not found in usage"
fi

if echo "$USAGE_OUTPUT" | grep -q "test-ui.*Run UI"; then
    echo "✅ 'test-ui' command found in usage"
else
    echo "❌ 'test-ui' command not found in usage"
fi

if echo "$USAGE_OUTPUT" | grep -q "test-rbac.*RBAC"; then
    echo "✅ 'test-rbac' command found in usage"
else
    echo "❌ 'test-rbac' command not found in usage"
fi

if echo "$USAGE_OUTPUT" | grep -q "test-setup.*Setup test"; then
    echo "✅ 'test-setup' command found in usage"
else
    echo "❌ 'test-setup' command not found in usage"
fi

if echo "$USAGE_OUTPUT" | grep -q "test-cleanup.*Cleanup test"; then
    echo "✅ 'test-cleanup' command found in usage"
else
    echo "❌ 'test-cleanup' command not found in usage"
fi

echo ""
echo "📦 Checking package.json test scripts..."

if [ -f "package.json" ]; then
    if grep -q '"test:unit"' package.json; then
        echo "✅ test:unit script found in package.json"
    else
        echo "❌ test:unit script not found in package.json"
    fi
    
    if grep -q '"test:api"' package.json; then
        echo "✅ test:api script found in package.json"
    else
        echo "❌ test:api script not found in package.json"
    fi
    
    if grep -q '"test:ui"' package.json; then
        echo "✅ test:ui script found in package.json"
    else
        echo "❌ test:ui script not found in package.json"
    fi
else
    echo "❌ package.json not found"
fi

echo ""
echo "📁 Checking test directory structure..."

if [ -d "tests" ]; then
    echo "✅ tests/ directory exists"
    
    if [ -d "tests/unit" ]; then
        echo "✅ tests/unit/ directory exists"
    else
        echo "❌ tests/unit/ directory not found"
    fi
    
    if [ -d "tests/integration" ]; then
        echo "✅ tests/integration/ directory exists"
    else
        echo "❌ tests/integration/ directory not found"
    fi
    
    if [ -f "tests/vitest.config.js" ]; then
        echo "✅ vitest.config.js found"
    else
        echo "❌ vitest.config.js not found"
    fi
    
    if [ -f "tests/playwright.config.js" ]; then
        echo "✅ playwright.config.js found"
    else
        echo "❌ playwright.config.js not found"
    fi
else
    echo "❌ tests/ directory not found"
fi

echo ""
echo "📚 Checking documentation..."

if [ -f "TESTING.md" ]; then
    echo "✅ TESTING.md found"
    
    if grep -q "docker-start.sh test" TESTING.md; then
        echo "✅ docker-start.sh testing commands documented"
    else
        echo "❌ docker-start.sh testing commands not documented"
    fi
else
    echo "❌ TESTING.md not found"
fi

if [ -f "QUICK_REFERENCE.md" ]; then
    if grep -q "test-setup" QUICK_REFERENCE.md; then
        echo "✅ Testing commands in QUICK_REFERENCE.md"
    else
        echo "❌ Testing commands not in QUICK_REFERENCE.md"
    fi
else
    echo "❌ QUICK_REFERENCE.md not found"
fi

echo ""
echo "🎉 Docker testing functionality verification complete!"
echo ""
echo "To actually run tests:"
echo "  ./docker-start.sh test-setup   # Setup test environment"
echo "  ./docker-start.sh test         # Run all tests"
echo "  ./docker-start.sh test-cleanup # Cleanup when done"