# Material Design 3 Migration Guide

## Overview

This guide helps developers migrate from the old HTML/CSS-based UI to the new Material Design 3 React components. The migration introduces modern design patterns, improved accessibility, and better maintainability.

## Migration Strategy

### Phase 1: Setup and Dependencies

#### 1.1 Install Required Dependencies

The new Material Design 3 system requires additional dependencies:

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @types/react @types/react-dom  # If using TypeScript
```

#### 1.2 Update Build Configuration

Ensure your webpack configuration supports React and JSX:

```javascript
// webpack.config.js
module.exports = {
  entry: {
    'popup-react': './src/@ui/popup/popup-react.tsx',
    'options-react': './src/@ui/options/OptionsApp.tsx'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  }
};
```

#### 1.3 Update HTML Entry Points

Replace old HTML files with React-enabled versions:

```html
<!-- Old: popup.html -->
<div id="mainMenu">
  <button id="createRoom">Create Room</button>
  <button id="joinRoom">Join Room</button>
</div>

<!-- New: popup-react.html -->
<div id="root">
  <!-- React app will mount here -->
</div>
<script src="popup-react.js"></script>
```

### Phase 2: Component Migration

#### 2.1 Button Migration

**Old Implementation:**
```html
<button id="createRoom" class="btn btn-primary">Create Room</button>
```

```css
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #007bff;
  color: white;
}
```

**New Implementation:**
```tsx
import { MaterialButton } from '@ui/components/cards/MaterialButton';

<MaterialButton 
  variant="filled" 
  color="primary"
  onClick={handleCreateRoom}
>
  Create Room
</MaterialButton>
```

#### 2.2 Input Field Migration

**Old Implementation:**
```html
<div class="form-group">
  <label for="roomName">Room Name</label>
  <input type="text" id="roomName" class="form-control" placeholder="Enter room name">
</div>
```

**New Implementation:**
```tsx
import { MaterialInput } from '@ui/components/cards/MaterialInput';

<MaterialInput
  label="Room Name"
  placeholder="Enter room name"
  value={roomName}
  onChange={(e) => setRoomName(e.target.value)}
/>
```

#### 2.3 Card Layout Migration

**Old Implementation:**
```html
<div class="card">
  <div class="card-header">
    <h3>Settings</h3>
  </div>
  <div class="card-body">
    <p>Content goes here</p>
  </div>
</div>
```

**New Implementation:**
```tsx
import { MaterialCard } from '@ui/components/cards/MaterialCard';

<MaterialCard elevation="medium" padding="large">
  <h3>Settings</h3>
  <p>Content goes here</p>
</MaterialCard>
```

### Phase 3: Layout Structure Migration

#### 3.1 Popup Layout Migration

**Old Structure:**
```html
<div class="popup-container">
  <div class="header">
    <h2>Watch Party</h2>
  </div>
  <div class="main-content">
    <div id="mainMenu" class="section">
      <!-- Main menu buttons -->
    </div>
    <div id="roomView" class="section hidden">
      <!-- Room interface -->
    </div>
  </div>
  <div class="footer">
    <div class="status">Connected</div>
  </div>
</div>
```

**New Structure:**
```tsx
import { PopupApp } from '@ui/popup/PopupApp';
import { HeaderCard, MainCard, FooterCard } from '@ui/components/cards';

function PopupApp() {
  return (
    <div className="popup-container">
      <HeaderCard title="Watch Party" />
      <MainCard>
        {currentView === 'menu' && <MainMenu />}
        {currentView === 'room' && <RoomView />}
      </MainCard>
      <FooterCard status={connectionStatus} />
    </div>
  );
}
```

#### 3.2 Options Page Migration

**Old Structure:**
```html
<div class="options-container">
  <nav class="nav-tabs">
    <a href="#general" class="nav-link active">General</a>
    <a href="#accessibility" class="nav-link">Accessibility</a>
  </nav>
  <div class="tab-content">
    <div id="general" class="tab-pane active">
      <!-- General settings -->
    </div>
  </div>
</div>
```

**New Structure:**
```tsx
import { Tabs, Tab, TabPanel } from '@mui/material';
import { GeneralSettingsCard, AccessibilityCard } from '@ui/options/components';

function OptionsApp() {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <div className="options-container">
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
        <Tab label="General" />
        <Tab label="Accessibility" />
      </Tabs>
      
      <TabPanel value={activeTab} index={0}>
        <GeneralSettingsCard />
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <AccessibilityCard />
      </TabPanel>
    </div>
  );
}
```

### Phase 4: State Management Migration

#### 4.1 From DOM Manipulation to React State

**Old Approach:**
```javascript
// DOM-based state management
function showCreateRoomForm() {
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('createRoomForm').classList.remove('hidden');
}

