# Material Design 3 Component API Documentation

## Overview

This document provides comprehensive API documentation for all Material Design 3 components implemented in the Watch Party Extension. All components follow Material Design 3 guidelines and are built with React, TypeScript, and Material UI.

## Core Components

### MaterialCard

The foundational card component implementing Material Design 3 elevation and styling.

```typescript
interface MaterialCardProps extends BaseComponentProps {
  elevation?: 'none' | 'low' | 'medium' | 'high';
  variant?: 'elevated' | 'filled' | 'outlined';
  rounded?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
}
```

**Usage:**
```tsx
<MaterialCard elevation="medium" variant="elevated" padding="medium">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</MaterialCard>
```

**Props:**
- `elevation`: Controls shadow depth following Material Design 3 elevation system
- `variant`: Visual style variant (elevated with shadow, filled with background, outlined with border)
- `rounded`: Applies 12-16px border radius when true
- `padding`: Internal spacing using Material Design 3 spacing scale

### MaterialButton

Interactive button component with Material Design 3 states and animations.

```typescript
interface MaterialButtonProps extends BaseComponentProps {
  variant?: 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}
```

**Usage:**
```tsx
<MaterialButton 
  variant="filled" 
  color="primary" 
  startIcon={<PlayIcon />}
  onClick={handlePlay}
>
  Start Room
</MaterialButton>
```

**States:**
- Idle: Default state with subtle elevation
- Hover: Increased elevation and color intensity
- Focus: Visible focus ring for accessibility
- Pressed: Reduced elevation with ripple effect
- Disabled: Reduced opacity and no interactions

### MaterialInput

Text input component with Material Design 3 styling and validation.

```typescript
interface MaterialInputProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  value?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'search';
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
```

**Usage:**
```tsx
<MaterialInput
  label="Room Name"
  placeholder="Enter room name"
  value={roomName}
  onChange={(e) => setRoomName(e.target.value)}
  helperText="Choose a memorable name for your room"
/>
```

### MaterialIcon

Icon wrapper component with Material Design 3 styling and accessibility.

```typescript
interface MaterialIconProps extends BaseComponentProps {
  name: string;
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'inherit';
  variant?: 'filled' | 'outlined' | 'rounded' | 'sharp';
  onClick?: (event: React.MouseEvent) => void;
  'aria-label'?: string;
}
```

**Usage:**
```tsx
<MaterialIcon 
  name="play_arrow" 
  size="medium" 
  color="primary"
  aria-label="Play video"
/>
```

## Layout Components

### HeaderCard

Top-level card containing extension branding and navigation.

```typescript
interface HeaderCardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  logo?: React.ReactNode;
  actions?: React.ReactNode;
}
```

### MainCard

Primary content area for room controls and main functionality.

```typescript
interface MainCardProps extends BaseComponentProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
}
```

### SecondaryCard

Collapsible card for secondary features and settings.

```typescript
interface SecondaryCardProps extends BaseComponentProps {
  title: string;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}
```

### FooterCard

Bottom card containing status information and quick actions.

```typescript
interface FooterCardProps extends BaseComponentProps {
  status?: 'connected' | 'connecting' | 'disconnected' | 'error';
  statusText?: string;
  actions?: React.ReactNode;
}
```

## Form Components

### MaterialSwitch

Toggle switch component following Material Design 3 specifications.

```typescript
interface MaterialSwitchProps extends BaseComponentProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
}
```

### MaterialSelect

Dropdown selection component with Material Design 3 styling.

```typescript
interface MaterialSelectProps extends BaseComponentProps {
  label?: string;
  value?: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  onChange?: (value: string) => void;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

### MaterialSlider

Range input component with Material Design 3 styling.

```typescript
interface MaterialSliderProps extends BaseComponentProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  marks?: boolean;
  onChange?: (value: number) => void;
}
```

### MaterialFileInput

File upload component with drag-and-drop support.

```typescript
interface MaterialFileInputProps extends BaseComponentProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  onChange?: (files: FileList | null) => void;
}
```

## Feedback Components

### MaterialLoadingIndicator

Loading spinner with Material Design 3 animations.

```typescript
interface MaterialLoadingIndicatorProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'inherit';
  variant?: 'circular' | 'linear';
  value?: number; // For determinate progress
}
```

## Chat Components

### ChatSidebar

Complete chat interface with Material Design 3 styling.

```typescript
interface ChatSidebarProps extends BaseComponentProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, reactionId: string) => void;
  currentUserId: string;
  isOpen: boolean;
  onClose?: () => void;
}
```

### MessageCard

Individual message component with reactions and timestamps.

```typescript
interface MessageCardProps extends BaseComponentProps {
  message: ChatMessage;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, reactionId: string) => void;
  currentUserId: string;
}
```

### InputBar

Message input component with send button and emoji picker.

```typescript
interface InputBarProps extends BaseComponentProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

## Overlay Components

### FloatingSurface

Translucent overlay surface with Material Design 3 elevation.

