# Requirements Document

## Introduction

A cross-browser watch-party extension that enables synchronized video viewing experiences across Chrome MV3 and Firefox WebExtensions. The system allows users to create rooms, synchronize video playback, communicate via voice and text chat, and collaborate with features like subtitles, annotations, and real-time interactions while maintaining privacy and reliability. This document reflects the current implementation state and includes requirements for critical runtime bug fixes and UX improvements that have been identified and need immediate resolution.

## Glossary

- **Watch_Party_Extension**: The browser extension system that enables synchronized video viewing with Material Design 3 interface
- **Signaling_Server**: Backend WebSocket server that coordinates room state and user connections
- **Room**: A virtual space where users gather to watch synchronized content with persistent state
- **Host**: The user who controls playback synchronization and room management
- **Co_Host**: Users with elevated permissions to assist with room management
- **Sync_Engine**: Component responsible for maintaining playback synchronization across participants
- **Video_Detector**: Content script component that identifies and selects video elements on web pages with fallback mechanisms
- **WebRTC_Voice**: Real-time voice communication system using WebRTC protocols
- **Subtitle_Engine**: System for managing per-user subtitle tracks with OpenSubtitles integration and graceful error handling
- **Annotation_Layer**: Collaborative drawing and markup overlay on video content
- **Feature_Flags**: Server and client-side toggles for controlling feature availability
- **Extension_Config**: Runtime configuration system for deployment settings with import/export
- **Options_Page**: Extension UI for managing configuration and settings with Material Design 3 cards
- **Material_UI**: Card-based interface system following Material Design 3 principles with proper scrolling and accessibility
- **Asset_System**: Local bundled icons, fonts, and visual assets for offline functionality without CDN dependencies
- **Storage_System**: Browser extension storage for persistent settings and room state across popup sessions
- **API_Key_Manager**: Secure storage and management system for user-provided external service API keys

## Requirements

### Requirement 1

**User Story:** As a user, I want to create and join watch party rooms so that I can watch videos synchronously with friends.

#### Acceptance Criteria

1. WHEN a user clicks create room, THE Watch_Party_Extension SHALL generate a unique room identifier and invitation link
2. WHERE a room is set to private, THE Watch_Party_Extension SHALL require password authentication for access
3. WHEN a user joins via invitation link, THE Watch_Party_Extension SHALL connect them to the specified room
4. THE Watch_Party_Extension SHALL support public rooms with discoverable short codes
5. WHEN room capacity is reached, THE Watch_Party_Extension SHALL display appropriate error messaging

### Requirement 2

**User Story:** As a host, I want to control video playback synchronization so that all participants watch content at the same time.

#### Acceptance Criteria

1. WHEN the host plays or pauses video, THE Sync_Engine SHALL ensure all clients converge to host state within ±300ms within 5 seconds
2. WHILE video is playing, THE Sync_Engine SHALL send heartbeat signals at configurable intervals (default 2 seconds)
3. IF participant playback drifts beyond configurable tolerance (default 300ms), THEN THE Sync_Engine SHALL automatically resynchronize the participant
4. WHEN a participant reconnects after disconnection, THE Sync_Engine SHALL resynchronize their playback position to current host state
5. THE Sync_Engine SHALL read all timing values from Extension_Config including heartbeat interval, drift tolerance, and convergence timeout

### Requirement 3

**User Story:** As a user, I want the extension to detect videos only when I explicitly start a room so that it doesn't interfere with normal browsing.

#### Acceptance Criteria

1. THE Video_Detector SHALL remain inactive until the user clicks "Start Room" button
2. WHEN the user clicks "Start Room", THE Video_Detector SHALL attempt video detection using MutationObserver and video events
3. IF automatic detection fails after all fallback checks, THEN THE Video_Detector SHALL prompt the user to right-click where the video should be
4. WHEN the user right-clicks, THE Video_Detector SHALL check element.children for video tags, then recursively check element.parentElement up to 3 levels
5. IF no video is found after right-click detection, THEN THE Video_Detector SHALL display error message "Video capturing failed"

### Requirement 4