function updateConnectionStatus(status) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = status;
  statusElement.className = `status ${status}`;
}
```

**New Approach:**
```tsx
// React state management
function PopupApp() {
  const [currentView, setCurrentView] = useState<'menu' | 'createRoom' | 'room'>('menu');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  
  const showCreateRoomForm = () => {
    setCurrentView('createRoom');
  };
  
  const updateConnectionStatus = (status: ConnectionState) => {
    setConnectionStatus(status);
  };
  
  return (
    <div className="popup-container">
      {currentView === 'menu' && <MainMenu onCreateRoom={showCreateRoomForm} />}
      {currentView === 'createRoom' && <CreateRoomForm />}
      <FooterCard status={connectionStatus} />
    </div>
  );
}
```

#### 4.2 Event Handling Migration

**Old Approach:**
```javascript
// Event listeners on DOM elements
document.getElementById('createRoom').addEventListener('click', async (e) => {
  const button = e.target;
  button.disabled = true;
  button.textContent = 'Creating...';
  
  try {
    await createRoom();
    button.textContent = 'Success!';
  } catch (error) {
    button.textContent = 'Error';
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.textContent = 'Create Room';
    }, 2000);
  }
});
```

**New Approach:**
```tsx
// React component with hooks
function CreateRoomButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const handleCreateRoom = async () => {
    setLoading(true);
    setStatus('idle');
    
    try {
      await createRoom();
      setStatus('success');
    } catch (error) {
      setStatus('error');
    } finally {
      setLoading(false);
      setTimeout(() => setStatus('idle'), 2000);
    }
  };
  
  return (
    <MaterialButton
      variant="filled"
      color="primary"
      loading={loading}
      onClick={handleCreateRoom}
    >
      {status === 'success' && 'Success!'}
      {status === 'error' && 'Error'}
      {status === 'idle' && 'Create Room'}
    </MaterialButton>
  );
}
```

### Phase 5: Styling Migration

#### 5.1 CSS to Material Design Tokens

**Old CSS:**
```css
.card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
}
```

**New Material Design Tokens:**
```css
:root {
  --md-primary-main: #6200EE;
  --md-surface-main: #FFFFFF;
  --md-space-4: 16px;
  --md-shape-md: 12px;
  --md-elevation-1: 0px 1px 2px rgba(0, 0, 0, 0.3);
}

.material-card {
  background: var(--md-surface-main);
  border-radius: var(--md-shape-md);
  padding: var(--md-space-4);
  box-shadow: var(--md-elevation-1);
}
```

#### 5.2 Theme Integration

**Old Approach:**
```css
/* Separate light and dark stylesheets */
/* light-theme.css */
.card { background: #ffffff; }

/* dark-theme.css */
.card { background: #121212; }
```

**New Approach:**
```tsx
// Automatic theme switching with Material UI
import { MaterialThemeProvider } from '@ui/theme/theme-provider';

function App() {
  return (
    <MaterialThemeProvider initialTheme="auto">
      <PopupApp />
    </MaterialThemeProvider>
  );
}
```

### Phase 6: Accessibility Migration

#### 6.1 Enhanced Accessibility Features

**Old Implementation:**
```html
<button id="createRoom">Create Room</button>
<div id="status">Connected</div>
```

**New Implementation:**
```tsx
<MaterialButton
  variant="filled"
  color="primary"
  onClick={handleCreateRoom}
  aria-label="Create a new watch party room"
  disabled={!isConnected}
>
  Create Room
</MaterialButton>

<div 
  role="status" 
  aria-live="polite"
  aria-label={`Connection status: ${connectionStatus}`}
>
  {connectionStatus}
</div>
```

#### 6.2 Keyboard Navigation

**Old Approach:**
```javascript
// Manual keyboard handling
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    // Manual focus management
  }
});
```

**New Approach:**
```tsx
// Built-in Material UI keyboard navigation
import { PopupAccessibility } from '@ui/accessibility/PopupAccessibility';

function PopupApp() {
  return (
    <PopupAccessibility>
      <MaterialThemeProvider>
        {/* Components automatically handle keyboard navigation */}
        <MaterialButton>Create Room</MaterialButton>
        <MaterialInput label="Room Name" />
      </MaterialThemeProvider>
    </PopupAccessibility>
  );
}
```

## Migration Checklist

### Pre-Migration
- [ ] Backup existing codebase
- [ ] Install required dependencies
- [ ] Update build configuration
- [ ] Set up development environment

### Component Migration
- [ ] Identify all UI components to migrate
- [ ] Create component mapping (old → new)
- [ ] Migrate buttons to MaterialButton
- [ ] Migrate inputs to MaterialInput
- [ ] Migrate cards to MaterialCard
- [ ] Migrate icons to MaterialIcon

### Layout Migration
- [ ] Convert popup layout to React components
- [ ] Convert options page to tabbed interface
- [ ] Implement responsive design
- [ ] Add proper component hierarchy

### State Management
- [ ] Replace DOM manipulation with React state
- [ ] Convert event listeners to React handlers
- [ ] Implement proper error handling
- [ ] Add loading states

### Styling Migration
- [ ] Replace custom CSS with Material Design tokens
- [ ] Implement theme system
- [ ] Ensure dark mode compatibility
- [ ] Test responsive behavior

### Accessibility
- [ ] Add ARIA labels and descriptions
- [ ] Implement keyboard navigation
- [ ] Test with screen readers
- [ ] Verify color contrast ratios

### Testing
- [ ] Test all migrated components
- [ ] Verify cross-browser compatibility
- [ ] Test accessibility features
- [ ] Performance testing

### Deployment
- [ ] Update build scripts
- [ ] Test extension packaging
- [ ] Verify all assets are included
- [ ] Deploy to staging environment

## Common Migration Issues

### Issue 1: Bundle Size Increase

**Problem:** React and Material UI significantly increase bundle size.

**Solution:**
```javascript
// Use code splitting and lazy loading
const OptionsApp = React.lazy(() => import('./OptionsApp'));

