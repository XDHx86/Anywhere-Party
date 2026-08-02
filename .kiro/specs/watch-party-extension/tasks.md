# Implementation Plan - Runtime Bug Fixes and UX Improvements

## Phase 1: Critical Runtime Bug Fixes

- [x] 1. Fix icon loading failures across Chrome and Firefox

  - Bundle icon fonts locally without CDN dependencies to prevent loading failures
  - Implement SVG sprite fallbacks for when icon fonts fail to load
  - Update manifest permissions to support local font loading in both Chrome MV3 and Firefox
  - Add build-time validation to ensure all icon paths exist and are accessible
  - Test icon rendering consistency across popup, options, and overlay interfaces
  - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

- [x] 1.1 Replace generated assets with professional icons




  - Source high-quality Material Symbols or FontAwesome icons under MIT/Apache 2.0/CC0 licenses
  - Create vector assets that match Material Design 3 theme with optimized SVG and 2x retina PNG variants
  - Populate assets folder with at least 20 professional icons for core functionality
  - Ensure proper contrast ratios for both light and dark themes
  - Update asset manifest with new professional assets and licensing information
  - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_

- [x] 1.2 Fix popup scrolling behavior





  - Maintain current popup dimensions without size changes
  - Add CSS overflow-y:auto to the scroll container for proper vertical scrolling
  - Ensure keyboard focus remains accessible during scrolling operations
  - Implement smooth scrolling behavior on Firefox with proper CSS properties
  - Create both manual and automated Playwright tests to validate scrolling functionality
  - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5_

- [x] 2. Fix room ID generation and server response parsing





  - Debug server response format and ensure roomId field is properly included
  - Fix API parsing logic to handle server responses correctly
  - Implement comprehensive error handling for malformed server responses
  - Display non-empty roomId in the interface immediately after creation
  - Provide functional copy and share actions for the generated roomId
  - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

- [x] 2.1 Implement room state persistence


  - Persist active room state to browser.storage.local instead of popup memory
  - Store room state in background script for persistence across popup sessions
  - Read active room state when popup reopens and render appropriate controls
  - Display active room UI with Play, Leave, and Copy Link buttons when room is active
  - Maintain room state persistence through browser restart cycles
  - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

- [x] 2.2 Add graceful subtitle engine error handling


  - Display clear "API key missing" message when OpenSubtitles API key is not configured
  - Provide call-to-action directing users to settings page for API key configuration
  - Handle all subtitle-related errors without throwing uncaught exceptions
  - Include test scenarios for stubbed failure paths in subtitle functionality
  - Continue operating with local subtitle files when external API fails
  - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5_

## Phase 2: User Experience Enhancements

- [x] 3. Implement user-managed API key system





  - Add secure input fields in Options page for OpenSubtitles and other external service API keys
  - Store API keys securely in browser.storage.local with encryption when possible
  - Remove all hardcoded API keys from the codebase for security compliance
  - Implement API key validation and testing functionality
  - Create comprehensive tests to verify API key persistence and retrieval functionality
  - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5_

- [x] 3.1 Enhance configuration import UX with preview modal


  - Load configuration file and show diff/preview modal before applying changes
  - Validate configuration schema and sanitize input data before processing
  - Require user confirmation after showing preview before saving to storage
  - Reject invalid configuration with detailed explanatory error messages
  - Include comprehensive import tests validating schema and modal workflow functionality
  - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5_

- [x] 3.2 Implement on-demand video detection workflow


  - Keep video detector completely inactive until user clicks "Start Room" button
  - Prompt user to right-click target area when auto-detection fails
  - Check element.children for video tags, then traverse element.parentElement up to 3 levels
  - Attach to video element when found via right-click and provide success feedback
  - Display "Video capturing failed" message with retry options when no video is found
  - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_

- [x] 4. Improve accessibility and interface organization

  - Move accessibility controls into a collapsible "Accessibility" card in Settings
  - Keep accessibility options collapsed by default to reduce interface clutter
  - Ensure all accessibility controls are keyboard navigable and ARIA compliant
  - Provide clear visual indicators when accessibility mode is active
  - Maintain full functionality without accessibility mode enabled
  - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5_