**User Story:** As a participant, I want voice communication during watch parties so that I can discuss content in real-time.

#### Acceptance Criteria

1. THE WebRTC_Voice SHALL establish peer-to-peer audio connections between room participants with TURN server configuration required
2. WHEN a user clicks mute, THE WebRTC_Voice SHALL disable their audio transmission immediately
3. THE WebRTC_Voice SHALL support push-to-talk functionality with configurable hotkeys
4. THE WebRTC_Voice SHALL provide per-user volume controls for each participant
5. WHERE STUN-only fails on restrictive NATs, THE WebRTC_Voice SHALL require TURN server fallback or display clear degradation message

### Requirement 5

**User Story:** As a user, I want text chat and reactions so that I can communicate without disrupting audio.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL provide real-time text messaging within rooms
2. WHEN a user sends a reaction, THE Watch_Party_Extension SHALL display it as a timestamped overlay on video
3. THE Watch_Party_Extension SHALL synchronize reaction overlays to video timeline across all participants
4. THE Watch_Party_Extension SHALL store chat messages with timestamps for session history
5. THE Watch_Party_Extension SHALL support emoji reactions and custom reaction sets

### Requirement 6

**User Story:** As a user, I want personalized subtitles so that I can watch content in my preferred language.

#### Acceptance Criteria

1. THE Subtitle_Engine SHALL support multiple simultaneous subtitle tracks per user with size limits and file-type validation
2. WHEN subtitles are unavailable, THE Subtitle_Engine SHALL query OpenSubtitles API if key is configured, otherwise provide graceful fallback
3. THE Subtitle_Engine SHALL sanitize SRT/VTT content and enforce maximum file size limits for security
4. WHERE users select different languages, THE Subtitle_Engine SHALL display appropriate tracks independently
5. THE Subtitle_Engine SHALL persist subtitle preferences per user across sessions

### Requirement 7

**User Story:** As a host, I want room management controls so that I can maintain order and delegate responsibilities.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL allow host to transfer control to another participant
2. WHEN host assigns co-host role, THE Watch_Party_Extension SHALL grant elevated permissions to that user
3. THE Watch_Party_Extension SHALL provide mute and kick functionality for disruptive participants
4. THE Watch_Party_Extension SHALL support room locking to prevent new participants from joining
5. THE Watch_Party_Extension SHALL maintain audit logs of all moderation actions

### Requirement 8

**User Story:** As a user, I want playlist management so that we can queue multiple videos for continuous watching.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL allow participants to add videos to a shared queue
2. WHEN current video ends, THE Watch_Party_Extension SHALL automatically advance to next queued item
3. THE Watch_Party_Extension SHALL support drag-and-drop reordering of playlist items
4. THE Watch_Party_Extension SHALL provide voting mechanism for skipping current content
5. THE Watch_Party_Extension SHALL persist playlist state across room sessions

### Requirement 9

**User Story:** As a user, I want collaborative annotations so that we can mark up and discuss specific video moments.

#### Acceptance Criteria

1. THE Annotation_Layer SHALL provide drawing tools including pen, shapes, and text overlays
2. WHEN a user creates an annotation, THE Annotation_Layer SHALL timestamp it to current video position
3. THE Annotation_Layer SHALL synchronize all annotations across room participants in real-time
4. IF cross-origin iframes prevent overlay injection, THEN THE Annotation_Layer SHALL display "overlay unavailable" message with same-frame guidance
5. THE Annotation_Layer SHALL provide undo/redo functionality and multiple layers with individual visibility controls

### Requirement 10

**User Story:** As a user, I want scheduled watch parties so that I can plan viewing sessions in advance.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL allow users to schedule future watch party sessions
2. WHEN creating scheduled events, THE Watch_Party_Extension SHALL generate calendar invites in ICS format
3. THE Watch_Party_Extension SHALL send reminder notifications before scheduled sessions
4. THE Watch_Party_Extension SHALL support recurring watch party schedules
5. THE Watch_Party_Extension SHALL integrate with Google Calendar and Outlook for event management

### Requirement 11

