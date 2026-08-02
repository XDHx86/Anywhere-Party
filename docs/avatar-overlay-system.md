# Avatar Overlay System

A real-time, synchronized avatar overlay system for the watch-party extension that allows users to move avatars, show chat bubbles, and trigger reaction animations visible to all participants.

## 🎯 Features

### Core Functionality
- **Real-time Avatar Synchronization**: Each participant has an avatar rendered on top of the active video
- **Cross-browser Support**: Works seamlessly in Chrome MV3 and Firefox WebExtension environments
- **Normalized Coordinates**: Avatar positions use normalized coordinates (x/y between 0 and 1 relative to video)
- **Peer-to-peer Sync**: Position sync via WebRTC DataChannel or signaling socket

### Movement Controls
- **Mouse Drag**: Click and drag avatars directly for precise positioning
- **WASD Keys**: Smooth keyboard movement with continuous motion support
- **Touch Support**: Mobile-friendly touch controls for drag movement
- **Collision Avoidance**: Optional collision detection to prevent avatar overlap
- **Smooth Interpolation**: Linear interpolation (lerp) for smooth remote avatar transitions

### Interactive Features
- **Chat Bubbles**: Temporary chat bubbles appear above avatars when users send messages
- **Reaction Animations**: Animated reactions (❤️ 😂 👍 👏 🔥) synchronized across all users
- **Voice Activity Integration**: Avatar glows when speaking, shows mute status
- **Customizable Avatars**: Support for custom avatar images and display names

### Configuration System
- **Multi-source Config**: Runtime config, local overrides, and user preferences
- **Feature Flags**: Granular control over avatar system features
- **Performance Settings**: Adaptive quality and GPU acceleration options
- **Privacy Controls**: Configurable sharing of avatar data and voice activity

## 🏗️ Architecture

### Core Components

```
src/@core/avatar-overlay/
├── types.ts              # TypeScript interfaces and types
├── avatar-sync.ts        # Real-time synchronization manager
├── avatar-manager.ts     # Main coordination layer
└── index.ts             # Module exports

src/@ui/avatar-overlay/
└── avatar-overlay.ts     # Canvas-based rendering engine

src/@ui/components/
└── avatar-controls.ts    # UI controls for avatar customization

src/@core/config/
└── avatar-config.ts      # Configuration management
```

### Message Types

The system uses the following WebSocket/DataChannel message types:

```typescript
// Position updates (30Hz)
AVATAR_UPDATE: { id, x, y, timestamp }

// Animation triggers
AVATAR_ANIMATE: { id, animationKey, durationMs }

// Chat integration
AVATAR_CHAT_BUBBLE: { id, message, durationMs }

// Configuration changes
AVATAR_CONFIG: { id, imageUrl, animationUrl, displayName }

// Visibility control
AVATAR_VISIBILITY: { id, visible }
```

## 🚀 Usage

### Basic Integration

```typescript
import { AvatarManager } from '@core/avatar-overlay';

// Initialize avatar manager
const avatarManager = new AvatarManager({
  roomId: 'room123',
  userId: 'user456',
  userName: 'John Doe',
  signalingSend: (message) => sendToSignalingServer(message),
  onAvatarMove: (avatar) => console.log('Avatar moved:', avatar),
  onAvatarAnimate: (avatar, animation) => console.log('Animation:', animation)
});

// Inject overlay on video element
const videoElement = document.querySelector('video');
avatarManager.injectOverlay(videoElement);
```

### Triggering Reactions

```typescript
// Trigger heart animation
avatarManager.triggerAnimation('heart', 2000);

// Show chat bubble
avatarManager.showChatBubble('Hello everyone!', 4000);

// Update voice activity
avatarManager.setVoiceActivity(true, false); // speaking, not muted
```

### Handling Messages

```typescript
// Handle incoming avatar messages
signalingClient.onMessage((message) => {
  if (message.type === 'AVATAR_MESSAGE') {
    avatarManager.handleMessage(message.message);
  }
});
```

### UI Controls

```typescript
import { AvatarControls } from '@ui/components/avatar-controls';

// Create avatar controls UI
const controlsContainer = document.getElementById('avatar-controls');
const avatarControls = new AvatarControls(controlsContainer, {
  avatarManager,
  onAnimationTrigger: (animation) => console.log('User triggered:', animation),
  onAvatarConfigChange: (config) => console.log('Config updated:', config)
});
```

## ⚙️ Configuration

### Extension Config (extension-config.json)

```json
{
  "avatarOverlay": {
    "enabled": true,
    "updateRate": 30,
    "lerpFactor": 0.15,
    "avatarSize": 48,
    "chatBubbleDuration": 4000,
    "animationDuration": 2000,
    "collisionAvoidance": true,
    "voiceActivityGlow": true,
    "maxAvatars": 20
  },
  "features": {
    "avatarOverlay": true,
    "voiceIntegration": true,
    "chatIntegration": true,
    "animationEffects": true,
    "collisionDetection": true
  }
}
```

### Runtime Configuration

```typescript
import { AvatarConfigManager } from '@core/config/avatar-config';

const configManager = new AvatarConfigManager();

// Load configuration
const config = await configManager.loadConfig();

// Update settings
await configManager.updateConfig({
  avatarOverlay: {
    avatarSize: 64,
    updateRate: 60
  }
});
```

