/**
 * Fallback UI Manager
 * Manages fallback HTML-based interfaces when React components fail to load
 * Requirements: 4.1, 4.3, 4.5
 */

import { browserAPI } from './browser-api';
import { getDiagnosticLogger } from './diagnostic-logger';
import { fallbackSettingsManager, FallbackSettings } from './fallback-settings-manager';
import { troubleshootingManager } from './troubleshooting-manager';

export interface FallbackUIConfig {
  enableBasicPopup: boolean;
  enableBasicOptions: boolean;
  enableTroubleshooting: boolean;
  timeoutMs: number;
}

export interface RoomInfo {
  id: string | null;
  name: string | null;
  role: 'host' | 'co-host' | 'participant' | null;
  participantCount: number;
  isActive: boolean;
}

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnected?: number;
  errorMessage?: string;
}

export class FallbackUIManager {
  private static instance: FallbackUIManager;
  private diagnosticLogger = getDiagnosticLogger();
  private config: FallbackUIConfig;
  private isActive = false;
  private currentPage: 'popup' | 'options' | null = null;

  private constructor() {
    this.config = {
      enableBasicPopup: true,
      enableBasicOptions: true,
      enableTroubleshooting: true,
      timeoutMs: 5000,
    };
  }

  public static getInstance(): FallbackUIManager {
    if (!FallbackUIManager.instance) {
      FallbackUIManager.instance = new FallbackUIManager();
    }
    return FallbackUIManager.instance;
  }

  /**
   * Initialize fallback UI detection and setup
   */
  public async initialize(page: 'popup' | 'options'): Promise<void> {
    this.currentPage = page;

    // Set up React failure detection
    this.setupReactFailureDetection();

    // Set up timeout detection
    this.setupTimeoutDetection();

    // Log initialization
    this.diagnosticLogger.logComponentError(
      'FallbackUIManager',
      new Error(`Initialized for ${page} page`)
    );
  }

  /**
   * Activate fallback UI for popup
   */
  public async activatePopupFallback(reason: string): Promise<void> {
    if (!this.config.enableBasicPopup || this.isActive) return;

    this.isActive = true;
    this.diagnosticLogger.logComponentError('PopupFallback', new Error(`Activated: ${reason}`));

    try {
      // Hide React root and loading elements
      this.hideReactElements();

      // Create and show fallback popup UI
      await this.renderBasicPopup();

      // Set up event listeners
      this.setupPopupEventListeners();

      console.log('Fallback popup UI activated');
    } catch (error) {
      console.error('Failed to activate popup fallback:', error);
      this.showCriticalError('Failed to load fallback interface');
    }
  }

  /**
   * Activate fallback UI for options page
   */
  public async activateOptionsFallback(reason: string): Promise<void> {
    if (!this.config.enableBasicOptions || this.isActive) return;

    this.isActive = true;
    this.diagnosticLogger.logComponentError('OptionsFallback', new Error(`Activated: ${reason}`));

    try {
      // Hide React root and loading elements
      this.hideReactElements();

      // Create and show fallback options UI
      await this.renderBasicOptions();

      // Set up event listeners
      this.setupOptionsEventListeners();

      console.log('Fallback options UI activated');
    } catch (error) {
      console.error('Failed to activate options fallback:', error);
      this.showCriticalError('Failed to load fallback interface');
    }
  }

  /**
   * Render basic HTML-based popup interface
   */
  private async renderBasicPopup(): Promise<void> {
    const container = document.getElementById('root') || document.body;

    // Get current connection status and room info
    const connectionStatus = await this.getConnectionStatus();
    const roomInfo = await this.getRoomInfo();

    const fallbackHTML = `
      <div id="fallback-popup" class="fallback-container">
        <!-- Header -->
        <div class="fallback-header">
          <h1>Watch Party</h1>
          <div class="fallback-status ${connectionStatus.status}">
            <span class="status-indicator"></span>
            <span class="status-text">${this.getStatusText(connectionStatus)}</span>
          </div>
        </div>

        <!-- Main Content -->
        <div class="fallback-content">
          ${roomInfo.isActive ? this.renderRoomView(roomInfo) : this.renderMainMenu()}
        </div>

        <!-- Footer -->
        <div class="fallback-footer">
          <button id="fallback-refresh" class="btn btn-secondary btn-small">
            Refresh Extension
          </button>
          <button id="fallback-troubleshoot" class="btn btn-secondary btn-small">
            Troubleshoot
          </button>
        </div>
      </div>
    `;

    container.innerHTML = fallbackHTML;

    // Add fallback styles
    this.addFallbackStyles();
  }