```typescript
interface FloatingSurfaceProps extends BaseComponentProps {
  elevation?: ElevationLevel;
  opacity?: number;
  borderRadius?: BorderRadiusSize;
  backdropBlur?: number;
  padding?: SpacingSize;
  maxWidth?: string | number;
  maxHeight?: string | number;
  position?: OverlayPosition;
}
```

### AvatarContainer

User avatar display with status indicators.

```typescript
interface AvatarContainerProps extends BaseComponentProps {
  avatar: Avatar;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
  onClick?: (userId: string) => void;
}
```

### ReactionIndicator

Animated reaction display for video overlays.

```typescript
interface ReactionIndicatorProps extends BaseComponentProps {
  reaction: Reaction;
  onComplete?: (reactionId: string) => void;
}
```

## Theme System

### MaterialThemeProvider

Root theme provider component that manages Material Design 3 theming.

```typescript
interface MaterialThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: 'light' | 'dark' | 'auto';
  customColors?: Partial<MaterialPalette>;
}
```

### Theme Configuration

```typescript
interface MaterialThemeConfig {
  palette: MaterialPalette;
  spacing: MaterialSpacing;
  shape: MaterialShape;
  elevation: MaterialElevation;
  typography: MaterialTypography;
}

interface MaterialPalette {
  primary: ColorVariant;
  secondary: ColorVariant;
  surface: ColorVariant;
  error: ColorVariant;
  background: string;
  onSurface: string;
  onPrimary: string;
}
```

## Accessibility Features

All components include comprehensive accessibility support:

- **Keyboard Navigation**: Full keyboard support with proper tab order
- **Screen Reader Support**: ARIA labels, descriptions, and live regions
- **High Contrast Mode**: Automatic detection and enhanced contrast
- **Focus Management**: Visible focus indicators and logical focus flow
- **Reduced Motion**: Respects user's motion preferences

### Accessibility Props

```typescript
interface AccessibilityProps {
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-pressed'?: boolean;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  role?: string;
  tabIndex?: number;
}
```

## Animation System

### Material Motion

All animations follow Material Design 3 motion principles:

```typescript
interface MaterialMotion {
  duration: {
    short1: number; // 50ms
    short2: number; // 100ms
    short3: number; // 150ms
    short4: number; // 200ms
    medium1: number; // 250ms
    medium2: number; // 300ms
    medium3: number; // 350ms
    medium4: number; // 400ms
    long1: number; // 450ms
    long2: number; // 500ms
    long3: number; // 550ms
    long4: number; // 600ms
  };
  easing: {
    linear: string;
    standard: string;
    standardAccelerate: string;
    standardDecelerate: string;
    emphasized: string;
    emphasizedAccelerate: string;
    emphasizedDecelerate: string;
  };
}
```

## Usage Examples

### Basic Popup Layout

```tsx
function PopupApp() {
  return (
    <MaterialThemeProvider>
      <div className="popup-container">
        <HeaderCard 
          title="Watch Party"
          logo={<WatchPartyIcon />}
        />
        
        <MainCard>
          <MaterialButton 
            variant="filled" 
            color="primary"
            onClick={handleCreateRoom}
          >
            Create Room
          </MaterialButton>
          
          <MaterialButton 
            variant="outlined" 
            color="primary"
            onClick={handleJoinRoom}
          >
            Join Room
          </MaterialButton>
        </MainCard>
        
        <SecondaryCard 
          title="Settings"
          collapsed={settingsCollapsed}
          onToggle={() => setSettingsCollapsed(!settingsCollapsed)}
        >
          <MaterialSwitch
            label="Enable notifications"
            checked={notifications}
            onChange={setNotifications}
          />
        </SecondaryCard>
        
        <FooterCard 
          status="connected"
          statusText="Connected to server"
        />
      </div>
    </MaterialThemeProvider>
  );
}
```

### Options Page Layout

```tsx
function OptionsApp() {
  return (
    <MaterialThemeProvider>
      <div className="options-container">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab label="General" />
          <Tab label="Accessibility" />
          <Tab label="Appearance" />
          <Tab label="About" />
        </Tabs>
        
        <TabPanel value={activeTab} index={0}>
          <GeneralSettingsCard />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <AccessibilityCard />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <AppearanceCard />
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          <AboutCard />
        </TabPanel>
      </div>
    </MaterialThemeProvider>
  );
}
```

## Best Practices

### Component Composition

- Use composition over inheritance for component reusability
- Keep components focused on a single responsibility
- Pass data down through props, not global state
- Use render props or hooks for complex logic sharing

### Performance Optimization

- Use React.memo for expensive components
- Implement proper key props for list items
- Lazy load heavy components with React.Suspense
- Optimize bundle size with code splitting

### Accessibility Guidelines

- Always provide meaningful aria-labels
- Ensure proper color contrast ratios
- Test with keyboard navigation only
- Verify screen reader compatibility
- Support high contrast and reduced motion preferences

### Theming Best Practices

- Use theme tokens instead of hardcoded values
- Ensure components work in both light and dark themes
- Test color combinations for accessibility compliance
- Provide fallbacks for custom theme properties