**User Story:** As an administrator, I want configurable deployment settings so that I can customize the extension without code changes.

#### Acceptance Criteria

1. THE Extension_Config SHALL read default settings from extension-config.json at startup
2. THE Options_Page SHALL allow runtime editing of all configuration parameters
3. WHEN configuration is imported, THE Options_Page SHALL support ENV, INI, and JSON formats
4. THE Extension_Config SHALL persist all settings to chrome.storage.local for persistence
5. THE Options_Page SHALL provide export functionality for current configuration state

### Requirement 12

**User Story:** As a developer, I want feature flags so that I can control feature rollouts and testing.

#### Acceptance Criteria

1. THE Feature_Flags SHALL support both server-side and client-side toggle controls
2. WHEN feature flags change, THE Watch_Party_Extension SHALL update behavior without restart
3. THE Feature_Flags SHALL support percentage-based rollouts for gradual feature deployment
4. THE Feature_Flags SHALL provide override capability for testing and development environments
5. THE Feature_Flags SHALL log all flag state changes for audit purposes

### Requirement 13

**User Story:** As a user, I want reliable reconnection so that temporary network issues don't disrupt my watch party experience.

#### Acceptance Criteria

1. WHEN connection is lost, THE Watch_Party_Extension SHALL attempt automatic reconnection at configurable intervals (default 5 seconds)
2. THE Signaling_Server SHALL maintain room state during participant disconnections up to configurable TTL (default 5 minutes)
3. WHEN reconnection succeeds within TTL, THE Sync_Engine SHALL resynchronize participant to current playback position
4. IF disconnection exceeds TTL, THEN THE Watch_Party_Extension SHALL redirect user to waiting room or require manual rejoin based on configuration
5. THE Watch_Party_Extension SHALL display connection status indicators and provide manual reconnect controls

### Requirement 14

**User Story:** As a user, I want accessibility features to be available when needed without cluttering the main interface.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL hide accessibility options by default in the main UI
2. THE Watch_Party_Extension SHALL provide a dedicated settings menu or toggle to reveal accessibility options
3. WHEN accessibility mode is enabled, THE Watch_Party_Extension SHALL support full keyboard navigation for all interface elements
4. THE Watch_Party_Extension SHALL provide ARIA labels and descriptions for screen readers when accessibility mode is active
5. THE Watch_Party_Extension SHALL offer customizable caption styling including font size and colors through the accessibility settings

### Requirement 15

**User Story:** As a user, I want privacy controls so that my data and communications remain secure.

#### Acceptance Criteria

1. WHERE OAuth is enabled, THE Watch_Party_Extension SHALL support secure authentication flows
2. THE Watch_Party_Extension SHALL provide end-to-end encryption options for chat communications
3. WHEN recording is enabled, THE Watch_Party_Extension SHALL require explicit user consent and display retention policy from configuration
4. THE Watch_Party_Extension SHALL justify each manifest permission with one-line explanations in documentation
5. THE Watch_Party_Extension SHALL support anonymous participation modes where configured

### Requirement 16

**User Story:** As a developer, I want comprehensive logging and telemetry so that I can monitor system performance and debug issues.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL generate structured JSONL logs containing event, timestamp, anonymized_user_id, room_id, and drift_ms
2. THE Watch_Party_Extension SHALL make telemetry opt-out by default unless explicitly configured as opt-in
3. THE Watch_Party_Extension SHALL log all sync events, connection state changes, and error conditions
4. THE Watch_Party_Extension SHALL provide configurable log levels and retention policies
5. THE Watch_Party_Extension SHALL anonymize all personally identifiable information in logs

### Requirement 17

**User Story:** As a developer, I want deterministic test scenarios so that I can verify synchronization behavior reliably.

#### Acceptance Criteria

1. WHEN host seeks to specific timestamp, THE Sync_Engine SHALL ensure all clients converge within ±300ms within 5 seconds
2. THE Sync_Engine SHALL handle simulated drift scenarios of 200ms and 600ms with appropriate corrective behavior
3. THE Video_Detector SHALL pass property-based tests for detection heuristics across various DOM configurations
4. THE Watch_Party_Extension SHALL provide test scenarios for prolonged disconnections exceeding configured TTL
5. THE Sync_Engine SHALL demonstrate consistent behavior across multiple reconnection and resync cycles

