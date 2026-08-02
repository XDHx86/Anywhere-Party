# Material Design 3 Overlay System

A comprehensive overlay system implementing Material Design 3 principles for floating surfaces, avatars, and reactions with proper elevation, animations, and responsive positioning.

## Components

### FloatingSurface
A translucent floating surface with Material Design 3 elevation and backdrop blur effects.

**Features:**
- Material Design 3 elevation levels (none, low, medium, high)
- Configurable opacity and backdrop blur
- Multiple animation types (fade, slide, scale)
- Responsive positioning system
- Proper z-index management

**Usage:**
```tsx
import { FloatingSurface } from '@ui/components/overlays';

<FloatingSurface
  elevation="medium"
  opacity={0.95}
  borderRadius="md"
  backdropBlur={8}
  position="center"
  visible={true}
  animationType="scale"
>
  Content goes here
</FloatingSurface>
```

### AvatarContainer
Material Design 3 styled avatar container with status indicators and interactive features.

**Features:**
- Rounded Material Design 3 styling
- Host, active, and mute status indicators
- Hover animations and ripple effects
- Tooltip support
- Configurable sizes (small, medium, large)
- Staggered entrance animations

**Usage:**
```tsx
import { AvatarContainer } from '@ui/components/overlays';

<AvatarContainer
  userId="user-1"
  name="Alice Johnson"
  color="#6200EE"
  size="medium"
  isActive={true}
  isHost={true}
  isMuted={false}
  onClick={() => console.log('Avatar clicked')}
/>
```

### ReactionIndicator
Animated reaction indicators with Material motion principles.

**Features:**
- Material Design 3 motion and timing
- Floating animation effects
- Configurable duration and fade timing
- Sparkle effects for large reactions
- Automatic cleanup after animation

**Usage:**
```tsx
import { ReactionIndicator } from '@ui/components/overlays';

<ReactionIndicator
  reactionId="reaction-1"
  emoji="❤️"
  userId="user-1"
  timestamp={Date.now()}
  videoTimestamp={42.5}
  size="medium"
  duration={3000}
  onComplete={() => console.log('Reaction completed')}
/>
```

### OverlayManager
Comprehensive manager for all overlay components with responsive positioning and z-index management.

**Features:**
- Responsive grid layout
- Automatic positioning calculation
- Z-index management
- Staggered animations
- Performance optimization
- Configurable limits and spacing

**Usage:**
```tsx
import { OverlayManager } from '@ui/components/overlays';

<OverlayManager
  videoElement={videoRef.current}
  avatars={avatars}
  reactions={reactions}
  responsive={true}
  maxAvatars={12}
  maxReactions={20}
  onAvatarClick={(userId) => console.log('Avatar clicked:', userId)}
  onReactionComplete={(id) => console.log('Reaction completed:', id)}
/>
```

## Hooks

### useResponsiveOverlays
Manages responsive overlay positioning for different screen sizes.

```tsx
import { useResponsiveOverlays } from '@ui/components/overlays';

const { breakpoint, getResponsiveConfig, isMobile } = useResponsiveOverlays(containerWidth);
```

### useZIndexManager
Manages z-index values for proper overlay stacking.

```tsx
import { useZIndexManager } from '@ui/components/overlays';

const { getZIndex, reserveZIndex, bringToFront } = useZIndexManager(config);
```

## Configuration

### OverlayConfig
```tsx
const overlayConfig: OverlayConfig = {
  surface: {
    elevation: 'medium',
    opacity: 0.95,
    borderRadius: 'md',
    backdropBlur: 8,
    padding: 'sm',
  },
  animation: {
    duration: 350,
    easing: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
    type: 'scale',
    staggerDelay: 100,
  },
  positioning: {
    responsive: true,
    maxAvatarsPerRow: 6,
    avatarSpacing: 16,
    reactionSpacing: 12,
    edgeOffset: 20,
  },
  zIndex: {
    base: 1000,
    avatar: 1100,
    reaction: 1200,
    tooltip: 1300,
  },
};
```

## Responsive Breakpoints

The overlay system automatically adapts to different screen sizes:

- **Mobile** (≤600px): Small avatars/reactions, 4 max avatars, compact spacing
- **Tablet** (≤1024px): Medium avatars/reactions, 8 max avatars, standard spacing  
- **Desktop** (>1024px): Large avatars/reactions, 12 max avatars, generous spacing

## Animations

All animations follow Material Design 3 motion principles:

- **Duration**: Uses Material motion tokens (short1-extraLong4)
- **Easing**: Emphasized easing for important transitions
- **Stagger**: Configurable stagger delays for list animations
- **Types**: Fade, slide, scale animations with proper timing

## Accessibility

- ARIA labels and descriptions for screen readers
- Keyboard navigation support
- High contrast mode compatibility
- Touch-friendly sizing on mobile devices
- Semantic HTML structure

## Performance

- Virtual positioning for large numbers of overlays
- Efficient re-rendering with React.memo
- Automatic cleanup of completed animations
- Optimized z-index management
- Responsive observer for container changes

## Testing

Run the overlay test page:
```bash
# Open overlay-test.html in your browser
open src/@ui/components/overlays/overlay-test.html
```

Or use the React demo component:
```tsx
import { OverlayDemo } from '@ui/components/overlays/OverlayDemo';

<OverlayDemo />
```

## Browser Support

- Chrome 88+ (MV3 compatible)
- Firefox 78+ (WebExtensions compatible)
- Safari 14+ (with backdrop-filter support)
- Edge 88+ (Chromium-based)

## Requirements Fulfilled

This implementation satisfies the following requirements:

- **28.1**: FloatingSurface with translucency and proper elevation
- **28.2**: AvatarContainer with Material styling and rounded design  
- **28.3**: ReactionIndicator with Material motion and timing
- **28.4**: Responsive overlay positioning for different screen sizes
- **28.5**: Material Design 3 motion principles and smooth animations

All components follow Material Design 3 specifications with consistent shadows, border radius (12-16px), and the specified color palette.