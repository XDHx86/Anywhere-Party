@echo off
REM Watch Party Extension Setup Script for Windows
REM This script sets up the development environment for the Watch Party Extension

setlocal enabledelayedexpansion

echo ==========================================
echo Watch Party Extension Setup
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%

REM Warn about EOL versions
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 20 (
    echo [WARNING] Node.js 18 is EOL. Consider upgrading to Node.js 20+ ^(LTS^).
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [INFO] Installing Node.js dependencies...

REM Install root dependencies (prefer npm ci when lockfile exists)
if exist "package-lock.json" (
    call npm ci
) else (
    call npm install
)
if errorlevel 1 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

REM Install server dependencies (prefer npm ci when lockfile exists)
cd server
if exist "package-lock.json" (
    call npm ci
) else (
    call npm install
)
if errorlevel 1 (
    echo [ERROR] Failed to install server dependencies
    pause
    exit /b 1
)
cd ..

echo [SUCCESS] Dependencies installed successfully

REM Setup configuration files
echo [INFO] Setting up configuration files...

if not exist "extension-config.local.json" (
    if exist "extension-config.example.json" (
        copy "extension-config.example.json" "extension-config.local.json" >nul
        echo [SUCCESS] Created extension-config.local.json
    ) else (
        echo [WARNING] extension-config.example.json not found, skipping
    )
) else (
    echo [WARNING] extension-config.local.json already exists, skipping
)

if not exist "server\.env" (
    if exist "server\.env.example" (
        copy "server\.env.example" "server\.env" >nul
        echo [SUCCESS] Created server\.env
    ) else (
        echo [WARNING] server\.env.example not found, skipping
    )
) else (
    echo [WARNING] server\.env already exists, skipping
)

echo [SUCCESS] Configuration files setup complete

REM Build extension for both browsers
echo [INFO] Building extension for both browsers...
call npm run build:dev
if errorlevel 1 (
    echo [ERROR] Extension build failed
    pause
    exit /b 1
)

if exist "dist\chrome\manifest.json" if exist "dist\firefox\manifest.json" (
    echo [SUCCESS] Extension built successfully
    echo [INFO] Chrome extension: dist\chrome\
    echo [INFO] Firefox extension: dist\firefox\
) else (
    echo [ERROR] Extension build incomplete — manifest.json missing
    pause
    exit /b 1
)

REM Check for Docker Compose (prefer v2, fall back to v1)
docker compose version >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Docker Compose v2 found
    echo [INFO] You can start the development environment with: docker compose up -d
) else (
    docker-compose --version >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Docker Compose v1 found
        echo [INFO] You can start the development environment with: docker-compose up -d
    ) else (
        echo [WARNING] Docker Compose not found
        echo [INFO] You can install Docker from: https://docs.docker.com/get-docker/
    )
)

echo.
echo [SUCCESS] Setup complete! Here are the next steps:
echo.
echo 1. Start the development server:
echo    Option A (Docker): docker compose up -d
echo    Option B (Manual): npm run server:dev
echo.
echo 2. Load the extension in your browser:
echo    Chrome: Go to chrome://extensions/, enable Developer mode,
echo            click 'Load unpacked', select dist\chrome
echo    Firefox: Go to about:debugging, click 'This Firefox',
echo             click 'Load Temporary Add-on', select dist\firefox\manifest.json
echo.
echo 3. Start developing:
echo    npm run watch      # Start development build with watch
echo    npm run test       # Run tests
echo    npm run lint       # Run linting
echo.
echo For more information, see README.md and docs\deployment.md

pause