### Requirement 18

**User Story:** As a user, I want reliable signaling server connectivity so that I can successfully create and join rooms.

#### Acceptance Criteria

1. THE Signaling_Server SHALL establish WebSocket connections successfully on both Chrome and Firefox
2. WHEN connection fails, THE Watch_Party_Extension SHALL display clear error messages with troubleshooting guidance
3. THE Watch_Party_Extension SHALL implement proper connection retry logic with exponential backoff
4. THE Signaling_Server SHALL respond to ping/pong messages to maintain connection health
5. THE Watch_Party_Extension SHALL validate server responses and handle malformed messages gracefully

### Requirement 19

**User Story:** As a user, I want popup buttons to work correctly so that I can interact with the extension effectively.

#### Acceptance Criteria

1. WHEN the user clicks "Start Room", THE Watch_Party_Extension SHALL trigger room creation logic immediately
2. THE Watch_Party_Extension SHALL provide visual feedback for all button interactions (loading states, success/error indicators)
3. WHEN popup buttons are clicked, THE Watch_Party_Extension SHALL execute the corresponding background script functions
4. THE Watch_Party_Extension SHALL handle button click errors gracefully and display appropriate error messages
5. THE Watch_Party_Extension SHALL ensure popup remains responsive during all operations

### Requirement 20

