/**
 * Popup UI for room creation and joining
 * Implements requirements 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4
 */

import { RoomOptions, ParticipantInfo } from '../../@core/signaling/message-types';
import { ConnectionState } from '../../@core/signaling/signaling-client';
import { ChatMessage, ReactionType } from '../../@core/chat/types';
import { AnnotationToolbar } from '../components/annotation-toolbar';
import { SubtitleManager } from '../components/subtitle-manager';
import { PopupAccessibilityIntegration } from './accessibility-integration';

interface ConnectionStatus {
  connected: boolean;
  connectionState: ConnectionState;
  roomId: string;
  isHost: boolean;
  syncActive: boolean;
  userId?: string;
}

interface RoomState {
  roomId: string;
  participants: ParticipantInfo[];
  isHost: boolean;
  currentUserId: string;
  chatMessages: ChatMessage[];
}

class PopupUI {
  private currentState: RoomState | null = null;
  private connectionStatus: ConnectionStatus | null = null;
  private annotationToolbar: AnnotationToolbar | null = null;
  private subtitleManager: SubtitleManager | null = null;
  private accessibilityIntegration: PopupAccessibilityIntegration;

  constructor() {
    this.accessibilityIntegration = new PopupAccessibilityIntegration();
    this.setupEventListeners();
    this.loadPersistedRoomState();
    this.updateUI();
    this.pollConnectionStatus();
  }

  /**
   * Handle synchronous button clicks with visual feedback
   */
  private handleButtonClick(event: Event, action: () => void): void {
    const button = event.target as HTMLButtonElement;
    if (!button || button.disabled) return;

    try {
      this.setButtonState(button, 'loading');
      action();
      this.setButtonState(button, 'success');

      // Reset button state after brief success indication
      setTimeout(() => {
        this.setButtonState(button, 'idle');
      }, 1000);
    } catch (error) {
      console.error('Button action failed:', error);
      this.setButtonState(button, 'error');
      this.showErrorMessage(error instanceof Error ? error.message : 'Operation failed');

      // Reset button state after error indication
      setTimeout(() => {
        this.setButtonState(button, 'idle');
      }, 3000);
    }
  }

  /**
   * Handle asynchronous button clicks with visual feedback
   */
  private async handleAsyncButtonClick(
    event: Event,
    action: () => Promise<void> | void
  ): Promise<void> {
    const button = event.target as HTMLButtonElement;
    if (!button || button.disabled) return;

    try {
      this.setButtonState(button, 'loading');
      await action();
      this.setButtonState(button, 'success');

      // Reset button state after brief success indication
      setTimeout(() => {
        this.setButtonState(button, 'idle');
      }, 1000);
    } catch (error) {
      console.error('Async button action failed:', error);
      this.setButtonState(button, 'error');
      this.showErrorMessage(error instanceof Error ? error.message : 'Operation failed');

      // Reset button state after error indication
      setTimeout(() => {
        this.setButtonState(button, 'idle');
      }, 3000);
    }
  }

  /**
   * Set button visual state
   */
  private setButtonState(
    button: HTMLButtonElement,
    state: 'idle' | 'loading' | 'success' | 'error'
  ): void {
    // Remove all state classes
    button.classList.remove('btn-loading', 'btn-success', 'btn-error');

    // Store original text if not already stored
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent || '';
    }

