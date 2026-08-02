# Watch Party Extension

A cross-browser extension that enables synchronized video viewing experiences with voice chat, real-time collaboration, and advanced features like subtitles, annotations, and polls. Built with modern Material Design 3 UI components for a beautiful, accessible, and consistent user experience.

## Features

### Core Functionality
- 🎬 **Synchronized Video Playback** - Watch videos together in perfect sync across all participants
- 🎤 **Voice Communication** - WebRTC-powered voice chat with TURN server support
- 💬 **Real-time Chat & Reactions** - Text messaging and emoji reactions synchronized to video timeline
- 🎨 **Collaborative Annotations** - Draw, highlight, and annotate videos together in real-time
- 📝 **Subtitles & Captions** - Multi-language subtitle support with OpenSubtitles integration
- 📊 **Interactive Features** - Polls, quizzes, bookmarks, and collaborative whiteboards
- 🔒 **Privacy & Security** - End-to-end encryption, OAuth authentication, and data retention controls

### Modern Material Design 3 Interface
- 🎨 **Material Design 3 Components** - Beautiful, consistent UI following Google's latest design system
- 🌓 **Automatic Theme Switching** - Seamless light/dark mode with system preference detection
- 📱 **Responsive Design** - Optimized for different window sizes and screen densities
- ♿ **Enhanced Accessibility** - WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- 🎭 **Smooth Animations** - Material motion principles with reduced motion support
- 🎯 **Intuitive Layout** - Card-based interface with logical information hierarchy

### Performance & Compatibility
- ⚡ **Optimized Performance** - React-based components with efficient rendering and code splitting
- 🌐 **Cross-Browser Support** - Chrome MV3 and Firefox WebExtensions with unified API
- 📊 **Performance Monitoring** - Drift analysis, bandwidth monitoring, and adaptive quality controls
- 🔧 **Developer Experience** - TypeScript, comprehensive testing, and detailed documentation

## 🔧 Runtime Fixes & Debugging

This version includes critical runtime bug fixes and UX improvements. All fixes have been tested and validated.

### Fixed Issues

- **A. Icon Loading**: Local bundled fonts with SVG fallbacks ✅
- **B. Room State Persistence**: Background script storage across popup sessions ✅  
- **C. API Key Management**: Secure user-managed external service keys ✅
- **D. Video Detection**: On-demand activation with right-click fallback ✅
- **E. Subtitle Engine**: Graceful error handling for missing API keys ✅
- **F. Popup Scrolling**: Proper overflow with keyboard accessibility ✅

### Debug Steps

#### Chrome (Unpacked Mode)
1. Open `chrome://extensions/`
2. Enable "Developer mode" 
3. Click "Load unpacked" and select the `dist/chrome` folder
4. Open extension popup and test room creation
5. Check console for any errors: Right-click popup → Inspect
6. Verify icons load properly and room state persists across popup close/open

#### Firefox (about:debugging)
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/firefox/manifest.json`
4. Test popup functionality and scrolling behavior
5. Check console: Click "Inspect" next to the extension
6. Verify cross-browser compatibility with Chrome version

#### API Key Configuration
1. Open Options page (right-click extension icon → Options)
2. Navigate to "API Keys" tab (new)
3. Add OpenSubtitles API key: `your-api-key-here`
4. Test validation by clicking "Test Connection"
5. Verify keys are stored securely and persist across browser restarts

#### Video Detection Testing
1. Navigate to any video streaming site (YouTube, Netflix, etc.)
2. Click extension popup → "Start Room" 
3. If auto-detection fails, right-click on video player area
4. Verify video is detected and room creation succeeds
5. Test fallback mechanisms work properly

### Validation Commands

```bash
# Run all runtime fix validations
npm run test:runtime-fixes

# Run specific test suites
npm run test -- src/@ui/integration/runtime-fix-validation.test.ts

# Cross-browser compatibility tests
npm run build && npm run test:cross-browser
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for full server setup)
- PostgreSQL 14+ (for production deployment)
- Redis 6+ (for production deployment)

