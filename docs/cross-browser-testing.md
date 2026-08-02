# Cross-Browser Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Watch Party Extension on both Chrome MV3 and Firefox to verify all fixes work correctly across browsers.

## Prerequisites
- Chrome browser (latest version)
- Firefox browser (latest version)
- Local relay server running on port 8080

## Test Environment Setup

### 1. Start Local Relay Server
```bash
cd server
npm start
```
Server should start on `ws://localhost:8080`

### 2. Build Extensions for Both Browsers
```bash
npm run build
```
This creates:
- `dist/chrome/` - Chrome MV3 extension
- `dist/firefox/` - Firefox extension

## Chrome MV3 Testing

### Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist/chrome/` directory
5. Verify extension appears with Watch Party icon

### Testing Checklist

#### ✅ Signaling Server Connectivity (Requirement 18.1)
- [ ] **Connection Establishment**
  - Click extension icon to open popup
  - Verify status shows "Connecting..." then "Connected"
  - Check browser console for WebSocket connection logs
  - Expected: Clean connection without errors

- [ ] **Connection Health**
  - Leave popup open for 30+ seconds
  - Verify connection remains stable
  - Check for ping/pong heartbeat messages in console
  - Expected: No connection drops or timeouts

- [ ] **Reconnection Logic**
  - Stop the relay server (`Ctrl+C` in server terminal)
  - Verify popup shows "Disconnected" status
  - Restart server (`npm start`)
  - Verify automatic reconnection within 10 seconds
  - Expected: Seamless reconnection with exponential backoff

#### ✅ Popup Button Functionality (Requirement 19.1)
- [ ] **Create Room Button**
  - Click "Create Room" button
  - Verify button shows loading state (spinner/disabled)
  - Verify success state after room creation
  - Check for room ID display
  - Expected: Smooth state transitions, clear feedback

- [ ] **Join Room Button**
  - Enter a room ID in the input field
  - Click "Join Room" button
  - Verify loading → success state transition
  - Expected: Proper validation and feedback

- [ ] **Error Handling**
  - Try joining non-existent room
  - Verify error state and message display
  - Expected: Clear error messages, recovery options

#### ✅ Video Detection Workflow (Requirement 3.1, 3.2)
- [ ] **YouTube Test**
  - Navigate to any YouTube video
  - Click "Start Room" in popup
  - Verify video detection works automatically
  - Expected: Video detected without user intervention

- [ ] **Netflix Test**
  - Navigate to Netflix (if available)
  - Click "Start Room" in popup
  - Verify video detection or fallback message
  - Expected: Graceful handling of cross-origin restrictions

- [ ] **Right-click Fallback**
  - Navigate to a site without videos (e.g., google.com)
  - Click "Start Room" in popup
  - Verify right-click fallback message appears
  - Right-click on page elements
  - Expected: Clear fallback instructions

#### ✅ UI Design Consistency (Requirement 20.1)
- [ ] **Visual Design**
  - Verify popup has modern Material/Fluent styling
  - Check button hover states and animations
  - Verify consistent spacing and typography
  - Expected: Professional, modern appearance

- [ ] **Responsive Layout**
  - Resize popup window (if possible)
  - Verify elements remain properly aligned
  - Expected: Responsive design principles

## Firefox Testing

### Installation
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in left sidebar
3. Click "Load Temporary Add-on"
4. Select `dist/firefox/manifest.json`
5. Verify extension appears in toolbar

### Testing Checklist
Repeat all Chrome tests above, noting any Firefox-specific behaviors:

#### ✅ Firefox-Specific Checks
- [ ] **WebExtension API Compatibility**
  - Verify `browser.*` API usage instead of `chrome.*`
  - Check console for API compatibility warnings
  - Expected: No API-related errors

- [ ] **Manifest V2 Compatibility**
  - Verify background script loads correctly
  - Check for MV2-specific features working
  - Expected: Full functionality despite MV2 differences

- [ ] **WebSocket Behavior**
  - Compare connection timing with Chrome
  - Verify Firefox-specific error handling
  - Expected: Slightly different timing but same functionality

## Performance Testing

### Connection Performance
- [ ] **Chrome Connection Time**
  - Measure time from popup open to "Connected" status
  - Record in console: `Performance: Connected in Xms`
  - Expected: < 1000ms for local server

- [ ] **Firefox Connection Time**
  - Repeat measurement in Firefox
  - Compare with Chrome timing
  - Expected: < 1500ms (Firefox may be slightly slower)

### Memory Usage
- [ ] **Chrome Memory**
  - Open Chrome Task Manager (`Shift+Esc`)
  - Monitor extension memory usage over 5 minutes
  - Expected: Stable memory, no significant leaks

- [ ] **Firefox Memory**
  - Open Firefox Task Manager (`about:performance`)
  - Monitor extension memory usage
  - Expected: Similar stability to Chrome

## Cross-Browser Compatibility Matrix

| Feature | Chrome MV3 | Firefox | Notes |
|---------|------------|---------|-------|
| WebSocket Connection | ✅ | ✅ | Firefox may have 50ms longer delay |
| Popup UI | ✅ | ✅ | Identical appearance expected |
| Video Detection | ✅ | ✅ | Same heuristics, different timing |
| Error Handling | ✅ | ✅ | Browser-specific error messages |
| Performance | ✅ | ✅ | Firefox ~20% slower acceptable |

## Common Issues and Solutions

### Chrome Issues
- **Service Worker Inactive**: Refresh extension or reload page
- **WebSocket Blocked**: Check Chrome security settings
- **Popup Not Opening**: Verify manifest permissions

### Firefox Issues
- **Temporary Add-on**: Must reload after Firefox restart
- **WebSocket Timeout**: Firefox may need longer connection timeout
- **API Differences**: Some Chrome APIs may not exist in Firefox

## Test Results Documentation

### Chrome MV3 Results
```
Date: [DATE]
Version: Chrome [VERSION]
✅ Signaling connectivity: PASS
✅ Popup functionality: PASS  
✅ Video detection: PASS
✅ UI consistency: PASS
✅ Performance: [TIME]ms connection
```

### Firefox Results
```
Date: [DATE]
Version: Firefox [VERSION]
✅ Signaling connectivity: PASS
✅ Popup functionality: PASS
✅ Video detection: PASS  
✅ UI consistency: PASS
✅ Performance: [TIME]ms connection
```

## Automated Testing Commands

For developers who want to run automated tests:

```bash
# Run cross-browser integration tests
npm test -- src/@core/cross-browser/

# Run popup functionality tests  
npm test -- src/@ui/popup/popup-cross-browser.test.ts

# Run video detection tests
npm test -- src/@core/video-detector/video-detector.test.ts

# Run signaling client tests
npm test -- src/@core/signaling/signaling-client.test.ts
```

## Success Criteria

The cross-browser testing is considered successful when:

1. **All manual tests pass** on both Chrome and Firefox
2. **Performance is acceptable** (< 2s connection time)
3. **No browser-specific errors** in console logs
4. **UI appears identical** across browsers
5. **All core functionality works** without browser-specific workarounds

## Next Steps

After successful cross-browser testing:
1. Update task status to completed
2. Document any browser-specific findings
3. Create browser compatibility documentation
4. Prepare for production deployment