## 🎨 Customization

### Avatar Animations

The system supports 8 built-in animations:

- `heart` ❤️ - Heart reaction
- `laugh` 😂 - Laughing reaction  
- `thumbs_up` 👍 - Thumbs up
- `clap` 👏 - Clapping hands
- `wave` 👋 - Waving hello
- `dance` 💃 - Dancing celebration
- `surprised` 😲 - Surprised reaction
- `thinking` 🤔 - Thinking pose

### Custom Avatars

```typescript
// Set custom avatar image
avatarManager.updateConfig({
  displayName: 'Custom Name',
  imageUrl: 'https://example.com/avatar.png'
});
```

### Styling Chat Bubbles

Chat bubbles can be customized via configuration:

```json
{
  "chatBubbles": {
    "maxWidth": 200,
    "offsetY": -60,
    "borderRadius": 8,
    "backgroundColor": "rgba(0, 0, 0, 0.8)",
    "textColor": "#ffffff",
    "fontSize": 14,
    "fontFamily": "Arial, sans-serif"
  }
}
```

## 🔧 API Reference

### AvatarManager

Main coordination class for avatar system.

#### Methods

- `injectOverlay(videoElement)` - Inject avatar overlay on video
- `removeOverlay()` - Remove avatar overlay
- `triggerAnimation(key, duration)` - Trigger animation on local avatar
- `showChatBubble(message, duration)` - Show chat bubble on local avatar
- `updateConfig(config)` - Update avatar configuration
- `setVisibility(visible)` - Set avatar visibility
- `setVoiceActivity(speaking, muted)` - Update voice status
- `handleMessage(message)` - Handle incoming avatar messages
- `getAvatars()` - Get all avatars in room
- `getLocalAvatar()` - Get local user's avatar
- `cleanup()` - Clean up expired avatars
- `destroy()` - Destroy avatar manager

### AvatarSync

Handles real-time synchronization of avatar data.

#### Methods

- `updateLocalPosition(x, y)` - Update local avatar position
- `triggerAnimation(key, duration)` - Trigger animation
- `showChatBubble(message, duration)` - Show chat bubble
- `updateConfig(config)` - Update configuration
- `setVisibility(visible)` - Set visibility
- `setVoiceActivity(speaking, muted)` - Update voice activity
- `handleMessage(message)` - Handle incoming messages

### AvatarOverlay

Canvas-based rendering engine for avatars.

#### Methods

- `injectOverlay(videoElement)` - Inject overlay on video
- `removeOverlay()` - Remove overlay
- `updateAvatar(avatar)` - Update avatar data
- `triggerAnimation(avatarId, key, duration)` - Trigger animation
- `showChatBubble(avatarId, message, duration)` - Show chat bubble
- `handleKeyDown(event)` - Handle keyboard input
- `handleKeyUp(event)` - Handle keyboard release

## 🧪 Testing

The avatar system includes comprehensive tests covering:

- Avatar initialization and synchronization
- Message handling and validation
- Movement controls and collision detection
- Animation and chat bubble systems
- Error handling and edge cases
- Integration with voice activity

Run tests:

```bash
npm test src/@core/avatar-overlay/avatar-manager.test.ts
```

## 🔒 Privacy & Security

### Data Sharing Controls

- Avatar images and display names are only shared if enabled in privacy settings
- Voice activity indicators can be disabled
- Custom avatars can be restricted by administrators

### Cross-origin Safety

- Overlay injection includes cross-origin restriction checks
- Fallback behavior when video access is blocked
- Secure handling of user-provided avatar URLs

### Performance Considerations

- Efficient canvas rendering with requestAnimationFrame
- Throttled position updates (30Hz default)
- Automatic cleanup of expired avatars and animations
- GPU acceleration support where available

## 🐛 Troubleshooting

### Common Issues

**Avatar overlay not appearing:**
- Check if video element is accessible (not cross-origin blocked)
- Verify avatar manager is initialized with correct room/user IDs
- Ensure overlay injection was successful

**Avatars not syncing:**
- Verify signaling connection is active
- Check message handling in avatar manager
- Confirm room IDs match across participants

**Performance issues:**
- Reduce update rate in configuration
- Disable collision avoidance for better performance
- Enable GPU acceleration if available

### Debug Mode

Enable debug logging:

```typescript
// Enable verbose logging
console.log('Avatar system debug mode enabled');

// Monitor avatar updates
avatarManager.addEventListener('avatarUpdate', (avatar) => {
  console.log('Avatar updated:', avatar);
});
```

## 📈 Performance Metrics

- **Rendering**: 60fps canvas rendering with requestAnimationFrame
- **Network**: 30Hz position updates (configurable)
- **Memory**: Automatic cleanup of expired data
- **CPU**: Optimized collision detection and interpolation
- **Bandwidth**: Minimal message overhead (~50 bytes per update)

## 🔮 Future Enhancements

- **3D Avatars**: WebGL-based 3D avatar rendering
- **Gesture Recognition**: Camera-based gesture detection
- **Avatar Marketplace**: Shared avatar asset library
- **Advanced Animations**: Sprite-based animation system
- **Spatial Audio**: Position-based audio effects
- **Mini-map View**: Overview of all avatar positions