### Automated Setup

Use the setup script for quick installation:

```bash
# Linux/macOS
./scripts/setup.sh

# Windows
scripts\setup.bat

# With additional options (Linux/macOS only)
./scripts/setup.sh --with-docker --with-tests
```

### Manual Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd watch-party-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Configure for local development**
   ```bash
   cp extension-config.example.json extension-config.local.json
   # Edit extension-config.local.json to set LOCAL_DEV_MODE: true
   ```

4. **Start local development server**
   ```bash
   npm run dev:server
   ```

5. **Build extension**
   ```bash
   # Build for both browsers
   npm run build:dev
   
   # Or build for specific browser
   npm run build:dev:chrome
   npm run build:dev:firefox
   ```

6. **Load extension in browser**
   - **Chrome**: Go to `chrome://extensions/`, enable Developer mode, click "Load unpacked", select `dist/chrome`
   - **Firefox**: Go to `about:debugging`, click "This Firefox", click "Load Temporary Add-on", select `dist/firefox/manifest.json`

### Docker Development Setup

For a complete development environment with database and Redis:

```bash
# Start all services
docker-compose up -d

# Build extension
npm run build

# View logs
docker-compose logs -f
```

## Material Design 3 Interface

### Modern UI Components

The extension features a complete Material Design 3 interface built with React and TypeScript:

#### Popup Interface
- **Header Card**: Extension branding and navigation
- **Main Card**: Primary room controls with Material buttons
- **Secondary Card**: Collapsible settings with smooth animations
- **Footer Card**: Connection status and quick actions

#### Options Page
- **Tabbed Layout**: General, Accessibility, Appearance, and About sections
- **Settings Cards**: Organized configuration with Material form controls
- **Theme Controls**: Light/dark mode toggle with system preference detection
- **Accessibility Panel**: Enhanced options for screen readers and keyboard navigation

#### Chat Interface
- **Message Cards**: Elevated message bubbles with Material styling
- **Reaction System**: Material icon buttons with smooth animations
- **Input Bar**: Sticky message input with Material Design 3 styling
- **Virtual Scrolling**: Optimized performance for large message histories

#### Video Overlays
- **Floating Surfaces**: Translucent overlays with proper elevation
- **Avatar Containers**: User presence indicators with Material styling
- **Reaction Indicators**: Animated emoji reactions following Material motion

### Theme System

The extension includes a comprehensive theming system:

```typescript
// Automatic theme detection
const theme = useTheme();
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

// Manual theme switching
const { toggleTheme } = useMaterialTheme();
```

### Accessibility Features

Enhanced accessibility following WCAG 2.1 AA guidelines:
- **Keyboard Navigation**: Full keyboard support with proper tab order
- **Screen Reader Support**: Comprehensive ARIA labels and live regions
- **High Contrast Mode**: Automatic detection and enhanced contrast
- **Reduced Motion**: Respects user's motion preferences
- **Focus Management**: Visible focus indicators and logical focus flow

### Component Documentation

For detailed component API documentation, see:
- [Material Design 3 API Documentation](docs/material-design-3-api.md)
- [Style Guide](docs/material-design-3-style-guide.md)
- [Migration Guide](docs/material-design-3-migration-guide.md)

## Configuration

The extension uses a layered configuration system with the following precedence:

1. **Runtime overrides** (Options page settings) - Highest priority
2. **Local development config** (`extension-config.local.json`) - Development only
3. **Extension defaults** (`extension-config.json`) - Base configuration
4. **Hardcoded fallbacks** - Lowest priority

### Key Configuration Options

```json
{
  "SIGNALING_SERVER": "ws://localhost:3001",
  "LOCAL_DEV_MODE": true,
  "SYNC_TOLERANCE_MS": 300,
  "HEARTBEAT_INTERVAL_MS": 2000,
  "TURN_SERVERS": [
    {
      "urls": "turn:your-turn-server.com:3478",
      "username": "your-username",
      "credential": "your-password"
    }
  ],
  "OPENSUBTITLES_KEY": "your-api-key",
  "FEATURE_FLAGS": {
    "VOICE_CHAT": true,
    "ANNOTATIONS": true,
    "SUBTITLES": true
  }
}
```