  /**
   * Render basic HTML-based options interface
   */
  private async renderBasicOptions(): Promise<void> {
    const container = document.getElementById('options-root') || document.body;

    const fallbackHTML = `
      <div id="fallback-options" class="fallback-container">
        <!-- Header -->
        <div class="fallback-header">
          <h1>Watch Party Settings</h1>
          <p>Basic settings interface - some features may be limited</p>
        </div>

        <!-- Settings Form -->
        <div class="fallback-content">
          <form id="fallback-settings-form">
            <!-- Server Settings -->
            <div class="settings-section">
              <h3>Server Configuration</h3>
              <div class="form-group">
                <label for="signaling-server">Signaling Server URL:</label>
                <input type="url" id="signaling-server" name="signalingServer" 
                       placeholder="wss://api.watchparty.example.com">
                <small class="help-text">WebSocket URL for the signaling server</small>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="local-dev-mode" name="localDevMode">
                  Local Development Mode
                </label>
                <small class="help-text">Use lightweight local relay server</small>
              </div>
            </div>

            <!-- Synchronization Settings -->
            <div class="settings-section">
              <h3>Synchronization</h3>
              <div class="form-group">
                <label for="sync-tolerance">Sync Tolerance (ms):</label>
                <input type="number" id="sync-tolerance" name="syncToleranceMs" 
                       min="50" max="2000" step="50" placeholder="250">
                <small class="help-text">Maximum allowed drift before sync correction</small>
              </div>
              <div class="form-group">
                <label for="heartbeat-interval">Heartbeat Interval (ms):</label>
                <input type="number" id="heartbeat-interval" name="heartbeatIntervalMs" 
                       min="500" max="10000" step="500" placeholder="2000">
                <small class="help-text">Frequency of sync heartbeat messages</small>
              </div>
            </div>

            <!-- Basic Features -->
            <div class="settings-section">
              <h3>Features</h3>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="voice-chat" name="voiceChat">
                  Voice Chat
                </label>
                <small class="help-text">Enable WebRTC voice communication</small>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="annotations" name="annotations">
                  Annotations
                </label>
                <small class="help-text">Enable drawing and markup tools</small>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="subtitles" name="subtitles">
                  Subtitles
                </label>
                <small class="help-text">Enable subtitle loading and OpenSubtitles</small>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="telemetry" name="telemetryEnabled">
                  Anonymous Telemetry
                </label>
                <small class="help-text">Send usage data to help improve the extension</small>
              </div>
            </div>

            <!-- Accessibility Settings -->
            <div class="settings-section">
              <h3>Accessibility</h3>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="high-contrast" name="highContrastMode">
                  High Contrast Mode
                </label>
                <small class="help-text">Enable high contrast colors</small>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="reduced-motion" name="reducedMotion">
                  Reduce Motion
                </label>
                <small class="help-text">Minimize animations and transitions</small>
              </div>
              <div class="form-group">
                <label for="font-size">Font Size:</label>
                <select id="font-size" name="fontSize">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="extra-large">Extra Large</option>
                </select>
                <small class="help-text">Adjust text size throughout the interface</small>
              </div>
            </div>

            <!-- Import/Export -->
            <div class="settings-section">
              <h3>Import/Export</h3>
              <div class="form-group">
                <label for="export-format">Format:</label>
                <select id="export-format">
                  <option value="json">JSON</option>
                  <option value="env">Environment Variables</option>
                  <option value="ini">INI File</option>
                </select>
              </div>
              <div class="form-actions">
                <button type="button" id="fallback-export" class="btn btn-secondary btn-small">
                  Export Settings
                </button>
                <button type="button" id="fallback-import-file" class="btn btn-secondary btn-small">
                  Import from File
                </button>
                <input type="file" id="import-file-input" accept=".json,.env,.ini,.txt" style="display: none;">
              </div>
            </div>

            <!-- Actions -->
            <div class="settings-actions">
              <button type="button" id="fallback-save" class="btn btn-primary">
                Save Settings
              </button>
              <button type="button" id="fallback-reset" class="btn btn-secondary">
                Reset to Defaults
              </button>
              <button type="button" id="fallback-refresh-options" class="btn btn-secondary">
                Refresh Page
              </button>
            </div>
          </form>
        </div>

        <!-- Troubleshooting -->
        <div class="fallback-troubleshooting">
          <h3>Troubleshooting</h3>
          <p>If you're seeing this interface, the main settings page failed to load.</p>
          <div class="troubleshooting-actions">
            <button id="fallback-show-troubleshooting" class="btn btn-secondary btn-small">
              Show Troubleshooting Guide
            </button>
            <button id="fallback-export-diagnostics" class="btn btn-secondary btn-small">
              Export Diagnostics
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = fallbackHTML;

    // Load current settings
    await this.loadBasicSettings();

    // Add fallback styles
    this.addFallbackStyles();
  }

  /**
   * Render main menu for popup
   */
  private renderMainMenu(): string {
    return `
      <div class="main-menu">
        <div class="menu-actions">
          <button id="fallback-create-room" class="btn btn-primary btn-full">
            Create Room
          </button>
          <button id="fallback-join-room" class="btn btn-primary btn-full">
            Join Room
          </button>
          <button id="fallback-open-options" class="btn btn-secondary btn-full">
            Settings
          </button>
        </div>

        <!-- Create Room Form (hidden initially) -->
        <div id="fallback-create-form" class="room-form" style="display: none;">
          <h3>Create New Room</h3>
          <div class="form-group">
            <label for="room-name">Room Name (optional):</label>
            <input type="text" id="room-name" placeholder="My Watch Party">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="room-public">
              Make room public
            </label>
          </div>
          <div class="form-actions">
            <button id="cancel-create" class="btn btn-secondary">Cancel</button>
            <button id="confirm-create" class="btn btn-primary">Create</button>
          </div>
        </div>

        <!-- Join Room Form (hidden initially) -->
        <div id="fallback-join-form" class="room-form" style="display: none;">
          <h3>Join Room</h3>
          <div class="form-group">
            <label for="room-id">Room ID or Link:</label>
            <input type="text" id="room-id" placeholder="Enter room ID or paste link" required>
          </div>
          <div class="form-group">
            <label for="room-password">Password (if required):</label>
            <input type="password" id="room-password" placeholder="Enter password">
          </div>
          <div class="form-actions">
            <button id="cancel-join" class="btn btn-secondary">Cancel</button>
            <button id="confirm-join" class="btn btn-primary">Join</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render room view for popup
   */
  private renderRoomView(roomInfo: RoomInfo): string {
    return `
      <div class="room-view">
        <div class="room-info">
          <h3>Room: ${roomInfo.name || roomInfo.id}</h3>
          <div class="room-details">
            <span class="room-role">Role: ${roomInfo.role}</span>
            <span class="room-participants">Participants: ${roomInfo.participantCount}</span>
          </div>
        </div>

        <div class="room-actions">
          <button id="fallback-copy-link" class="btn btn-secondary btn-full">
            Copy Invitation Link
          </button>
          
          ${
            roomInfo.role === 'host'
              ? `
            <div class="host-controls">
              <button id="fallback-play" class="btn btn-primary">Play</button>
              <button id="fallback-pause" class="btn btn-primary">Pause</button>
            </div>
          `
              : ''
          }
          
          <button id="fallback-leave-room" class="btn btn-danger btn-full">
            Leave Room
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Set up event listeners for popup fallback
   */
  private setupPopupEventListeners(): void {
    // Main menu actions
    document.getElementById('fallback-create-room')?.addEventListener('click', () => {
      this.showCreateRoomForm();
    });

    document.getElementById('fallback-join-room')?.addEventListener('click', () => {
      this.showJoinRoomForm();
    });

    document.getElementById('fallback-open-options')?.addEventListener('click', () => {
      this.openOptionsPage();
    });

    // Form actions
    document.getElementById('cancel-create')?.addEventListener('click', () => {
      this.hideRoomForms();
    });

    document.getElementById('cancel-join')?.addEventListener('click', () => {
      this.hideRoomForms();
    });

    document.getElementById('confirm-create')?.addEventListener('click', () => {
      this.handleCreateRoom();
    });

    document.getElementById('confirm-join')?.addEventListener('click', () => {
      this.handleJoinRoom();
    });

    // Room actions
    document.getElementById('fallback-copy-link')?.addEventListener('click', () => {
      this.copyInvitationLink();
    });

    document.getElementById('fallback-leave-room')?.addEventListener('click', () => {
      this.handleLeaveRoom();
    });

    // Footer actions
    document.getElementById('fallback-refresh')?.addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('fallback-troubleshoot')?.addEventListener('click', () => {
      troubleshootingManager.showTroubleshootingModal();
    });
  }

  /**
   * Set up event listeners for options fallback
   */
  private setupOptionsEventListeners(): void {
    document.getElementById('fallback-save')?.addEventListener('click', () => {
      this.handleSaveSettings();
    });

    document.getElementById('fallback-reset')?.addEventListener('click', () => {
      this.handleResetSettings();
    });

    document.getElementById('fallback-refresh-options')?.addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('fallback-export-diagnostics')?.addEventListener('click', () => {
      troubleshootingManager.exportDiagnostics();
    });

    document.getElementById('fallback-show-troubleshooting')?.addEventListener('click', () => {
      troubleshootingManager.showTroubleshootingModal();
    });

    document.getElementById('fallback-export')?.addEventListener('click', () => {
      this.handleExportSettings();
    });

    document.getElementById('fallback-import-file')?.addEventListener('click', () => {
      const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
      fileInput?.click();
    });

    document.getElementById('import-file-input')?.addEventListener('change', (event) => {
      this.handleImportFile(event);
    });
  }

  /**
   * Add CSS styles for fallback UI
   */
  private addFallbackStyles(): void {
    if (document.getElementById('fallback-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'fallback-styles';
    styles.textContent = `
      .fallback-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 380px;
        min-height: 400px;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        overflow: hidden;
      }

      .fallback-header {
        background: #6200EE;
        color: white;
        padding: 16px;
        text-align: center;
      }

      .fallback-header h1 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }

