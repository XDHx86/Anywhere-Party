# Watch Party Extension Assets

This directory contains all visual assets for the Watch Party Extension, organized for maintainability and performance.

## Directory Structure

```
assets/
├── icons/
│   ├── toolbar/          # Extension toolbar icons (16x16, 32x32, 48x48)
│   ├── popup/            # Popup UI icons (play, pause, chat, mic, etc.)
│   ├── reactions/        # Reaction icons (heart, laugh, surprise, etc.)
│   └── ui/               # General UI icons (settings, close, expand, etc.)
├── avatars/
│   ├── placeholders/     # Colored avatar placeholders (8 variants)
│   └── animations/       # Avatar action GIFs (wave, laugh, idle)
├── animations/
│   ├── loading/          # Spinner and loading animations
│   └── transitions/      # UI transition effects
├── backgrounds/
│   ├── blur-overlays/    # Modal and popup background blurs
│   └── gradients/        # Subtle gradient backgrounds
└── logo/
    ├── main/             # Primary extension logo variants
    ├── light-theme/      # Light theme optimized versions
    └── dark-theme/       # Dark theme optimized versions
```

## Asset Guidelines

### File Formats
- **SVG**: Scalable icons and simple graphics (preferred)
- **PNG**: Complex graphics requiring raster format
- **GIF**: Simple animations (future implementation)
- **CSS**: Styling and effects

### Size Limits
- Individual assets: <50KB
- Total asset bundle: <2MB
- Optimize all assets for performance

### Design Principles
- **Material 3/Fluent Design**: Soft shadows, rounded corners (12-16px radius)
- **Accessibility**: Proper contrast ratios for light/dark themes
- **Consistency**: Unified color palette and spacing
- **Performance**: Optimized for small size and high DPI

### Color Palette
- Primary: `#6366F1` (Indigo)
- Primary Dark: `#4F46E5`
- Secondary: `#10B981` (Emerald)
- Success: `#10B981`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Info: `#3B82F6`

### Avatar Colors
8 distinct colors for user avatars:
- Blue: `#3B82F6`
- Green: `#10B981`
- Purple: `#8B5CF6`
- Red: `#EF4444`
- Yellow: `#F59E0B`
- Pink: `#EC4899`
- Indigo: `#6366F1`
- Teal: `#14B8A6`

## Usage in Code

### Referencing Assets
Always use relative paths from the extension root:
```javascript
const iconPath = 'assets/icons/popup/play.svg';
const logoPath = 'assets/logo/main/watch-party-logo.svg';
```

### Theme-Aware Assets
Use appropriate variants for different themes:
```javascript
const logoPath = isDarkTheme 
  ? 'assets/logo/dark-theme/watch-party-logo-dark.svg'
  : 'assets/logo/light-theme/watch-party-logo-light.svg';
```

### CSS Integration
Import background styles:
```css
@import url('assets/backgrounds/gradients/primary-gradient.css');
@import url('assets/backgrounds/blur-overlays/modal-backdrop.css');
```

## Licensing

All assets in this directory are created specifically for the Watch Party Extension and are licensed under MIT. No external assets with restrictive licenses are included.

## Future Enhancements

- Avatar animations (GIFs for wave, laugh, idle actions)
- Additional UI transition effects
- More gradient variations
- Icon font integration (Font Awesome subset)

## Asset Manifest

See `asset-manifest.json` for a complete catalog of all assets, their paths, sizes, and usage descriptions.