### Environment Variables (Server)

Create a `.env` file in the server directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/watchparty
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# External Services
OPENSUBTITLES_API_KEY=your-opensubtitles-key
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-password

# Feature Flags
FEATURE_FLAGS_ENDPOINT=http://localhost:3002/flags

# Logging
LOG_LEVEL=info
TELEMETRY_ENABLED=false
```

## Development

### Project Structure

```
watch-party-extension/
├── src/
│   ├── @core/                 # Core functionality modules
│   │   ├── sync-engine/       # Video synchronization
│   │   ├── video-detector/    # Video element detection
│   │   ├── annotation-layer/  # Collaborative annotations
│   │   ├── chat/             # Text chat and reactions
│   │   ├── subtitle-engine/   # Subtitle management
│   │   └── browser-bridge/    # Cross-browser compatibility
│   ├── @ui/                   # Material Design 3 UI components
│   │   ├── components/        # Reusable Material components
│   │   │   ├── cards/        # Card-based layout components
│   │   │   ├── chat/         # Chat interface components
│   │   │   └── overlays/     # Video overlay components
│   │   ├── theme/            # Material Design 3 theme system
│   │   ├── accessibility/    # Accessibility enhancements
│   │   ├── popup/            # Extension popup (React)
│   │   └── options/          # Options page (React)
│   ├── background.ts          # Background/service worker
│   └── content-script.ts      # Content script injection
├── server/                    # Backend services
│   ├── signaling-server.js    # WebSocket signaling
│   ├── room-manager.js        # Room state management
│   ├── feature-flags.js       # Feature flag service
│   └── database/             # Database schema and migrations
├── docs/                      # Documentation
│   ├── material-design-3-api.md        # Component API docs
│   ├── material-design-3-style-guide.md # Design system guide
│   ├── material-design-3-migration-guide.md # Migration guide
│   └── deployment-checklist.md         # Deployment checklist
└── docker-compose.yml         # Development environment
```

### Available Scripts

```bash
# Development
npm run dev              # Start development build with watch
npm run dev:server       # Start local WebSocket relay
npm run dev:full         # Start full server stack with Docker

# Building
npm run build            # Build for production (both browsers)
npm run build:chrome     # Build Chrome MV3 version only
npm run build:firefox    # Build Firefox WebExtension version only
npm run build:dev        # Build for development (both browsers)
npm run build:dev:chrome # Build Chrome development version
npm run build:dev:firefox # Build Firefox development version

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run end-to-end tests
npm run test:mutation    # Run mutation tests

# Linting and Formatting
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run typecheck        # Run TypeScript type checking

# Server
npm run server:start     # Start production server
npm run server:dev       # Start development server
npm run server:test      # Run server tests
```

### Testing

The project uses a comprehensive testing strategy:

- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: End-to-end synchronization scenarios
- **Property-Based Tests**: Video detection heuristics
- **Mutation Tests**: Stryker for critical path coverage

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test src/@core/sync-engine
npm run test src/@core/video-detector

# Generate coverage report
npm run test:coverage
```

## Browser Compatibility

### Chrome (Manifest V3)
- Chrome 88+
- Uses Service Worker for background processing
- Requires `host_permissions` for video detection
- Full Material Design 3 component support
- Hardware-accelerated animations

### Firefox (WebExtensions)
- Firefox 91+
- Uses background scripts
- Requires `all_urls` permission for cross-site functionality
- Complete Material UI compatibility
- CSS Grid and Flexbox support

### Cross-Browser Differences

The `@core/browser-bridge` module handles API differences:

- Storage API normalization
- Message passing compatibility
- Permission handling variations
- Manifest version differences
- Material UI theme consistency

### Material Design 3 Support

