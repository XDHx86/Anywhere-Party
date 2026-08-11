#!/bin/bash

# Watch Party Extension Setup Script
# This script sets up the development environment for the Watch Party Extension

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect Docker Compose command (v2 preferred over deprecated v1)
compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command_exists docker-compose; then
        echo "docker-compose"
    else
        echo ""
    fi
}

# Function to install dependencies with lockfile awareness
install_deps() {
    local dir="$1"
    local label="${2:-dependencies}"

    if [ -n "$dir" ] && [ "$dir" != "." ]; then
        cd "$dir"
    fi

    if [ -f "package-lock.json" ]; then
        print_status "Installing $label with npm ci (lockfile found)..."
        npm ci
    else
        print_status "Installing $label with npm install (no lockfile)..."
        npm install
    fi

    if [ -n "$dir" ] && [ "$dir" != "." ]; then
        cd - >/dev/null
    fi
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_VERSION="18.0.0"

        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            print_success "Node.js version $NODE_VERSION is compatible"

            # Warn about EOL versions
            MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
            if [ "$MAJOR" -lt 20 ] 2>/dev/null; then
                print_warning "Node.js 18 is EOL. Consider upgrading to Node.js 20+ (LTS)."
            fi

            return 0
        else
            print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
            return 1
        fi
    else
        print_error "Node.js is not installed"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."

    # Install root dependencies
    install_deps . "root"

    # Install server dependencies
    install_deps server "server"

    print_success "Dependencies installed successfully"
}

# Function to setup configuration files
setup_config() {
    print_status "Setting up configuration files..."

    # Copy extension config if it doesn't exist
    if [ ! -f "extension-config.local.json" ]; then
        if [ -f "extension-config.example.json" ]; then
            cp extension-config.example.json extension-config.local.json
            print_success "Created extension-config.local.json"
        else
            print_warning "extension-config.example.json not found, skipping"
        fi
    else
        print_warning "extension-config.local.json already exists, skipping"
    fi

    # Copy server environment config if it doesn't exist
    if [ ! -f "server/.env" ]; then
        if [ -f "server/.env.example" ]; then
            cp server/.env.example server/.env
            print_success "Created server/.env"
        else
            print_warning "server/.env.example not found, skipping"
        fi
    else
        print_warning "server/.env already exists, skipping"
    fi

    print_success "Configuration files setup complete"
}

# Function to setup Docker environment
setup_docker() {
    local CMD
    CMD=$(compose_cmd)

    if [ -z "$CMD" ]; then
        print_warning "Docker Compose not found. Skipping Docker setup."
        print_status "You can install Docker from: https://docs.docker.com/get-docker/"
        return 0
    fi

    print_status "Setting up Docker development environment..."

    # Pull required images
    $CMD pull

    # Build custom images
    $CMD build

    print_success "Docker environment setup complete"
    print_status "You can start the development environment with: $CMD up -d"
}

# Function to build extension
build_extension() {
    print_status "Building extension for both browsers..."

    npm run build:dev

    if [ -d "dist/chrome" ] && [ -d "dist/firefox" ]; then
        # Verify build artifacts are present
        if [ -f "dist/chrome/manifest.json" ] && [ -f "dist/firefox/manifest.json" ]; then
            print_success "Extension built successfully"
            print_status "Chrome extension: dist/chrome/"
            print_status "Firefox extension: dist/firefox/"
        else
            print_error "Extension build incomplete — manifest.json missing"
            return 1
        fi
    else
        print_error "Extension build failed — dist directories not found"
        return 1
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."

    npm run test

    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed. Check the output above."
    fi
}

# Function to setup development database
setup_database() {
    if command_exists psql; then
        print_status "Setting up development database..."

        # Check if PostgreSQL is running
        if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            # Create database and user
            psql -h localhost -U postgres -c "CREATE DATABASE watchparty;" 2>/dev/null || true
            psql -h localhost -U postgres -c "CREATE USER watchparty WITH PASSWORD 'watchparty_dev';" 2>/dev/null || true
            psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE watchparty TO watchparty;" 2>/dev/null || true

            # Apply schema
            psql -h localhost -U watchparty -d watchparty -f server/database/schema.sql
            psql -h localhost -U watchparty -d watchparty -f server/database/seed.sql

            print_success "Database setup complete"
        else
            print_warning "PostgreSQL is not running. Skipping database setup."
            print_status "Start PostgreSQL and run this script again, or use Docker: docker compose up -d postgres"
        fi
    else
        print_warning "PostgreSQL client (psql) not found. Skipping database setup."
    fi
}

# Function to display next steps
show_next_steps() {
    local COMPOSE_CMD
    COMPOSE_CMD=$(compose_cmd)

    print_success "Setup complete! Here are the next steps:"
    echo
    echo "1. Start the development server:"
    if [ -n "$COMPOSE_CMD" ]; then
        echo "   Option A (Docker): $COMPOSE_CMD up -d"
    fi
    echo "   Option B (Manual): npm run server:dev"
    echo
    echo "2. Load the extension in your browser:"
    echo "   Chrome: Go to chrome://extensions/, enable Developer mode, click 'Load unpacked', select dist/chrome"
    echo "   Firefox: Go to about:debugging, click 'This Firefox', click 'Load Temporary Add-on', select dist/firefox/manifest.json"
    echo
    echo "3. Start developing:"
    echo "   npm run watch          # Start development build with watch"
    echo "   npm run test           # Run tests"
    echo "   npm run lint           # Run linting"
    echo
    echo "For more information, see README.md and docs/deployment.md"
}

# Main setup function
main() {
    echo "=========================================="
    echo "Watch Party Extension Setup"
    echo "=========================================="
    echo

    # Check prerequisites
    print_status "Checking prerequisites..."

    if ! check_node_version; then
        print_error "Please install Node.js 18+ and run this script again"
        exit 1
    fi

    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi

    # Run setup steps
    install_dependencies
    setup_config
    build_extension

    # Optional steps
    for arg in "$@"; do
        case "$arg" in
            --with-docker)  setup_docker ;;
            --with-database) setup_database ;;
            --with-tests)   run_tests ;;
        esac
    done

    # Show completion message
    show_next_steps
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --with-docker     Setup Docker development environment"
        echo "  --with-database   Setup PostgreSQL database (requires PostgreSQL to be running)"
        echo "  --with-tests      Run tests after setup"
        echo "  --help, -h        Show this help message"
        echo
        echo "Examples:"
        echo "  $0                          # Basic setup"
        echo "  $0 --with-docker            # Setup with Docker"
        echo "  $0 --with-database          # Setup with database"
        echo "  $0 --with-docker --with-tests  # Full setup with tests"
        echo
        echo "Prerequisites:"
        echo "  Node.js 18+ (Node.js 20+ recommended)"
        echo "  npm"
        echo "  Docker and Docker Compose (optional, for --with-docker)"
        echo "  PostgreSQL client (optional, for --with-database)"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