**User Story:** As a user, I want a modern Material Design 3 interface with card-based layout so that the extension is visually appealing, consistent, and easy to use.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL implement Material Design 3 (MD3) components with elevation-based shadows, rounded corners (12-16px), and soft transitions
2. THE Watch_Party_Extension SHALL use a responsive grid layout that adapts cleanly to different window sizes with primary font Roboto or Inter
3. THE Watch_Party_Extension SHALL organize all UI elements within Material cards using consistent spacing (8/16/24 dp) and subtle motion animations on hover/click
4. THE Watch_Party_Extension SHALL apply the Material Design 3 color palette with Primary (#6200EE), Secondary (#03DAC6), Surface (#FFFFFF light / #121212 dark), and Error (#B00020)
5. THE Watch_Party_Extension SHALL ensure all components are modular under /ui/components/cards/ and follow accessibility standards with ARIA labels and keyboard focus

### Requirement 21

**User Story:** As a user, I want comprehensive visual assets and icons so that the extension has a professional and cohesive appearance.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL include a complete set of visual assets organized under /assets/ directory structure
2. THE Watch_Party_Extension SHALL provide extension logos that are adaptable to both light and dark themes
3. THE Watch_Party_Extension SHALL include toolbar and popup icons for all core functions (watch, play, pause, chat, mic, room, settings)
4. THE Watch_Party_Extension SHALL support reaction icons for all standard emotions (heart, laugh, surprise, sad, thumbs up, thumbs down)
5. THE Watch_Party_Extension SHALL provide avatar placeholders in 6-8 different colors with rounded design

### Requirement 22

**User Story:** As a user, I want animated visual feedback so that the interface feels responsive and engaging.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL include simple looping GIF animations for avatar actions (wave, laugh, idle)
2. THE Watch_Party_Extension SHALL provide loading spinner animations for all async operations
3. THE Watch_Party_Extension SHALL include background blur overlay effects for modal dialogs and popups
4. THE Watch_Party_Extension SHALL optimize all animations for small file size and high DPI displays
5. THE Watch_Party_Extension SHALL ensure animations work consistently across Chrome and Firefox

### Requirement 23

**User Story:** As a developer, I want icon font integration so that UI elements are scalable and consistent.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL integrate Font Awesome or equivalent icon font bundled locally
2. THE Watch_Party_Extension SHALL use icon fonts for buttons, UI actions, and sidebar menu items
3. THE Watch_Party_Extension SHALL ensure icon font works offline without CDN dependencies
4. THE Watch_Party_Extension SHALL maintain Firefox compliance for all icon font implementations
5. THE Watch_Party_Extension SHALL provide fallback mechanisms when icon fonts fail to load

### Requirement 24

**User Story:** As a user, I want visually accessible assets so that the extension works well in different viewing conditions.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL ensure all assets maintain proper contrast ratios for both light and dark themes
2. THE Watch_Party_Extension SHALL optimize all visual assets for high DPI displays and small sizes
3. THE Watch_Party_Extension SHALL use only MIT, Apache 2.0, or CC0 licensed assets
4. THE Watch_Party_Extension SHALL follow Material 3 or Fluent Design principles with soft shadows and rounded corners (12-16px radius)
5. THE Watch_Party_Extension SHALL reference all assets using relative paths for offline functionality

### Requirement 25

**User Story:** As a user, I want a redesigned popup UI with Material Design 3 card layout so that I can easily access core functionality in a clean, modern interface.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL replace the old popup with a clean Material card containing header (extension name + logo), main card (Start Room, Join Room options), and secondary card (Settings & Preferences collapsed by default)
2. THE Watch_Party_Extension SHALL provide a footer with connection status and compact action buttons (Chat, Mute, Settings) using Material Design 3 styling
3. THE Watch_Party_Extension SHALL implement all popup components as modular cards under /ui/components/cards/ with proper elevation and rounded corners
4. THE Watch_Party_Extension SHALL ensure the popup uses responsive grid layout that adapts to different window sizes while maintaining Material Design 3 spacing principles
5. THE Watch_Party_Extension SHALL apply consistent Material Design 3 typography, colors, and interactive states throughout the popup interface

### Requirement 26

**User Story:** As a user, I want a redesigned options page with tabbed Material layout so that I can easily configure settings in an organized, modern interface.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL implement a tabbed Material layout with General Settings, Accessibility, Appearance, and About sections
2. THE Watch_Party_Extension SHALL enclose each settings section in its own Material card with labeled switches, sliders, and dropdowns following Material Design 3 principles
3. THE Watch_Party_Extension SHALL hide Accessibility options under "Advanced" by default and provide toggle controls for high contrast, captions, and voice controls
4. THE Watch_Party_Extension SHALL include an Appearance tab with light/dark theme switch and accent color picker using Material Design 3 components
5. THE Watch_Party_Extension SHALL organize the About section with version info and changelog link within a Material card layout

### Requirement 27

**User Story:** As a user, I want a redesigned chat sidebar with Material Design 3 styling so that messaging feels modern and integrated with the overall interface.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL implement card-style message bubbles with soft elevation and rounded corners following Material Design 3 principles
2. THE Watch_Party_Extension SHALL provide a sticky input bar with Material-style input field and send button at the bottom of the chat sidebar
3. THE Watch_Party_Extension SHALL integrate reaction emojis as small Material icon buttons under each message card
4. THE Watch_Party_Extension SHALL apply consistent Material Design 3 spacing, typography, and color scheme throughout the chat interface
5. THE Watch_Party_Extension SHALL ensure chat components follow the modular card structure under /ui/components/cards/

### Requirement 28

**User Story:** As a user, I want Material Design 3 styled overlays for video reactions and avatars so that all interface elements feel cohesive and modern.

#### Acceptance Criteria

1. THE Watch_Party_Extension SHALL use floating Material surfaces for all overlays with slight translucency and proper elevation
2. THE Watch_Party_Extension SHALL display avatars and reaction indicators within elevated Material containers following Design 3 principles
3. THE Watch_Party_Extension SHALL apply consistent rounded corners (12-16px) and soft shadows to all overlay elements
4. THE Watch_Party_Extension SHALL ensure overlay components integrate seamlessly with the overall Material Design 3 theme and color palette
5. THE Watch_Party_Extension SHALL implement overlay animations using Material Design 3 motion principles with smooth transitions

### Requirement 29 - RUNTIME FIX: Icon Loading

**User Story:** As a user, I want all icons to load properly in both Chrome and Firefox so that the interface is visually complete and functional.

#### Acceptance Criteria

1. THE Asset_System SHALL bundle icon fonts locally without CDN dependencies for offline functionality
2. WHEN icons fail to load, THE Asset_System SHALL provide SVG sprite fallbacks automatically
3. THE Watch_Party_Extension SHALL update manifest permissions to include local font loading for both Chrome MV3 and Firefox
4. THE Asset_System SHALL validate that all icon paths exist during build process
5. THE Watch_Party_Extension SHALL render icons consistently in popup, options, and overlay interfaces across both browsers

### Requirement 30 - RUNTIME FIX: Asset Quality

**User Story:** As a developer, I want high-quality, properly licensed visual assets so that the extension has a professional appearance and avoids legal issues.

#### Acceptance Criteria

1. THE Asset_System SHALL replace all generated placeholder assets with sourced Material Symbols or FontAwesome icons under MIT/Apache 2.0/CC0 licenses
2. THE Asset_System SHALL provide vector assets that match Material Design 3 theme with optimized SVG and 2x retina PNG variants
3. THE Asset_System SHALL populate assets folder with at least 20 professional icons for core functionality
4. THE Asset_System SHALL reference all assets using relative paths for offline functionality
5. THE Asset_System SHALL maintain proper contrast ratios for both light and dark themes

### Requirement 31 - RUNTIME FIX: Popup Scrolling

**User Story:** As a user, I want the popup to scroll properly when content overflows so that I can access all functionality.

#### Acceptance Criteria

1. THE Material_UI SHALL maintain current popup dimensions without size changes
2. THE Material_UI SHALL add CSS overflow-y:auto to the scroll container for vertical scrolling
3. THE Material_UI SHALL ensure keyboard focus remains accessible during scrolling operations
4. THE Material_UI SHALL provide smooth scrolling behavior on Firefox with proper CSS properties
5. THE Material_UI SHALL validate scrolling functionality through both manual and automated Playwright tests

### Requirement 32 - RUNTIME FIX: Room ID Generation

**User Story:** As a user, I want to see a valid room ID when creating rooms so that I can share the room with others.

#### Acceptance Criteria

1. THE Signaling_Server SHALL return a properly formatted response containing roomId field
2. WHEN room creation fails, THE Watch_Party_Extension SHALL debug server response and fix API parsing logic
3. THE Watch_Party_Extension SHALL display non-empty roomId in the interface immediately after creation
4. THE Watch_Party_Extension SHALL provide functional copy and share actions for the generated roomId
5. THE Watch_Party_Extension SHALL include unit tests for server endpoint and integration tests for room creation workflow

### Requirement 33 - RUNTIME FIX: Room State Persistence

**User Story:** As a user, I want my active room state to persist when I close and reopen the popup so that I don't lose my session.

#### Acceptance Criteria

1. THE Storage_System SHALL persist active room state to browser.storage.local instead of popup memory
2. THE Watch_Party_Extension SHALL store room state in background script for persistence across popup sessions
3. WHEN popup reopens, THE Watch_Party_Extension SHALL read active room state and render appropriate controls
4. THE Watch_Party_Extension SHALL display active room UI with Play, Leave, and Copy Link buttons when room is active
5. THE Watch_Party_Extension SHALL maintain room state persistence through browser restart cycles

### Requirement 34 - RUNTIME FIX: Subtitle Engine Error Handling

**User Story:** As a user, I want graceful error handling when subtitle features fail so that the extension doesn't crash.

#### Acceptance Criteria

1. WHEN OpenSubtitles API key is missing, THE Subtitle_Engine SHALL display clear "API key missing" message instead of crashing
2. THE Subtitle_Engine SHALL provide call-to-action directing users to settings page for API key configuration
3. THE Subtitle_Engine SHALL handle all subtitle-related errors without throwing uncaught exceptions
4. THE Watch_Party_Extension SHALL include test scenarios for stubbed failure paths in subtitle functionality
5. THE Subtitle_Engine SHALL continue operating with local subtitle files when external API fails

### Requirement 35 - RUNTIME FIX: User API Key Management

**User Story:** As a user, I want to add and manage my own API keys through the settings interface so that I can use external services.

#### Acceptance Criteria

1. THE Options_Page SHALL provide input fields for OpenSubtitles and other external service API keys
2. THE Storage_System SHALL store API keys securely in browser.storage.local with encryption when possible
3. THE Watch_Party_Extension SHALL remove all hardcoded API keys from the codebase for security
4. THE Watch_Party_Extension SHALL read API keys from storage for server and client operations
5. THE Watch_Party_Extension SHALL include tests to verify API key persistence and retrieval functionality

### Requirement 36 - RUNTIME FIX: Import UX Enhancement

**User Story:** As a user, I want to preview and validate configuration imports so that I understand what changes will be made.

#### Acceptance Criteria

1. WHEN importing configuration, THE Options_Page SHALL load file and show diff/preview modal before applying changes
2. THE Options_Page SHALL validate configuration schema and sanitize input data before processing
3. THE Options_Page SHALL require user confirmation after showing preview before saving to storage
4. WHEN invalid configuration is detected, THE Options_Page SHALL reject import with explanatory error message
5. THE Watch_Party_Extension SHALL include import tests that validate schema and modal workflow functionality

### Requirement 37 - RUNTIME FIX: Video Detection Workflow

**User Story:** As a user, I want video detection to only activate when I'm ready to start a room so that it doesn't interfere with normal browsing.

#### Acceptance Criteria

1. THE Video_Detector SHALL remain completely inactive until user clicks "Start Room" button
2. WHEN auto-detection fails, THE Video_Detector SHALL prompt user to right-click the target video area
3. THE Video_Detector SHALL check element.children for video tags, then traverse element.parentElement up to 3 levels
4. WHEN video is found via right-click, THE Video_Detector SHALL attach to that video element
5. WHEN no video is found after all attempts, THE Video_Detector SHALL display "Video capturing failed" message with retry options

### Requirement 38 - RUNTIME FIX: Accessibility Integration

**User Story:** As a user, I want accessibility options to be available when needed without cluttering the main interface.

#### Acceptance Criteria

1. THE Options_Page SHALL move accessibility controls into a collapsible "Accessibility" card in Settings
2. THE Material_UI SHALL keep accessibility options collapsed by default to reduce interface clutter
3. THE Options_Page SHALL ensure all accessibility controls are keyboard navigable and ARIA compliant
4. THE Watch_Party_Extension SHALL provide clear visual indicators when accessibility mode is active
5. THE Watch_Party_Extension SHALL maintain full functionality without accessibility mode enabled

### Requirement 39 - RUNTIME FIX: Material Design Implementation

**User Story:** As a user, I want a modern, cohesive Material Design 3 interface so that the extension feels professional and easy to use.

#### Acceptance Criteria

1. THE Material_UI SHALL implement Material Design 3 card-based layout with defined color palette and consistent spacing
2. THE Material_UI SHALL replace current layout with tidy card components using elevation-based shadows and rounded corners
3. THE Material_UI SHALL apply Material Design 3 color system with Primary (#6200EE), Secondary (#03DAC6), Surface, and Error colors
4. THE Material_UI SHALL use consistent 8/16/24 dp spacing throughout all interface components
5. THE Material_UI SHALL include CSS variables for theme customization and ensure components are modular under /ui/components/cards/

### Requirement 40 - RUNTIME FIX: Cross-Browser Asset Loading

**User Story:** As a user, I want all visual elements to load properly in both Chrome and Firefox so that the extension has a consistent appearance.

#### Acceptance Criteria

1. THE Asset_System SHALL bundle all icon fonts locally without external CDN dependencies
2. THE Asset_System SHALL provide SVG sprite fallbacks when icon fonts fail to load
3. THE Watch_Party_Extension SHALL update manifest permissions to support local font loading in both Chrome MV3 and Firefox
4. THE Asset_System SHALL validate all asset paths during build process to prevent missing resources
5. THE Watch_Party_Extension SHALL render icons consistently across popup, options, and overlay interfaces in both browsers

### Requirement 41 - RUNTIME FIX: Server Response Parsing

**User Story:** As a user, I want to receive valid room IDs when creating rooms so that I can successfully share room links.

#### Acceptance Criteria

1. THE Signaling_Server SHALL return properly formatted JSON responses with roomId field for room creation requests
2. THE Watch_Party_Extension SHALL parse server responses correctly and handle malformed responses gracefully
3. THE Watch_Party_Extension SHALL display non-empty, valid room IDs in the interface immediately after successful creation
4. THE Watch_Party_Extension SHALL provide functional copy and share actions for generated room IDs
5. THE Watch_Party_Extension SHALL include comprehensive error handling for room creation failures with user-friendly messages

### Requirement 42 - RUNTIME FIX: Persistent State Management

**User Story:** As a user, I want my active room state to persist when I close and reopen the popup so that I don't lose my session.

#### Acceptance Criteria

1. THE Storage_System SHALL persist active room state to browser.storage.local instead of volatile popup memory
2. THE Watch_Party_Extension SHALL store room state in background script for persistence across popup close/open cycles
3. WHEN popup reopens, THE Watch_Party_Extension SHALL read persisted room state and render appropriate active room controls
4. THE Watch_Party_Extension SHALL display active room UI with Play, Leave, and Copy Link buttons when room is active
5. THE Storage_System SHALL maintain room state persistence through browser restart and extension reload cycles

### Requirement 43 - RUNTIME FIX: API Error Handling

**User Story:** As a user, I want graceful error handling when external services fail so that the extension continues to work.

#### Acceptance Criteria

1. WHEN OpenSubtitles API key is missing, THE Subtitle_Engine SHALL display clear "API key missing" message with settings link
2. THE Subtitle_Engine SHALL provide actionable call-to-action directing users to options page for API key configuration
3. THE Subtitle_Engine SHALL handle all external API errors without throwing uncaught exceptions that crash the extension
4. THE Watch_Party_Extension SHALL continue operating with local subtitle files when external APIs are unavailable
5. THE Subtitle_Engine SHALL include comprehensive test coverage for all error scenarios and fallback paths

### Requirement 44 - RUNTIME FIX: User-Managed API Keys

**User Story:** As a user, I want to securely manage my own API keys through the settings interface so that I can use external services.

#### Acceptance Criteria

1. THE Options_Page SHALL provide secure input fields for OpenSubtitles and other external service API keys
2. THE API_Key_Manager SHALL store API keys securely in browser.storage.local with encryption when possible
3. THE Watch_Party_Extension SHALL remove all hardcoded API keys from the codebase for security compliance
4. THE API_Key_Manager SHALL provide API key validation and testing functionality before saving
5. THE Watch_Party_Extension SHALL include comprehensive tests for API key persistence, retrieval, and security

### Requirement 45 - RUNTIME FIX: Configuration Import UX

**User Story:** As a user, I want to preview and validate configuration imports so that I understand what changes will be made.

#### Acceptance Criteria

1. WHEN importing configuration, THE Options_Page SHALL display a diff/preview modal showing all proposed changes
2. THE Options_Page SHALL validate configuration schema and sanitize input data before processing
3. THE Options_Page SHALL require explicit user confirmation after showing preview before applying changes
4. WHEN invalid configuration is detected, THE Options_Page SHALL reject import with detailed explanatory error messages
5. THE Watch_Party_Extension SHALL include comprehensive import tests validating schema, modal workflow, and error handling

### Requirement 46 - RUNTIME FIX: On-Demand Video Detection

**User Story:** As a user, I want video detection to only activate when I'm ready to start a room so that it doesn't interfere with normal browsing.

#### Acceptance Criteria

1. THE Video_Detector SHALL remain completely inactive until user explicitly clicks "Start Room" button
2. WHEN auto-detection fails, THE Video_Detector SHALL prompt user to right-click the target video area
3. THE Video_Detector SHALL check element.children for video tags, then traverse element.parentElement up to 3 levels
4. WHEN video is found via right-click, THE Video_Detector SHALL attach to that video element and provide success feedback
5. WHEN no video is found after all detection attempts, THE Video_Detector SHALL display "Video capturing failed" message with retry options