    switch (state) {
      case 'loading':
        button.disabled = true;
        button.classList.add('btn-loading');
        button.textContent = 'Loading...';
        break;
      case 'success':
        button.disabled = false;
        button.classList.add('btn-success');
        button.textContent = '✓ Success';
        break;
      case 'error':
        button.disabled = false;
        button.classList.add('btn-error');
        button.textContent = '✗ Error';
        break;
      case 'idle':
      default:
        button.disabled = false;
        button.textContent = button.dataset.originalText || '';
        break;
    }
  }

  /**
   * Show error message to user
   */
  private showErrorMessage(message: string): void {
    // Create or update error notification
    let errorDiv = document.getElementById('error-notification');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'error-notification';
      errorDiv.className = 'error-notification';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'assertive');

      // Insert at top of popup
      const firstSection = document.querySelector('.header');
      if (firstSection && firstSection.parentNode) {
        firstSection.parentNode.insertBefore(errorDiv, firstSection.nextSibling);
      }
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
    }, 5000);
  }

  /**
   * Show success message to user
   */
  private showSuccessMessage(message: string): void {
    // Create or update success notification
    let successDiv = document.getElementById('success-notification');
    if (!successDiv) {
      successDiv = document.createElement('div');
      successDiv.id = 'success-notification';
      successDiv.className = 'success-notification';
      successDiv.setAttribute('role', 'status');
      successDiv.setAttribute('aria-live', 'polite');

      // Insert at top of popup
      const firstSection = document.querySelector('.header');
      if (firstSection && firstSection.parentNode) {
        firstSection.parentNode.insertBefore(successDiv, firstSection.nextSibling);
      }
    }

    successDiv.textContent = message;
    successDiv.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (successDiv) {
        successDiv.style.display = 'none';
      }
    }, 3000);
  }

  private setupEventListeners(): void {
    // Main menu buttons
    document
      .getElementById('createRoom')
      ?.addEventListener('click', (e) =>
        this.handleButtonClick(e, () => this.showCreateRoomForm())
      );
    document
      .getElementById('joinRoom')
      ?.addEventListener('click', (e) => this.handleButtonClick(e, () => this.showJoinRoomForm()));
    document
      .getElementById('openOptions')
      ?.addEventListener('click', (e) => this.handleButtonClick(e, () => this.openOptionsPage()));

    // Create room form
    document
      .getElementById('confirmCreateRoom')
      ?.addEventListener('click', (e) => this.handleAsyncButtonClick(e, () => this.createRoom()));
    document
      .getElementById('cancelCreateRoom')
      ?.addEventListener('click', (e) => this.handleButtonClick(e, () => this.showMainMenu()));

    // Join room form
    document
      .getElementById('confirmJoinRoom')
      ?.addEventListener('click', (e) => this.handleAsyncButtonClick(e, () => this.joinRoom()));
    document
      .getElementById('cancelJoinRoom')
      ?.addEventListener('click', (e) => this.handleButtonClick(e, () => this.showMainMenu()));

    // Room actions
    document
      .getElementById('leaveRoom')
      ?.addEventListener('click', (e) => this.handleAsyncButtonClick(e, () => this.leaveRoom()));
    document
      .getElementById('copyInviteLink')
      ?.addEventListener('click', (e) =>
        this.handleAsyncButtonClick(e, () => this.copyInvitationLink())
      );

    // Video sync controls
    document
      .getElementById('startRoom')
      ?.addEventListener('click', (e) =>
        this.handleAsyncButtonClick(e, () => this.startRoomSync())
      );
    document
      .getElementById('stopRoom')
      ?.addEventListener('click', (e) => this.handleAsyncButtonClick(e, () => this.stopRoomSync()));

    // Host controls
    document
      .getElementById('playButton')
      ?.addEventListener('click', (e) =>
        this.handleAsyncButtonClick(e, () => this.sendPlayCommand())
      );
    document
      .getElementById('pauseButton')
      ?.addEventListener('click', (e) =>
        this.handleAsyncButtonClick(e, () => this.sendPauseCommand())
      );
    document
      .getElementById('transferHostButton')
      ?.addEventListener('click', (e) =>
        this.handleAsyncButtonClick(e, () => this.showTransferHostDialog())
      );
    document
      .getElementById('lockRoomButton')
      ?.addEventListener('click', (e) =>
        this.handleAsyncButtonClick(e, () => this.toggleRoomLock())
      );

    // Chat functionality
    document
      .getElementById('sendMessage')
      ?.addEventListener('click', (e) =>
        this.handleAsyncButtonClick(e, () => this.sendChatMessage())
      );
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const sendButton = document.getElementById('sendMessage') as HTMLButtonElement;
        if (sendButton && !sendButton.disabled) {
          this.handleAsyncButtonClick(e, () => this.sendChatMessage());
        }
      }
    });

    // Reaction buttons
    document.querySelectorAll('.reaction-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const reactionType = (e.target as HTMLElement).getAttribute(
          'data-reaction'
        ) as ReactionType;
        if (reactionType) {
          this.sendReaction(reactionType);
        }
      });
    });

    // Subtitle controls
    document
      .getElementById('loadSubtitleFile')
      ?.addEventListener('click', () => this.loadSubtitleFile());
    document
      .getElementById('searchOpenSubtitles')
      ?.addEventListener('click', () => this.showOpenSubtitlesModal());
    document
      .getElementById('advancedSubtitleSettings')
      ?.addEventListener('click', () => this.showAdvancedSubtitleManager());
    document
      .getElementById('subtitleFileInput')
      ?.addEventListener('change', (e) => this.handleSubtitleFileSelected(e));

    // OpenSubtitles modal
    document
      .getElementById('closeOpenSubtitlesModal')
      ?.addEventListener('click', () => this.hideOpenSubtitlesModal());
    document
      .getElementById('performSubtitleSearch')
      ?.addEventListener('click', () => this.performOpenSubtitlesSearch());

    // Listen for server messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SERVER_MESSAGE') {
        this.handleServerMessage(message.message);
      } else if (message.type === 'CONNECTION_STATE_CHANGED') {
        this.handleConnectionStateChange(message.state);
      }
    });
  }

  private async updateUI(): Promise<void> {
    try {
      // Get current connection status
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' });
      if (response.success) {
        this.connectionStatus = response.status;
        this.updateConnectionStatus();

        if (this.connectionStatus?.roomId) {
          // We're in a room, show room view
          // Initialize current state from connection status
          this.currentState = {
            roomId: this.connectionStatus.roomId,
            participants: [], // Will be populated by server messages
            isHost: this.connectionStatus.isHost,
            currentUserId: this.connectionStatus.userId || 'unknown',
            chatMessages: [],
          };
          this.showRoomView();
        } else {
          // Not in a room, show main menu
          this.showMainMenu();
        }
      }
    } catch (error) {
      console.error('Failed to get connection status:', error);
      this.updateConnectionStatus();
      this.showMainMenu();
    }
  }

  private updateConnectionStatus(): void {
    const statusElement = document.getElementById('status');
    const statusText = statusElement?.querySelector('.status-text');
    if (!statusElement || !statusText || !this.connectionStatus) return;

    statusElement.className = 'status-card';

    switch (this.connectionStatus.connectionState) {
      case ConnectionState.CONNECTED:
        statusElement.classList.add('connected');
        statusText.textContent = this.connectionStatus.roomId
          ? `Connected - Room ${this.connectionStatus.roomId}`
          : 'Connected';
        break;
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        statusElement.classList.add('connecting');
        statusText.textContent = 'Connecting...';
        break;
      default:
        statusElement.classList.add('disconnected');
        statusText.textContent = 'Not connected';
    }

    // Update button states based on connection
    this.updateButtonStates();
  }

  /**
   * Update button enabled/disabled states based on connection and room status
   */
  private updateButtonStates(): void {
    const isConnected = this.connectionStatus?.connectionState === ConnectionState.CONNECTED;
    const isInRoom = !!this.currentState;
    const isHost = this.currentState?.isHost || false;

    // Main menu buttons
    this.setButtonEnabled('createRoom', isConnected && !isInRoom);
    this.setButtonEnabled('joinRoom', isConnected && !isInRoom);
    this.setButtonEnabled('openOptions', true); // Always enabled

    // Create/Join form buttons
    this.setButtonEnabled('confirmCreateRoom', isConnected);
    this.setButtonEnabled('confirmJoinRoom', isConnected);

    // Room action buttons
    this.setButtonEnabled('leaveRoom', isInRoom);
    this.setButtonEnabled('copyInviteLink', isInRoom);

    // Host control buttons
    this.setButtonEnabled('playButton', isHost && this.connectionStatus?.syncActive === true);
    this.setButtonEnabled('pauseButton', isHost && this.connectionStatus?.syncActive === true);
    this.setButtonEnabled('transferHostButton', isHost);
    this.setButtonEnabled('lockRoomButton', isHost);

    // Chat buttons
    this.setButtonEnabled('sendMessage', isInRoom);

    // Sync control buttons
    this.setButtonEnabled('startRoom', isInRoom && this.connectionStatus?.syncActive !== true);
    this.setButtonEnabled('stopRoom', isInRoom && this.connectionStatus?.syncActive === true);
  }

  /**
   * Enable or disable a button by ID
   */
  private setButtonEnabled(buttonId: string, enabled: boolean): void {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (button) {
      button.disabled = !enabled;

      // Add visual indication for disabled state
      if (enabled) {
        button.removeAttribute('title');
      } else {
        // Set appropriate disabled message
        let disabledMessage = '';
        switch (buttonId) {
          case 'createRoom':
          case 'joinRoom':
          case 'confirmCreateRoom':
          case 'confirmJoinRoom':
            disabledMessage = 'Not connected to server';
            break;
          case 'leaveRoom':
          case 'copyInviteLink':
          case 'sendMessage':
            disabledMessage = 'Not in a room';
            break;
          case 'playButton':
          case 'pauseButton':
            disabledMessage = 'Not host or sync not active';
            break;
          case 'transferHostButton':
          case 'lockRoomButton':
            disabledMessage = 'Host privileges required';
            break;
          case 'startRoom':
            disabledMessage = this.currentState ? 'Sync already active' : 'Not in a room';
            break;
          case 'stopRoom':
            disabledMessage = 'Sync not active';
            break;
        }
        button.setAttribute('title', disabledMessage);
      }
    }
  }

  private showMainMenu(): void {
    this.hideAllSections();
    document.getElementById('mainMenu')?.classList.remove('hidden');
  }

  private showCreateRoomForm(): void {
    this.hideAllSections();
    document.getElementById('createRoomForm')?.classList.remove('hidden');
  }

  private showJoinRoomForm(): void {
    this.hideAllSections();
    document.getElementById('joinRoomForm')?.classList.remove('hidden');
  }

  private showRoomView(): void {
    this.hideAllSections();
    document.getElementById('roomView')?.classList.remove('hidden');
    this.updateRoomInfo();
    this.updateSyncUI(this.connectionStatus?.syncActive || false);
    this.initializeAnnotationToolbar();
    this.accessibilityIntegration.updateForDynamicContent();
    this.accessibilityIntegration.announceRoomStateChange('Entered room view');
  }

  private hideAllSections(): void {
    const sections = ['mainMenu', 'createRoomForm', 'joinRoomForm', 'roomView'];
    sections.forEach((id) => {
      document.getElementById(id)?.classList.add('hidden');
    });
  }

  private async createRoom(): Promise<void> {
    // Validate connection status first
    if (
      !this.connectionStatus ||
      this.connectionStatus.connectionState === ConnectionState.DISCONNECTED
    ) {
      throw new Error('Not connected to signaling server. Please check your connection.');
    }

    // Validate form inputs
    const roomName = (document.getElementById('roomName') as HTMLInputElement)?.value?.trim();
    const isPublic = (document.getElementById('isPublic') as HTMLInputElement)?.checked || false;
    const password = (document.getElementById('roomPassword') as HTMLInputElement)?.value?.trim();
    const maxParticipantsInput = document.getElementById('maxParticipants') as HTMLInputElement;
    const maxParticipants = parseInt(maxParticipantsInput?.value) || 10;

    // Validate max participants
    if (maxParticipants < 2 || maxParticipants > 50) {
      throw new Error('Max participants must be between 2 and 50');
    }

    // Validate password if provided
    if (password && password.length < 4) {
      throw new Error('Password must be at least 4 characters long');
    }

    const roomOptions: RoomOptions = {
      name: roomName || undefined,
      isPublic,
      password: password || undefined,
      maxParticipants,
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_ROOM',
        roomOptions,
      });

      if (response.success) {
        console.log('Room creation initiated');
        this.showSuccessMessage('Room creation started...');
        // UI will update when we receive ROOM_CREATED message
      } else {
        throw new Error(response.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to create room - please try again');
      }
    }
  }

  private async joinRoom(): Promise<void> {
    // Validate connection status first
    if (
      !this.connectionStatus ||
      this.connectionStatus.connectionState === ConnectionState.DISCONNECTED
    ) {
      throw new Error('Not connected to signaling server. Please check your connection.');
    }

    let roomId = (document.getElementById('joinRoomId') as HTMLInputElement)?.value?.trim();
    const password = (document.getElementById('joinPassword') as HTMLInputElement)?.value?.trim();

    if (!roomId) {
      throw new Error('Please enter a room ID or invitation link');
    }

    // Extract room ID from invitation link if needed
    roomId = this.extractRoomIdFromLink(roomId);

    // Validate room ID format (basic validation)
    if (roomId.length < 3) {
      throw new Error('Room ID appears to be invalid');
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'JOIN_ROOM',
        roomId,
        password: password || undefined,
      });

      if (response.success) {
        console.log('Room join initiated');
        this.showSuccessMessage('Joining room...');
        // UI will update when we receive ROOM_JOINED message
      } else {
        throw new Error(response.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to join room - please try again');
      }
    }
  }

  private async leaveRoom(): Promise<void> {
    if (!this.currentState) {
      throw new Error('Not currently in a room');
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: 'LEAVE_ROOM' });
      if (response.success) {
        this.currentState = null;
        this.showMainMenu();
        this.showSuccessMessage('Left room successfully');
      } else {
        throw new Error(response.error || 'Failed to leave room');
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to leave room - please try again');
      }
    }
  }

  private extractRoomIdFromLink(input: string): string {
    // Handle invitation links like "https://example.com/room/ABC123" or just "ABC123"
    const match = input.match(/(?:\/room\/|^)([A-Za-z0-9_-]+)(?:\?|$|\/)/);
    return match ? match[1] : input;
  }

  private generateInvitationLink(roomId: string): string {
    // For now, just return the room ID. In a full implementation, this would be a proper URL
    return `Room ID: ${roomId}`;
  }

  private async copyInvitationLink(): Promise<void> {
    const linkElement = document.getElementById('invitationLink') as HTMLInputElement;
    if (!linkElement || !linkElement.value) {
      throw new Error('No invitation link available to copy');
    }

    try {
      await navigator.clipboard.writeText(linkElement.value);
      this.showSuccessMessage('Invitation link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);

      // Fallback: select the text for manual copy
      try {
        linkElement.select();
        linkElement.setSelectionRange(0, 99999); // For mobile devices
        const success = document.execCommand('copy');
        if (success) {
          this.showSuccessMessage('Invitation link selected - press Ctrl+C to copy');
        } else {
          throw new Error('Copy operation failed');
        }
      } catch (fallbackError) {
        throw new Error('Unable to copy link - please select and copy manually');
      }
    }
  }

  private updateRoomInfo(): void {
    if (!this.currentState) return;

    // Update room ID
    const roomIdElement = document.getElementById('currentRoomId');
    if (roomIdElement) {
      roomIdElement.textContent = this.currentState.roomId;
    }

    // Update role
    const roleElement = document.getElementById('currentRole');
    if (roleElement) {
      roleElement.textContent = this.currentState.isHost ? 'Host' : 'Participant';
    }

    // Update participant count
    const countElement = document.getElementById('participantCount');
    if (countElement) {
      countElement.textContent = this.currentState.participants.length.toString();
    }

    // Update invitation link
    const linkElement = document.getElementById('invitationLink') as HTMLInputElement;
    if (linkElement) {
      linkElement.value = this.generateInvitationLink(this.currentState.roomId);
    }

    // Show/hide host controls
    const hostControls = document.getElementById('hostControls');
    if (hostControls) {
      if (this.currentState.isHost) {
        hostControls.classList.remove('hidden');
      } else {
        hostControls.classList.add('hidden');
      }
    }

    // Update participants list
    this.updateParticipantsList();

    // Update chat display
    this.updateChatDisplay();

    // Update button states based on new room info
    this.updateButtonStates();
  }

  private updateParticipantsList(): void {
    const listElement = document.getElementById('participantsList');
    if (!listElement || !this.currentState) return;

    listElement.innerHTML = '';

    this.currentState.participants.forEach((participant) => {
      const item = document.createElement('div');
      item.className = 'list-item';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'list-item-content';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'list-item-title';
      titleDiv.textContent = participant.name || participant.id;

      const subtitleDiv = document.createElement('div');
      subtitleDiv.className = 'list-item-subtitle';
      subtitleDiv.textContent = participant.role;

      contentDiv.appendChild(titleDiv);
      contentDiv.appendChild(subtitleDiv);
      item.appendChild(contentDiv);

      // Add action buttons for hosts
      if (this.currentState?.isHost && participant.id !== this.currentState?.currentUserId) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'list-item-actions';

        if (participant.role === 'participant') {
          const promoteBtn = document.createElement('button');
          promoteBtn.textContent = 'Promote';
          promoteBtn.className = 'btn btn-secondary btn-sm';
          promoteBtn.onclick = () => this.promoteParticipant(participant.id);
          actionsDiv.appendChild(promoteBtn);
        }

        const kickBtn = document.createElement('button');
        kickBtn.textContent = 'Kick';
        kickBtn.className = 'btn btn-danger btn-sm';
        kickBtn.onclick = () => this.kickParticipant(participant.id);
        actionsDiv.appendChild(kickBtn);

        item.appendChild(actionsDiv);
      }

      listElement.appendChild(item);
    });
  }

  private async sendPlayCommand(): Promise<void> {
    if (!this.currentState?.isHost) {
      throw new Error('Only the host can control playback');
    }

    if (!this.connectionStatus?.syncActive) {
      throw new Error('Sync engine is not active - please start a room first');
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_MESSAGE',
        syncMessage: {
          type: 'play',
          userId: this.currentState.currentUserId,
          timestamp: Date.now(),
          currentTime: 0, // Will be updated by sync engine
          paused: false,
          playbackRate: 1,
        },
      });

      if (response.success) {
        this.showSuccessMessage('Play command sent');
      } else {
        throw new Error(response.error || 'Failed to send play command');
      }
    } catch (error) {
      console.error('Error sending play command:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to send play command');
      }
    }
  }

  private async sendPauseCommand(): Promise<void> {
    if (!this.currentState?.isHost) {
      throw new Error('Only the host can control playback');
    }

    if (!this.connectionStatus?.syncActive) {
      throw new Error('Sync engine is not active - please start a room first');
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_MESSAGE',
        syncMessage: {
          type: 'pause',
          userId: this.currentState.currentUserId,
          timestamp: Date.now(),
          currentTime: 0, // Will be updated by sync engine
          paused: true,
          playbackRate: 1,
        },
      });

      if (response.success) {
        this.showSuccessMessage('Pause command sent');
      } else {
        throw new Error(response.error || 'Failed to send pause command');
      }
    } catch (error) {
      console.error('Error sending pause command:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to send pause command');
      }
    }
  }

  private async showTransferHostDialog(): Promise<void> {
    if (!this.currentState) return;

    const participants = this.currentState.participants.filter(
      (p) => p.id !== this.currentState!.currentUserId && p.role !== 'host'
    );

    if (participants.length === 0) {
      alert('No other participants to transfer host to');
      return;
    }

    const names = participants.map((p) => p.name || p.id);
    const choice = prompt(
      `Transfer host to:\n${names.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\nEnter number:`
    );

    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < participants.length) {
        await this.transferHost(participants[index].id);
      }
    }
  }

  private async transferHost(newHostId: string): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSFER_HOST',
        newHostId,
      });

      if (!response.success) {
        alert('Failed to transfer host: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error transferring host:', error);
      alert('Failed to transfer host');
    }
  }

  private async promoteParticipant(userId: string): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PROMOTE_PARTICIPANT',
        userId,
      });

      if (!response.success) {
        alert('Failed to promote participant: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error promoting participant:', error);
      alert('Failed to promote participant');
    }
  }

  private async kickParticipant(userId: string): Promise<void> {
    const participant = this.currentState?.participants.find((p) => p.id === userId);
    const name = participant?.name || participant?.id || 'participant';

    if (confirm(`Are you sure you want to kick ${name}?`)) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'KICK_PARTICIPANT',
          targetUserId: userId,
        });

        if (!response.success) {
          alert('Failed to kick participant: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error kicking participant:', error);
        alert('Failed to kick participant');
      }
    }
  }

  private async toggleRoomLock(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_ROOM_LOCK',
      });

      if (!response.success) {
        alert('Failed to toggle room lock: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error toggling room lock:', error);
      alert('Failed to toggle room lock');
    }
  }

  private openOptionsPage(): void {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  private handleServerMessage(message: any): void {
    const currentUserId = this.getCurrentUserId();

    switch (message.type) {
      case 'ROOM_CREATED':
        this.currentState = {
          roomId: message.roomId,
          participants: message.participants,
          isHost: message.hostId === currentUserId,
          currentUserId,
          chatMessages: [],
        };
        this.showRoomView();
        break;

      case 'ROOM_JOINED':
        this.currentState = {
          roomId: message.roomId,
          participants: message.participants,
          isHost: message.hostId === currentUserId,
          currentUserId,
          chatMessages: [],
        };
        this.showRoomView();
        break;

      case 'PARTICIPANT_JOINED':
        if (this.currentState) {
          this.currentState.participants = message.participants;
          this.updateParticipantsList();
          this.accessibilityIntegration.announceParticipantChange(
            'joined the room',
            message.participantName || 'A participant'
          );
        }
        break;
      case 'PARTICIPANT_LEFT':
        if (this.currentState) {
          this.currentState.participants = message.participants;
          this.updateParticipantsList();
          this.accessibilityIntegration.announceParticipantChange(
            'left the room',
            message.participantName || 'A participant'
          );
        }
        break;

      case 'HOST_TRANSFERRED':
        if (this.currentState) {
          this.currentState.isHost = message.newHostId === currentUserId;
          this.currentState.participants = message.participants;
          this.updateRoomInfo();
        }
        break;

      case 'PARTICIPANT_KICKED':
        if (this.currentState) {
          if (message.kickedUserId === currentUserId) {
            // We were kicked
            alert('You have been kicked from the room');
            this.currentState = null;
            this.showMainMenu();
          } else {
            // Someone else was kicked
            this.currentState.participants = message.participants;
            this.updateParticipantsList();
          }
        }
        break;

      case 'CHAT_MESSAGE':
        this.handleChatMessage(message);
        break;

      case 'REACTION':
        this.handleReaction(message);
        break;

      case 'ERROR':
        alert('Error: ' + message.error.message);
        break;
    }
  }

  private handleConnectionStateChange(state: ConnectionState): void {
    if (this.connectionStatus) {
      this.connectionStatus.connectionState = state;
      this.updateConnectionStatus();
    }
  }

  private getCurrentUserId(): string {
    return this.connectionStatus?.userId || this.currentState?.currentUserId || 'unknown_user';
  }

  private async sendChatMessage(): Promise<void> {
    const input = document.getElementById('chatInput') as HTMLInputElement;
    if (!input) {
      throw new Error('Chat input not found');
    }

    if (!this.currentState) {
      throw new Error('Not currently in a room');
    }

    const message = input.value.trim();
    if (!message) {
      throw new Error('Please enter a message');
    }

    if (message.length > 1000) {
      throw new Error('Message is too long (max 1000 characters)');
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEND_CHAT_MESSAGE',
        message,
      });

      if (response.success) {
        input.value = '';
        // Don't show success message for chat - it's too frequent
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to send message - please try again');
      }
    }
  }

  private async sendReaction(reactionType: ReactionType): Promise<void> {
    if (!this.currentState) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEND_REACTION',
        reactionType,
      });

      if (!response.success) {
        console.error('Failed to send reaction:', response.error);
      }
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  }

  /**
   * Start room synchronization and video detection
   */
  private async startRoomSync(): Promise<void> {
    if (!this.currentState) {
      throw new Error('Not currently in a room');
    }

    if (this.connectionStatus?.syncActive) {
      throw new Error('Room sync is already active');
    }

    try {
      // Get the current active tab
      const tabs = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
      if (!tabs.success || !tabs.tab) {
        throw new Error('No active tab found - please navigate to a video page');
      }

      const activeTab = tabs.tab;
      if (!activeTab.id) {
        throw new Error('Invalid tab - please refresh the page');
      }

      // Start sync engine in background
      const response = await chrome.runtime.sendMessage({
        type: 'START_SYNC',
        isHost: this.currentState.isHost,
        tabId: activeTab.id,
      });

      if (response.success) {
        // Update connection status to reflect sync is active
        if (this.connectionStatus) {
          this.connectionStatus.syncActive = true;
        }

        // Update UI to show sync is active
        this.updateSyncUI(true);
        this.showSuccessMessage('Room sync started - video detection active');
      } else {
        throw new Error(response.error || 'Failed to start room sync');
      }
    } catch (error) {
      console.error('Error starting room sync:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to start room sync - please try again');
      }
    }
  }

  /**
   * Stop room synchronization
   */
  private async stopRoomSync(): Promise<void> {
    if (!this.connectionStatus?.syncActive) {
      throw new Error('Room sync is not currently active');
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_SYNC',
      });

      if (response.success) {
        // Update connection status to reflect sync is inactive
        if (this.connectionStatus) {
          this.connectionStatus.syncActive = false;
        }

        // Update UI to show sync is inactive
        this.updateSyncUI(false);
        this.showSuccessMessage('Room sync stopped');
      } else {
        throw new Error(response.error || 'Failed to stop room sync');
      }
    } catch (error) {
      console.error('Error stopping room sync:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to stop room sync - please try again');
      }
    }
  }

  /**
   * Update UI elements based on sync status
   */
  private updateSyncUI(syncActive: boolean): void {
    const startButton = document.getElementById('startRoom');
    const stopButton = document.getElementById('stopRoom');

    if (startButton && stopButton) {
      if (syncActive) {
        startButton.classList.add('hidden');
        stopButton.classList.remove('hidden');
      } else {
        startButton.classList.remove('hidden');
        stopButton.classList.add('hidden');
      }
    }

    // Update button states since sync status affects host controls
    this.updateButtonStates();
  }

  private handleChatMessage(message: any): void {
    if (!this.currentState) return;

    const chatMessage: ChatMessage = {
      id: message.id || `${Date.now()}_${Math.random()}`,
      userId: message.userId,
      userName: this.getParticipantName(message.userId),
      message: message.message,
      timestamp: message.timestamp || Date.now(),
      type: 'text',
    };

    this.currentState.chatMessages.push(chatMessage);
    this.updateChatDisplay();
    this.accessibilityIntegration.announceChatMessage(
      chatMessage.userName || 'Unknown user',
      chatMessage.message
    );
  }

  private handleReaction(message: any): void {
    // Reactions are handled by the content script overlay
    // We could show a notification here if desired
    console.log('Reaction received:', message.reactionType, 'from', message.userId);
  }

  private getParticipantName(userId: string): string {
    if (!this.currentState) return userId;

    const participant = this.currentState.participants.find((p) => p.id === userId);
    return participant?.name ?? userId;
  }

  private updateChatDisplay(): void {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer || !this.currentState) return;

    messagesContainer.innerHTML = '';

    // Show recent messages (last 50)
    const recentMessages = this.currentState.chatMessages.slice(-50);

    recentMessages.forEach((message) => {
      const messageElement = document.createElement('div');
      messageElement.className = `chat-message ${message.type}`;

      if (message.type === 'system') {
        messageElement.innerHTML = `<div class="chat-message-text">${this.escapeHtml(message.message)}</div>`;
      } else {
        const time = new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        messageElement.innerHTML = `
          <div class="chat-message-header">
            ${this.escapeHtml(message.userName || message.userId)}
            <span class="chat-message-time">${time}</span>
          </div>
          <div class="chat-message-text">${this.escapeHtml(message.message)}</div>
        `;
      }

      messagesContainer.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private async loadPersistedRoomState(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ROOM_STATE' });
      if (response.success && response.roomState) {
        const roomState = response.roomState;

        // Convert persisted room state to popup room state
        this.currentState = {
          roomId: roomState.roomId,
          participants: roomState.participants || [],
          isHost: roomState.isHost,
          currentUserId: await this.getCurrentUserId(),
          chatMessages: [],
        };

        console.log('✅ Loaded persisted room state:', this.currentState);

        // If room is active, show room view
        if (roomState.isActive) {
          this.showRoomView();
        }
      }
    } catch (error) {
      console.error('Failed to load persisted room state:', error);
    }
  }

  private async pollConnectionStatus(): Promise<void> {
    // Poll connection status every 5 seconds
    setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' });
        if (response.success) {
          this.connectionStatus = response.status;
          this.updateConnectionStatus();
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 5000);
  }

  // Subtitle functionality
  private loadSubtitleFile(): void {
    const fileInput = document.getElementById('subtitleFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  private async handleSubtitleFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      // Read file content
      const content = await this.readFileAsText(file);

      // Send to content script for processing
      const response = await chrome.runtime.sendMessage({
        type: 'LOAD_SUBTITLE_FILE',
        file: {
          name: file.name,
          type: file.type,
          content: content,
        },
        userId: this.getCurrentUserId(),
      });

      if (response.success) {
        console.log('Subtitle file loaded successfully');
        this.updateSubtitleTracks();
      } else {
        alert('Failed to load subtitle file: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading subtitle file:', error);
      alert('Failed to load subtitle file');
    }

    // Clear the input
    input.value = '';
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'utf-8');
    });
  }

  private showOpenSubtitlesModal(): void {
    const modal = document.getElementById('openSubtitlesModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  private hideOpenSubtitlesModal(): void {
    const modal = document.getElementById('openSubtitlesModal');
    if (modal) {
      modal.classList.add('hidden');
    }

    // Clear search results
    const resultsContainer = document.getElementById('subtitleSearchResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
      resultsContainer.classList.add('hidden');
    }
  }

  private async performOpenSubtitlesSearch(): Promise<void> {
    const queryInput = document.getElementById('subtitleSearchQuery') as HTMLInputElement;
    const languageSelect = document.getElementById('subtitleLanguage') as HTMLSelectElement;

    const query = queryInput?.value?.trim();
    const language = languageSelect?.value || undefined;

    if (!query) {
      alert('Please enter a search query');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_OPENSUBTITLES',
        query,
        language,
      });

      if (response.success) {
        this.displayOpenSubtitlesResults(response.results);
      } else {
        alert('Search failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error searching OpenSubtitles:', error);
      alert('Search failed');
    }
  }

  private displayOpenSubtitlesResults(results: any[]): void {
    const resultsContainer = document.getElementById('subtitleSearchResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="empty-state">No subtitles found</div>';
    } else {
      results.forEach((result) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <div class="search-result-name">${this.escapeHtml(result.fileName)}</div>
          <div class="search-result-details">
            Language: ${result.language} | Downloads: ${result.downloadCount} | Rating: ${result.rating.toFixed(1)}
          </div>
        `;

        item.addEventListener('click', () => this.downloadOpenSubtitlesResult(result));
        resultsContainer.appendChild(item);
      });
    }

    resultsContainer.classList.remove('hidden');
  }

  private async downloadOpenSubtitlesResult(result: any): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_OPENSUBTITLES',
        result,
        userId: this.getCurrentUserId(),
      });

      if (response.success) {
        console.log('Subtitle downloaded successfully');
        this.hideOpenSubtitlesModal();
        this.updateSubtitleTracks();
      } else {
        alert('Download failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error downloading subtitle:', error);
      alert('Download failed');
    }
  }

  private async updateSubtitleTracks(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SUBTITLE_TRACKS',
        userId: this.getCurrentUserId(),
      });

      if (response.success) {
        this.displaySubtitleTracks(response.tracks);
      }
    } catch (error) {
      console.error('Error getting subtitle tracks:', error);
    }
  }

  private async showAdvancedSubtitleManager(): Promise<void> {
    const container = document.getElementById('advancedSubtitleManager');
    if (!container) return;

    // Initialize subtitle manager if not already done
    if (!this.subtitleManager) {
      // Create a mock subtitle engine for the popup
      // In a real implementation, this would communicate with the content script
      const mockSubtitleEngine = {
        getUserTracks: (userId: string) => [],
        getAvailableLanguages: (userId: string) => [],
        getUserPreferences: (userId: string) => ({
          userId,
          preferredLanguages: ['en'],
          defaultStyle: {
            fontSize: 16,
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            outlineColor: '#000000',
            outlineWidth: 1,
            position: 'bottom',
            alignment: 'center',
            opacity: 1,
            lineHeight: 1.4,
            maxWidth: 80,
            marginBottom: 20,
            borderRadius: 4,
            padding: 8,
            shadowBlur: 2,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
          enabledTrackIds: [],
          languageSettings: {},
          autoDownloadMissing: false,
          maxSimultaneousTracks: 3,
        }),
        updateUserPreferences: (userId: string, preferences: any) => {
          // Send to content script
          chrome.runtime.sendMessage({
            type: 'UPDATE_USER_PREFERENCES',
            userId,
            preferences,
          });
        },
        applySubtitleStyle: (element: HTMLElement, style: any) => {
          // Apply basic styling for preview
          element.style.cssText = `
            background: ${style.backgroundColor};
            color: ${style.color};
            padding: ${style.padding}px;
            border-radius: ${style.borderRadius}px;
            font-family: ${style.fontFamily};
            font-size: ${style.fontSize}px;
            opacity: ${style.opacity};
          `;
        },
        // Add other required methods as stubs
        removeTrack: (trackId: string) => {
          chrome.runtime.sendMessage({
            type: 'REMOVE_SUBTITLE_TRACK',
            trackId,
          });
        },
        toggleTrack: (trackId: string, enabled: boolean) => {
          chrome.runtime.sendMessage({
            type: 'TOGGLE_SUBTITLE_TRACK',
            trackId,
            enabled,
          });
        },
        updateTrackOffset: (trackId: string, offsetMs: number) => {
          chrome.runtime.sendMessage({
            type: 'UPDATE_SUBTITLE_OFFSET',
            trackId,
            offsetMs,
          });
        },
        updateTrackPriority: (trackId: string, priority: number) => {
          chrome.runtime.sendMessage({
            type: 'UPDATE_SUBTITLE_PRIORITY',
            trackId,
            priority,
          });
        },
        updateTrackStyle: (trackId: string, style: any) => {
          chrome.runtime.sendMessage({
            type: 'UPDATE_SUBTITLE_STYLE',
            trackId,
            style,
          });
        },
        setLanguagePreference: (userId: string, languages: string[]) => {
          chrome.runtime.sendMessage({
            type: 'SET_LANGUAGE_PREFERENCE',
            userId,
            languages,
          });
        },
        toggleLanguage: (userId: string, language: string, enabled: boolean) => {
          chrome.runtime.sendMessage({
            type: 'TOGGLE_LANGUAGE',
            userId,
            language,
            enabled,
          });
        },
        saveUserPreferences: (userId: string) => {
          return chrome.runtime.sendMessage({
            type: 'SAVE_USER_PREFERENCES',
            userId,
          });
        },
        loadUserPreferences: (userId: string) => {
          return chrome.runtime.sendMessage({
            type: 'LOAD_USER_PREFERENCES',
            userId,
          });
        },
        searchOpenSubtitles: (options: any) => {
          return chrome.runtime.sendMessage({
            type: 'SEARCH_OPENSUBTITLES',
            searchOptions: options,
          });
        },
        downloadFromOpenSubtitles: (result: any, userId: string) => {
          return chrome.runtime.sendMessage({
            type: 'DOWNLOAD_OPENSUBTITLES',
            result,
            userId,
          });
        },
        autoDownloadSubtitles: (userId: string, videoInfo: any) => {
          return chrome.runtime.sendMessage({
            type: 'AUTO_DOWNLOAD_SUBTITLES',
            userId,
            videoInfo,
          });
        },
      };

      this.subtitleManager = new SubtitleManager({
        userId: this.getCurrentUserId(),
        subtitleEngine: mockSubtitleEngine as any,
        container,
        onTrackAdded: (track) => {
          console.log('Track added:', track);
          this.updateSubtitleTracks();
        },
        onTrackRemoved: (trackId) => {
          console.log('Track removed:', trackId);
          this.updateSubtitleTracks();
        },
        onPreferencesChanged: (preferences) => {
          console.log('Preferences changed:', preferences);
        },
      });
    }

    this.subtitleManager.show();
  }

  private displaySubtitleTracks(tracks: any[]): void {
    const tracksContainer = document.getElementById('subtitleTracks');
    if (!tracksContainer) return;

    tracksContainer.innerHTML = '';

    if (tracks.length === 0) {
      tracksContainer.innerHTML = '<div class="empty-state">No subtitle tracks loaded</div>';
      return;
    }

    tracks.forEach((track) => {
      const trackElement = document.createElement('div');
      trackElement.className = 'list-item';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'list-item-content';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'list-item-title';
      titleDiv.textContent = track.fileName || 'Unknown';

      const subtitleDiv = document.createElement('div');
      subtitleDiv.className = 'list-item-subtitle';
      subtitleDiv.textContent = `${track.language} | ${track.source === 'opensubtitles' ? 'OpenSubtitles' : 'File'}`;

      contentDiv.appendChild(titleDiv);
      contentDiv.appendChild(subtitleDiv);

      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'list-item-actions';
      controlsDiv.style.display = 'flex';
      controlsDiv.style.alignItems = 'center';
      controlsDiv.style.gap = 'var(--space-2)';

      // Enable/disable checkbox
      const enableCheckbox = document.createElement('input');
      enableCheckbox.type = 'checkbox';
      enableCheckbox.checked = track.enabled;
      enableCheckbox.addEventListener('change', () => {
        this.toggleSubtitleTrack(track.id, enableCheckbox.checked);
      });

      // Offset control
      const offsetInput = document.createElement('input');
      offsetInput.type = 'number';
      offsetInput.className = 'form-input';
      offsetInput.style.width = '60px';
      offsetInput.style.fontSize = 'var(--font-size-xs)';
      offsetInput.value = (track.offset / 1000).toString(); // Convert ms to seconds
      offsetInput.step = '0.1';
      offsetInput.title = 'Offset in seconds';
      offsetInput.addEventListener('change', () => {
        const offsetMs = parseFloat(offsetInput.value) * 1000;
        this.updateSubtitleOffset(track.id, offsetMs);
      });

      // Remove button
      const removeButton = document.createElement('button');
      removeButton.textContent = '×';
      removeButton.className = 'btn btn-danger btn-sm';
      removeButton.style.minWidth = '32px';
      removeButton.addEventListener('click', () => {
        this.removeSubtitleTrack(track.id);
      });

      controlsDiv.appendChild(enableCheckbox);
      controlsDiv.appendChild(offsetInput);
      controlsDiv.appendChild(removeButton);

      trackElement.appendChild(contentDiv);
      trackElement.appendChild(controlsDiv);
      tracksContainer.appendChild(trackElement);
    });
  }

  private async toggleSubtitleTrack(trackId: string, enabled: boolean): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_SUBTITLE_TRACK',
        trackId,
        enabled,
      });
    } catch (error) {
      console.error('Error toggling subtitle track:', error);
    }
  }

  private async updateSubtitleOffset(trackId: string, offsetMs: number): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SUBTITLE_OFFSET',
        trackId,
        offsetMs,
      });
    } catch (error) {
      console.error('Error updating subtitle offset:', error);
    }
  }

  private async removeSubtitleTrack(trackId: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'REMOVE_SUBTITLE_TRACK',
        trackId,
      });
      this.updateSubtitleTracks();
    } catch (error) {
      console.error('Error removing subtitle track:', error);
    }
  }

  // Annotation functionality
  private initializeAnnotationToolbar(): void {
    const container = document.getElementById('annotationContainer');
    if (!container) return;

    // Clear existing toolbar
    container.innerHTML = '';

    this.annotationToolbar = new AnnotationToolbar(container, {
      onToolChange: (tool) => this.handleToolChange(tool),
      onLayerChange: (layerId) => this.handleLayerChange(layerId),
      onLayerVisibilityToggle: (layerId, visible) =>
        this.handleLayerVisibilityToggle(layerId, visible),
      onUndo: () => this.handleUndo(),
      onRedo: () => this.handleRedo(),
      onClear: () => this.handleClearAnnotations(),
      onCreateLayer: (name) => this.handleCreateLayer(name),
      onDeleteLayer: (layerId) => this.handleDeleteLayer(layerId),
    });

    console.log('Annotation toolbar initialized');
  }

  private async handleToolChange(tool: any): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'SET_ANNOTATION_TOOL',
        tool,
      });
    } catch (error) {
      console.error('Error setting annotation tool:', error);
    }
  }

  private async handleLayerChange(layerId: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'SET_CURRENT_ANNOTATION_LAYER',
        layerId,
      });
    } catch (error) {
      console.error('Error changing annotation layer:', error);
    }
  }

  private async handleLayerVisibilityToggle(layerId: string, visible: boolean): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'SET_ANNOTATION_LAYER_VISIBILITY',
        layerId,
        visible,
      });
    } catch (error) {
      console.error('Error toggling layer visibility:', error);
    }
  }

  private async handleUndo(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'UNDO_ANNOTATION',
      });
    } catch (error) {
      console.error('Error undoing annotation:', error);
    }
  }

  private async handleRedo(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'REDO_ANNOTATION',
      });
    } catch (error) {
      console.error('Error redoing annotation:', error);
    }
  }

  private async handleClearAnnotations(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_ALL_ANNOTATIONS',
      });
    } catch (error) {
      console.error('Error clearing annotations:', error);
    }
  }

  private async handleCreateLayer(name: string): Promise<void> {
    try {
      const layerId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      await chrome.runtime.sendMessage({
        type: 'CREATE_ANNOTATION_LAYER',
        layerId,
        layerName: name,
      });

      // Add to toolbar
      if (this.annotationToolbar) {
        this.annotationToolbar.addLayer(layerId, name);
      }
    } catch (error) {
      console.error('Error creating annotation layer:', error);
    }
  }

  private async handleDeleteLayer(layerId: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'DELETE_ANNOTATION_LAYER',
        layerId,
      });

      // Remove from toolbar
      if (this.annotationToolbar) {
        this.annotationToolbar.removeLayer(layerId);
      }
    } catch (error) {
      console.error('Error deleting annotation layer:', error);
    }
  }
}

// Initialize popup UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Watch Party popup loaded');
  new PopupUI();
});