function App() {
  return (
    <Suspense fallback={<MaterialLoadingIndicator />}>
      <OptionsApp />
    </Suspense>
  );
}
```

### Issue 2: CSS Conflicts

**Problem:** Old CSS conflicts with Material UI styles.

**Solution:**
```css
/* Scope old styles to avoid conflicts */
.legacy-component {
  /* Old styles here */
}

/* Use CSS modules or styled-components for new components */
```

### Issue 3: Event Handler Migration

**Problem:** Complex event handling logic needs restructuring.

**Solution:**
```tsx
// Extract complex logic into custom hooks
function useRoomManagement() {
  const [roomState, setRoomState] = useState();
  
  const createRoom = useCallback(async (options) => {
    // Room creation logic
  }, []);
  
  return { roomState, createRoom };
}

function RoomComponent() {
  const { roomState, createRoom } = useRoomManagement();
  // Use in component
}
```

### Issue 4: Theme Switching

**Problem:** Manual theme switching needs to be replaced.

**Solution:**
```tsx
// Use Material UI theme provider
import { useMaterialTheme } from '@ui/theme/theme-provider';

function ThemeToggle() {
  const { theme, toggleTheme } = useMaterialTheme();
  
  return (
    <MaterialButton onClick={toggleTheme}>
      Switch to {theme === 'light' ? 'dark' : 'light'} theme
    </MaterialButton>
  );
}
```

## Performance Considerations

### Bundle Optimization

1. **Tree Shaking:** Import only needed Material UI components
```tsx
// ✅ Good - tree shaking friendly
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

// ❌ Avoid - imports entire library
import { Button, TextField } from '@mui/material';
```

2. **Code Splitting:** Split large components
```tsx
// Split heavy components
const AdvancedSettings = React.lazy(() => import('./AdvancedSettings'));
```

3. **Memoization:** Prevent unnecessary re-renders
```tsx
const ExpensiveComponent = React.memo(({ data }) => {
  // Component implementation
});
```

### Runtime Performance

1. **Minimize Re-renders:** Use proper dependency arrays
```tsx
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]); // Only recalculate when data changes
```

2. **Optimize Event Handlers:** Use useCallback for stable references
```tsx
const handleClick = useCallback((id) => {
  // Handle click
}, []);
```

## Testing Strategy

### Component Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialButton } from '@ui/components/cards/MaterialButton';

test('MaterialButton handles click events', () => {
  const handleClick = jest.fn();
  render(
    <MaterialButton onClick={handleClick}>
      Click me
    </MaterialButton>
  );
  
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

### Integration Testing

```tsx
import { render, screen } from '@testing-library/react';
import { MaterialThemeProvider } from '@ui/theme/theme-provider';
import { PopupApp } from '@ui/popup/PopupApp';

test('PopupApp renders with theme provider', () => {
  render(
    <MaterialThemeProvider>
      <PopupApp />
    </MaterialThemeProvider>
  );
  
  expect(screen.getByText('Watch Party')).toBeInTheDocument();
});
```

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback:**
   - Revert to previous build configuration
   - Switch HTML files back to old versions
   - Restore old CSS files

2. **Partial Rollback:**
   - Keep new components that work
   - Revert problematic components to old implementation
   - Gradually re-migrate fixed components

3. **Gradual Migration:**
   - Migrate one component at a time
   - Test thoroughly before proceeding
   - Maintain both old and new systems temporarily

## Support and Resources

### Documentation
- [Material Design 3 Guidelines](https://m3.material.io/)
- [Material UI Documentation](https://mui.com/)
- [React Documentation](https://react.dev/)

### Internal Resources
- Component API Documentation: `docs/material-design-3-api.md`
- Style Guide: `docs/material-design-3-style-guide.md`
- Deployment Checklist: `docs/deployment-checklist.md`

### Getting Help
- Check existing component implementations in `src/@ui/components/`
- Review test files for usage examples
- Consult the Material Design 3 style guide for design decisions