      .fallback-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
      }

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ff4444;
      }

      .fallback-status.connected .status-indicator {
        background: #00C851;
      }

      .fallback-status.connecting .status-indicator {
        background: #ffbb33;
        animation: pulse 1s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .fallback-content {
        padding: 16px;
      }

      .main-menu .menu-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .room-form {
        margin-top: 16px;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      .room-form h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
      }

      .form-group {
        margin-bottom: 12px;
      }

      .form-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
        font-size: 14px;
      }

      .form-group input[type="text"],
      .form-group input[type="url"],
      .form-group input[type="password"] {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }

      .form-group input[type="checkbox"] {
        margin-right: 8px;
      }

      .form-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }

      .btn {
        padding: 10px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        text-decoration: none;
        display: inline-block;
      }

      .btn-primary {
        background: #6200EE;
        color: white;
      }

      .btn-primary:hover {
        background: #5500CC;
      }

      .btn-secondary {
        background: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
      }

      .btn-secondary:hover {
        background: #e9e9e9;
      }

      .btn-danger {
        background: #f44336;
        color: white;
      }

      .btn-danger:hover {
        background: #d32f2f;
      }

      .btn-full {
        width: 100%;
      }

      .btn-small {
        padding: 6px 12px;
        font-size: 12px;
      }

      .fallback-footer {
        padding: 12px 16px;
        background: #f5f5f5;
        border-top: 1px solid #eee;
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .settings-section {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #eee;
      }

      .settings-section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
      }

      .settings-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        flex-wrap: wrap;
      }

      .fallback-troubleshooting {
        margin-top: 24px;
        padding: 16px;
        background: #f9f9f9;
        border-radius: 8px;
      }

      .fallback-troubleshooting h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #666;
      }

      .fallback-troubleshooting p {
        margin: 0 0 12px 0;
        font-size: 13px;
        color: #666;
      }

      .troubleshooting-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .help-text {
        display: block;
        font-size: 12px;
        color: #666;
        margin-top: 4px;
        line-height: 1.3;
      }

      .fallback-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
      }

      .fallback-notification.success {
        background: #4CAF50;
      }

      .fallback-notification.error {
        background: #f44336;
      }

      .fallback-notification.warning {
        background: #ff9800;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .room-info {
        margin-bottom: 16px;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      .room-info h3 {
        margin: 0 0 8px 0;
        font-size: 16px;
      }

      .room-details {
        display: flex;
        gap: 16px;
        font-size: 14px;
        color: #666;
      }

      .host-controls {
        display: flex;
        gap: 8px;
        margin: 12px 0;
      }

      .host-controls .btn {
        flex: 1;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .fallback-container {
          background: #1e1e1e;
          color: #e0e0e0;
        }

        .fallback-header {
          background: #3700B3;
        }

        .room-form,
        .room-info,
        .fallback-footer,
        .fallback-troubleshooting {
          background: #2d2d2d;
          border-color: #444;
        }

        .form-group input {
          background: #333;
          border-color: #555;
          color: #e0e0e0;
        }

        .btn-secondary {
          background: #333;
          color: #e0e0e0;
          border-color: #555;
        }

        .btn-secondary:hover {
          background: #444;
        }
      }

      /* Accessibility improvements */
      .btn:focus {
        outline: 2px solid #6200EE;
        outline-offset: 2px;
      }

      .form-group input:focus {
        outline: 2px solid #6200EE;
        outline-offset: 1px;
      }

      /* Responsive adjustments */
      @media (max-width: 400px) {
        .fallback-container {
          max-width: 100%;
          border-radius: 0;
        }

        .form-actions {
          flex-direction: column;
        }

        .settings-actions {
          flex-direction: column;
        }

        .host-controls {
          flex-direction: column;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // Helper methods for popup functionality
  private showCreateRoomForm(): void {
    this.hideRoomForms();
    const form = document.getElementById('fallback-create-form');
    if (form) form.style.display = 'block';
  }

  private showJoinRoomForm(): void {
    this.hideRoomForms();
    const form = document.getElementById('fallback-join-form');
    if (form) form.style.display = 'block';
  }

  private hideRoomForms(): void {
    const createForm = document.getElementById('fallback-create-form');
    const joinForm = document.getElementById('fallback-join-form');
    if (createForm) createForm.style.display = 'none';
    if (joinForm) joinForm.style.display = 'none';
  }

  private async handleCreateRoom(): Promise<void> {
    const nameInput = document.getElementById('room-name') as HTMLInputElement;
    const publicCheckbox = document.getElementById('room-public') as HTMLInputElement;

    const roomData = {
      name: nameInput?.value || '',
      isPublic: publicCheckbox?.checked || false,
    };

    try {
      // Send message to background script to create room
      const response = (await browserAPI.runtime.sendMessage({
        type: 'CREATE_ROOM',
        data: roomData,
      })) as { success?: boolean; error?: string } | undefined;

      if (response?.success) {
        // Refresh to show room view
        window.location.reload();
      } else {
        alert('Failed to create room: ' + (response?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    }
  }

  private async handleJoinRoom(): Promise<void> {
    const idInput = document.getElementById('room-id') as HTMLInputElement;
    const passwordInput = document.getElementById('room-password') as HTMLInputElement;

    const roomId = idInput?.value?.trim();
    if (!roomId) {
      alert('Please enter a room ID or invitation link');
      return;
    }

    try {
      // Send message to background script to join room
      const response = (await browserAPI.runtime.sendMessage({
        type: 'JOIN_ROOM',
        data: {
          roomId,
          password: passwordInput?.value || '',
        },
      })) as { success?: boolean; error?: string } | undefined;

      if (response?.success) {
        // Refresh to show room view
        window.location.reload();
      } else {
        alert('Failed to join room: ' + (response?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    }
  }

  private async handleLeaveRoom(): Promise<void> {
    if (!confirm('Are you sure you want to leave the room?')) return;

    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'LEAVE_ROOM',
      })) as { success?: boolean; error?: string } | undefined;

      if (response?.success) {
        // Refresh to show main menu
        window.location.reload();
      } else {
        alert('Failed to leave room: ' + (response?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('Failed to leave room. Please try again.');
    }
  }

  private async copyInvitationLink(): Promise<void> {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'GET_INVITATION_LINK',
      })) as { success?: boolean; link?: string } | undefined;

      if (response?.success && response.link) {
        await navigator.clipboard.writeText(response.link);
        alert('Invitation link copied to clipboard!');
      } else {
        alert('Failed to get invitation link');
      }
    } catch (error) {
      console.error('Error copying invitation link:', error);
      alert('Failed to copy invitation link');
    }
  }

  private openOptionsPage(): void {
    browserAPI.runtime.openOptionsPage();
  }

  // Helper methods for options functionality
  private async loadBasicSettings(): Promise<void> {
    try {
      const settings = await fallbackSettingsManager.loadSettings();
      this.populateSettingsForm(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showNotification('Failed to load settings. Using defaults.', 'error');
    }
  }

  private populateSettingsForm(settings: FallbackSettings): void {
    // Server settings
    const signalingInput = document.getElementById('signaling-server') as HTMLInputElement;
    const localDevCheckbox = document.getElementById('local-dev-mode') as HTMLInputElement;

    // Sync settings
    const syncToleranceInput = document.getElementById('sync-tolerance') as HTMLInputElement;
    const heartbeatInput = document.getElementById('heartbeat-interval') as HTMLInputElement;

    // Feature settings
    const voiceChatCheckbox = document.getElementById('voice-chat') as HTMLInputElement;
    const annotationsCheckbox = document.getElementById('annotations') as HTMLInputElement;
    const subtitlesCheckbox = document.getElementById('subtitles') as HTMLInputElement;
    const telemetryCheckbox = document.getElementById('telemetry') as HTMLInputElement;

    // Accessibility settings
    const highContrastCheckbox = document.getElementById('high-contrast') as HTMLInputElement;
    const reducedMotionCheckbox = document.getElementById('reduced-motion') as HTMLInputElement;
    const fontSizeSelect = document.getElementById('font-size') as HTMLSelectElement;

    // Populate fields
    if (signalingInput) signalingInput.value = settings.signalingServer || '';
    if (localDevCheckbox) localDevCheckbox.checked = settings.localDevMode || false;
    if (syncToleranceInput) syncToleranceInput.value = String(settings.syncToleranceMs || 250);
    if (heartbeatInput) heartbeatInput.value = String(settings.heartbeatIntervalMs || 2000);
    if (voiceChatCheckbox) voiceChatCheckbox.checked = settings.voiceChat || false;
    if (annotationsCheckbox) annotationsCheckbox.checked = settings.annotations || false;
    if (subtitlesCheckbox) subtitlesCheckbox.checked = settings.subtitles || false;
    if (telemetryCheckbox) telemetryCheckbox.checked = settings.telemetryEnabled || false;
    if (highContrastCheckbox) highContrastCheckbox.checked = settings.highContrastMode || false;
    if (reducedMotionCheckbox) reducedMotionCheckbox.checked = settings.reducedMotion || false;
    if (fontSizeSelect) fontSizeSelect.value = settings.fontSize || 'medium';
  }

  private collectSettingsFromForm(): Partial<FallbackSettings> {
    const settings: Partial<FallbackSettings> = {};

    // Server settings
    const signalingInput = document.getElementById('signaling-server') as HTMLInputElement;
    const localDevCheckbox = document.getElementById('local-dev-mode') as HTMLInputElement;

    // Sync settings
    const syncToleranceInput = document.getElementById('sync-tolerance') as HTMLInputElement;
    const heartbeatInput = document.getElementById('heartbeat-interval') as HTMLInputElement;

    // Feature settings
    const voiceChatCheckbox = document.getElementById('voice-chat') as HTMLInputElement;
    const annotationsCheckbox = document.getElementById('annotations') as HTMLInputElement;
    const subtitlesCheckbox = document.getElementById('subtitles') as HTMLInputElement;
    const telemetryCheckbox = document.getElementById('telemetry') as HTMLInputElement;

    // Accessibility settings
    const highContrastCheckbox = document.getElementById('high-contrast') as HTMLInputElement;
    const reducedMotionCheckbox = document.getElementById('reduced-motion') as HTMLInputElement;
    const fontSizeSelect = document.getElementById('font-size') as HTMLSelectElement;

    // Collect values
    if (signalingInput) settings.signalingServer = signalingInput.value;
    if (localDevCheckbox) settings.localDevMode = localDevCheckbox.checked;
    if (syncToleranceInput) settings.syncToleranceMs = parseInt(syncToleranceInput.value) || 250;
    if (heartbeatInput) settings.heartbeatIntervalMs = parseInt(heartbeatInput.value) || 2000;
    if (voiceChatCheckbox) settings.voiceChat = voiceChatCheckbox.checked;
    if (annotationsCheckbox) settings.annotations = annotationsCheckbox.checked;
    if (subtitlesCheckbox) settings.subtitles = subtitlesCheckbox.checked;
    if (telemetryCheckbox) settings.telemetryEnabled = telemetryCheckbox.checked;
    if (highContrastCheckbox) settings.highContrastMode = highContrastCheckbox.checked;
    if (reducedMotionCheckbox) settings.reducedMotion = reducedMotionCheckbox.checked;
    if (fontSizeSelect) {
      settings.fontSize = fontSizeSelect.value as FallbackSettings['fontSize'];
    }

    return settings;
  }

  private async handleSaveSettings(): Promise<void> {
    try {
      const settings = this.collectSettingsFromForm();
      const result = await fallbackSettingsManager.saveSettings(settings);

      if (result.success) {
        this.showNotification('Settings saved successfully!', 'success');

        // Show warnings if any
        if (result.validation?.warnings.length) {
          for (const warning of result.validation.warnings) {
            this.showNotification(`Warning: ${warning.message}`, 'warning');
          }
        }
      } else {
        this.showNotification(`Failed to save settings: ${result.error}`, 'error');

        // Show validation errors
        if (result.validation?.errors.length) {
          for (const error of result.validation.errors) {
            this.showNotification(`${error.field}: ${error.message}`, 'error');
          }
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Failed to save settings. Please try again.', 'error');
    }
  }

  private async handleResetSettings(): Promise<void> {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;

    try {
      const result = await fallbackSettingsManager.resetSettings();

      if (result.success) {
        await this.loadBasicSettings();
        this.showNotification('Settings reset to defaults!', 'success');
      } else {
        this.showNotification(`Failed to reset settings: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showNotification('Failed to reset settings. Please try again.', 'error');
    }
  }

  private async handleExportSettings(): Promise<void> {
    try {
      const formatSelect = document.getElementById('export-format') as HTMLSelectElement;
      const format = (formatSelect?.value || 'json') as 'json' | 'env' | 'ini';

      const exportedData = fallbackSettingsManager.exportSettings(format);

      // Create and download file
      const blob = new Blob([exportedData], {
        type: format === 'json' ? 'application/json' : 'text/plain',
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `watch-party-settings.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Settings exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting settings:', error);
      this.showNotification('Failed to export settings. Please try again.', 'error');
    }
  }

  private async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const content = await this.readFileContent(file);
      const extension = file.name.split('.').pop()?.toLowerCase();

      let format: 'json' | 'env' | 'ini' = 'json';
      if (extension === 'env') format = 'env';
      else if (extension === 'ini') format = 'ini';

      const result = await fallbackSettingsManager.importSettings(content, format);

      if (result.success) {
        await this.loadBasicSettings();
        this.showNotification('Settings imported successfully!', 'success');
      } else {
        this.showNotification(`Failed to import settings: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      this.showNotification('Failed to import settings. Please try again.', 'error');
    } finally {
      // Clear the input
      input.value = '';
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fallback-notification ${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Utility methods
  private setupReactFailureDetection(): void {
    // Listen for React errors
    window.addEventListener('error', (event) => {
      if (
        event.error &&
        event.error.stack &&
        (event.error.stack.includes('React') ||
          event.error.stack.includes('react') ||
          event.error.message.includes('React'))
      ) {
        console.error('React error detected:', event.error);
        this.activateFallback('React error detected');
      }
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('React')) {
        console.error('React promise rejection:', event.reason);
        this.activateFallback('React promise rejection');
      }
    });
  }

  private setupTimeoutDetection(): void {
    // Set up timeout to detect if React never loads
    setTimeout(() => {
      const reactRoot =
        document.querySelector('[data-reactroot]') ||
        document.querySelector('.MuiThemeProvider-root') ||
        document.querySelector('[class*="MuiBox-root"]');

      const loadingElement = document.getElementById('loading-fallback');

      if (!reactRoot && loadingElement && loadingElement.style.display !== 'none') {
        console.warn('React components failed to load within timeout');
        this.activateFallback('Loading timeout exceeded');
      }
    }, this.config.timeoutMs);
  }

  private activateFallback(reason: string): void {
    if (this.currentPage === 'popup') {
      this.activatePopupFallback(reason);
    } else if (this.currentPage === 'options') {
      this.activateOptionsFallback(reason);
    }
  }

  private hideReactElements(): void {
    // Hide loading elements
    const loadingElement = document.getElementById('loading-fallback');
    if (loadingElement) loadingElement.style.display = 'none';

    // Hide error elements
    const errorElement = document.getElementById('error-fallback');
    if (errorElement) errorElement.style.display = 'none';

    // Clear any existing React content
    const reactElements = document.querySelectorAll('[data-reactroot], .MuiThemeProvider-root');
    reactElements.forEach((el) => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }

  private async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'GET_CONNECTION_STATUS',
      })) as { status?: ConnectionStatus } | undefined;

      return response?.status || { status: 'disconnected' };
    } catch {
      return { status: 'error', errorMessage: 'Failed to get status' };
    }
  }

  private async getRoomInfo(): Promise<RoomInfo> {
    try {
      const response = (await browserAPI.runtime.sendMessage({
        type: 'GET_ROOM_INFO',
      })) as { roomInfo?: RoomInfo } | undefined;

      return (
        response?.roomInfo || {
          id: null,
          name: null,
          role: null,
          participantCount: 0,
          isActive: false,
        }
      );
    } catch {
      return {
        id: null,
        name: null,
        role: null,
        participantCount: 0,
        isActive: false,
      };
    }
  }

  private getStatusText(status: ConnectionStatus): string {
    switch (status.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return status.errorMessage || 'Connection Error';
      default:
        return 'Not Connected';
    }
  }

  private showCriticalError(message: string): void {
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h2 style="color: #f44336; margin-bottom: 16px;">Critical Error</h2>
          <p style="margin-bottom: 16px;">${message}</p>
          <button onclick="window.location.reload()" style="
            padding: 10px 20px;
            background: #6200EE;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Reload Extension</button>
        </div>
      </div>
    `;
  }
}

// Export singleton instance
export const fallbackUIManager = FallbackUIManager.getInstance();