Both browsers fully support the Material Design 3 interface:
- CSS Custom Properties for theming
- CSS Grid and Flexbox layouts
- CSS Animations and Transitions
- Modern JavaScript features (ES2020+)
- WebComponents compatibility

## API Documentation

### WebSocket Signaling Protocol

The extension communicates with the signaling server via WebSocket messages:

```typescript
// Room Management
{
  type: 'create_room',
  data: {
    name: string,
    isPublic: boolean,
    password?: string,
    maxParticipants: number
  }
}

// Synchronization
{
  type: 'sync_event',
  data: {
    action: 'play' | 'pause' | 'seek',
    currentTime: number,
    timestamp: number,
    playbackRate: number
  }
}

// Chat Messages
{
  type: 'chat_message',
  data: {
    message: string,
    timestamp: number,
    userId: string
  }
}
```

### REST API Endpoints

See [API Documentation](docs/api.md) for complete endpoint reference.

## Deployment

### Production Deployment

1. **Server Setup**
   ```bash
   # Clone and install
   git clone <repository-url>
   cd watch-party-extension/server
   npm install --production

   # Configure environment
   cp .env.example .env
   # Edit .env with production values

   # Set up database
   npm run db:migrate
   npm run db:seed

   # Start server
   npm start
   ```

2. **Extension Distribution**
   ```bash
   # Build for production (both browsers)
   npm run build

   # Package for Chrome Web Store
   cd dist/chrome && zip -r ../chrome-extension.zip .

   # Package for Firefox Add-ons
   cd dist/firefox && zip -r ../firefox-extension.zip .
   ```

### Docker Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with environment variables
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-Specific Configuration

#### Development
- Uses local WebSocket relay (no database required)
- STUN-only WebRTC configuration
- Detailed logging and debugging enabled

#### Staging
- Full server stack with PostgreSQL and Redis
- TURN server configuration required
- Feature flags for gradual rollout testing

#### Production
- Optimized builds with minification
- SSL/TLS termination at load balancer
- Comprehensive monitoring and alerting
- Data retention and privacy controls

## Security Considerations

### Extension Security
- Content Security Policy (CSP) enforcement
- Input sanitization for annotations and chat
- Permission minimization principle
- Cross-origin iframe handling

### Server Security
- JWT token authentication
- Rate limiting on WebSocket connections
- SQL injection prevention
- End-to-end encryption for sensitive data

### Privacy Controls
- Optional telemetry with opt-out default
- Data retention policies
- Recording consent management
- Anonymous participation modes

## Troubleshooting

### Common Issues

**Extension not loading videos**
- Check cross-origin iframe restrictions
- Verify video detection heuristics
- Try manual video selection hotkey

**Synchronization drift**
- Adjust `SYNC_TOLERANCE_MS` in configuration
- Check network latency and stability
- Verify TURN server connectivity

**Voice chat not working**
- Confirm TURN server configuration
- Check browser microphone permissions
- Verify WebRTC connectivity

**Performance issues**
- Monitor memory usage in long sessions
- Adjust heartbeat intervals
- Enable adaptive quality controls

### Debug Mode

Enable debug logging by setting `LOG_LEVEL: 'debug'` in configuration:

```json
{
  "LOG_LEVEL": "debug",
  "TELEMETRY_ENABLED": true
}
```

### Support

- [Issue Tracker](https://github.com/your-repo/issues)
- [Documentation](docs/)
- [API Reference](docs/api.md)
- [Material Design 3 Components](docs/material-design-3-api.md)
- [UI Style Guide](docs/material-design-3-style-guide.md)
- [Migration Guide](docs/material-design-3-migration-guide.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Maintain test coverage above 80%
- Use conventional commit messages
- Update documentation for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- WebRTC implementation inspired by [SimpleWebRTC](https://github.com/SimpleWebRTC/SimpleWebRTC)
- Synchronization algorithms based on research from [Sync-Video](https://github.com/sync-video/sync-video)
- Accessibility features follow [WCAG 2.1 guidelines](https://www.w3.org/WAI/WCAG21/quickref/)