- [x] 4.1 Complete Material Design 3 implementation

  - Implement Material Design 3 card-based layout with defined color palette and consistent spacing
  - Replace current layout with tidy card components using elevation-based shadows and rounded corners
  - Apply Material Design 3 color system with Primary (#6200EE), Secondary (#03DAC6), Surface, and Error colors
  - Use consistent 8/16/24 dp spacing throughout all interface components
  - Include CSS variables for theme customization and ensure components are modular under /ui/components/cards/
  - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5_

## Phase 3: Cross-Browser Compatibility and Asset Management

- [x] 5. Ensure cross-browser asset loading compatibility












  - Bundle all icon fonts locally without external CDN dependencies
  - Provide SVG sprite fallbacks when icon fonts fail to load
  - Update manifest permissions to support local font loading in both Chrome MV3 and Firefox
  - Validate all asset paths during build process to prevent missing resources
  - Render icons consistently across popup, options, and overlay interfaces in both browsers
  - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5_

- [x] 5.1 Implement robust server response parsing


  - Return properly formatted JSON responses with roomId field for room creation requests
  - Parse server responses correctly and handle malformed responses gracefully
  - Display non-empty, valid room IDs in the interface immediately after successful creation
  - Provide functional copy and share actions for generated room IDs
  - Include comprehensive error handling for room creation failures with user-friendly messages
  - _Requirements: 41.1, 41.2, 41.3, 41.4, 41.5_

- [x] 5.2 Enhance persistent state management system




  - Persist active room state to browser.storage.local instead of volatile popup memory
  - Store room state in background script for persistence across popup close/open cycles
  - Read persisted room state when popup reopens and render appropriate active room controls
  - Display active room UI with Play, Leave, and Copy Link buttons when room is active
  - Maintain room state persistence through browser restart and extension reload cycles
  - _Requirements: 42.1, 42.2, 42.3, 42.4, 42.5_

## Phase 4: Error Handling and API Management

- [x] 6. Implement comprehensive API error handling





  - Display clear "API key missing" message with settings link when OpenSubtitles API key is missing
  - Provide actionable call-to-action directing users to options page for API key configuration
  - Handle all external API errors without throwing uncaught exceptions that crash the extension
  - Continue operating with local subtitle files when external APIs are unavailable
  - Include comprehensive test coverage for all error scenarios and fallback paths
  - _Requirements: 43.1, 43.2, 43.3, 43.4, 43.5_

- [x] 6.1 Create secure user-managed API key system


  - Provide secure input fields for OpenSubtitles and other external service API keys
  - Store API keys securely in browser.storage.local with encryption when possible
  - Remove all hardcoded API keys from the codebase for security compliance
  - Provide API key validation and testing functionality before saving
  - Include comprehensive tests for API key persistence, retrieval, and security
  - _Requirements: 44.1, 44.2, 44.3, 44.4, 44.5_

- [x] 6.2 Enhance configuration import UX with validation


  - Display a diff/preview modal showing all proposed changes when importing configuration
  - Validate configuration schema and sanitize input data before processing
  - Require explicit user confirmation after showing preview before applying changes
  - Reject import with detailed explanatory error messages when invalid configuration is detected
  - Include comprehensive import tests validating schema, modal workflow, and error handling
  - _Requirements: 45.1, 45.2, 45.3, 45.4, 45.5_

## Phase 5: Video Detection and User Interaction

- [x] 7. Implement on-demand video detection system


  - Keep video detector completely inactive until user explicitly clicks "Start Room" button
  - Prompt user to right-click the target video area when auto-detection fails
  - Check element.children for video tags, then traverse element.parentElement up to 3 levels
  - Attach to video element and provide success feedback when video is found via right-click
  - Display "Video capturing failed" message with retry options when no video is found after all detection attempts
  - _Requirements: 46.1, 46.2, 46.3, 46.4, 46.5_

- [x] 7.1 Create comprehensive test suite for runtime fixes

  - Write unit tests for server endpoint responses and room creation workflow
  - Create integration tests for room state persistence across popup sessions
  - Implement Playwright E2E tests for popup scrolling and keyboard navigation
  - Add tests for API error handling and graceful degradation scenarios
  - Create tests for video detection fallback and right-click workflow
  - _Requirements: Multiple requirements validation_

- [x] 7.2 Implement cross-browser validation testing

  - Test all runtime fixes in Chrome MV3 environment with unpacked extension
  - Verify Firefox WebExtension compatibility for all fixed components
  - Test component rendering consistency across browser versions
  - Validate extension manifest compatibility with new UI structure and permissions
  - Create automated cross-browser test suite for continuous validation
  - _Requirements: Cross-browser compatibility validation_

## Phase 6: Documentation and Deployment

- [x] 8. Implement chat sidebar with Material Design 3 styling




  - Create Material Design 3 styled chat sidebar component with card-style message bubbles
  - Implement sticky input bar with Material input field and send button at bottom
  - Add reaction emoji buttons as Material icon buttons under each message card
  - Apply consistent Material Design 3 spacing, typography, and color scheme
  - Ensure chat components follow modular card structure under /ui/components/cards/
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [x] 8.1 Implement Material Design 3 video overlays for reactions and avatars





  - Create floating Material surfaces for all overlays with translucency and elevation
  - Display avatars and reaction indicators within elevated Material containers
  - Apply consistent rounded corners (12-16px) and soft shadows to overlay elements
  - Integrate overlay components with Material Design 3 theme and color palette
  - Implement overlay animations using Material Design 3 motion principles
  - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [ ] 8.2 Update documentation and create debugging guides
  - Update README with debug steps to reproduce and verify fixes in about:debugging (Firefox) and Chrome unpacked mode
  - Create instructions on how to add API keys via Options page and how keys are stored
  - Document the right-click video detection fallback workflow for users
  - Create troubleshooting guide for common runtime issues and their solutions
  - Update API documentation with new error handling and response formats
  - _Requirements: Documentation and user guidance_

- [ ] 8.3 Create deployment validation checklist
  - Verify all icon assets load correctly in both Chrome and Firefox
  - Test room creation and state persistence across browser sessions
  - Validate API key management and error handling workflows
  - Confirm popup scrolling and accessibility features work properly
  - Test configuration import/export with preview modal functionality
  - _Requirements: Deployment readiness validation_

- [x] 8.2 Implement monitoring and error reporting





  - Add telemetry for tracking runtime bug occurrences in production
  - Implement error reporting for failed icon loads, API errors, and state persistence issues
  - Create dashboard for monitoring extension health and user experience metrics
  - Set up alerts for critical runtime failures and degraded functionality
  - Provide user feedback mechanism for reporting new issues
  - _Requirements: Production monitoring and maintenance_

## Phase 7: Core Feature Implementation

- [x] 9. Implement WebRTC voice communication system




  - Establish peer-to-peer audio connections between room participants with TURN server configuration
  - Implement mute functionality that disables audio transmission immediately
  - Support push-to-talk functionality with configurable hotkeys
  - Provide per-user volume controls for each participant with Material sliders
  - Display clear degradation message when STUN-only fails on restrictive NATs
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9.1 Implement playlist management system
  - Allow participants to add videos to shared queue with Material Design 3 interface
  - Implement automatic advancement to next queued item when current video ends
  - Support drag-and-drop reordering of playlist items with smooth animations
  - Provide voting mechanism for skipping current content with Material buttons
  - Persist playlist state across room sessions using browser storage
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9.2 Implement collaborative annotation system





  - Provide drawing tools including pen, shapes, and text overlays with Material Design
  - Timestamp annotations to current video position for synchronization
  - Synchronize all annotations across room participants in real-time
  - Display "overlay unavailable" message for cross-origin iframe restrictions
  - Provide undo/redo functionality and multiple layers with visibility controls
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9.3 Implement scheduled watch parties
  - Allow users to schedule future watch party sessions with Material date/time pickers
  - Generate calendar invites in ICS format for scheduled events
  - Send reminder notifications before scheduled sessions
  - Support recurring watch party schedules with flexible patterns
  - Integrate with Google Calendar and Outlook for event management
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 8: Performance Optimization and Final Polish

- [x] 10. Optimize asset loading and bundle size





  - Minimize icon font file sizes while maintaining quality
  - Implement lazy loading for non-critical assets
  - Optimize SVG sprites for faster fallback loading
  - Reduce bundle size through code splitting and tree shaking
  - Implement asset preloading for critical UI components
  - _Requirements: Performance optimization_

- [x] 10.1 Enhance user experience polish


  - Add smooth transitions for all Material Design 3 components
  - Implement loading states for all async operations
  - Add success/error feedback for all user actions
  - Ensure consistent spacing and typography across all interfaces
  - Implement responsive design for different popup and window sizes
  - _Requirements: UX polish and consistency_

- [x] 10.2 Final integration testing and validation


  - Run comprehensive end-to-end tests with all runtime fixes enabled
  - Test all user workflows with redesigned UI and fixed functionality
  - Verify backward compatibility with existing configurations
  - Validate extension performance with new UI components and error handling
  - Conduct user acceptance testing for all fixed issues and UX improvements
  - _Requirements: Final validation and acceptance_

## Testing Strategy

### Unit Tests
- Server endpoint response parsing and room ID generation
- API key storage, retrieval, and validation
- Configuration import/export with schema validation
- Video detection fallback mechanisms
- Error handling for all external service failures

### Integration Tests
- Room state persistence across popup sessions and browser restarts
- Icon loading with fallback mechanisms in both Chrome and Firefox
- Configuration import workflow with preview modal
- API error handling with graceful degradation
- Cross-browser compatibility for all fixed components

### End-to-End Tests (Playwright)
- Complete room creation and joining workflow
- Popup scrolling and keyboard navigation
- Video detection with right-click fallback
- Settings management with API key configuration
- Import/export configuration with validation

### Cross-Browser Tests
- Chrome MV3 compatibility for all fixes
- Firefox WebExtension compatibility validation
- Asset loading consistency across browsers
- Storage API compatibility and persistence
- Manifest permission validation

### Performance Tests
- Asset loading speed and fallback timing
- Memory usage with persistent state management
- Bundle size impact of local asset bundling
- Popup rendering performance with scrolling
- Background script efficiency with state persistence

This implementation plan addresses all critical runtime bugs identified in the requirements while maintaining the existing Material Design 3 implementation and ensuring cross-browser compatibility. Each task includes specific acceptance criteria and maps to the corresponding requirements for traceability.