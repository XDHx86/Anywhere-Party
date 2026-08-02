/**
 * Accessibility Integration for Popup
 *
 * Integrates accessibility features into the popup UI
 */

import {
  AccessibilityManager,
  KeyboardNavigation,
  CaptionStyler,
  makeAccessible,
  announce,
} from '../../@core/accessibility';

export class PopupAccessibilityIntegration {
  private accessibilityManager: AccessibilityManager;
  private keyboardNavigation: KeyboardNavigation;
  private captionStyler: CaptionStyler;

  constructor() {
    this.accessibilityManager = new AccessibilityManager();
    this.keyboardNavigation = new KeyboardNavigation(document.body);
    this.captionStyler = new CaptionStyler();

    this.init();
  }

  /**
   * Initialize accessibility features
   */
  private init(): void {
    this.setupKeyboardShortcuts();
    this.enhanceExistingElements();
    this.setupStatusAnnouncements();
    this.setupFormValidation();
    this.setupModalAccessibility();
    this.addAccessibilityControls();
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    // Room management shortcuts
    this.accessibilityManager.addShortcut({
      key: 'c',
      altKey: true,
      action: 'create-room',
      description: 'Create new room',
    });

    this.accessibilityManager.addShortcut({
      key: 'j',
      altKey: true,
      action: 'join-room',
      description: 'Join room',
    });

    this.accessibilityManager.addShortcut({
      key: 's',
      altKey: true,
      action: 'open-settings',
      description: 'Open settings',
    });

    // Chat shortcuts
    this.accessibilityManager.addShortcut({
      key: 'Enter',
      action: 'send-message',
      description: 'Send chat message',
    });

    this.accessibilityManager.addShortcut({
      key: 'm',
      ctrlKey: true,
      action: 'focus-chat',
      description: 'Focus chat input',
    });

    // Caption shortcuts
    this.accessibilityManager.addShortcut({
      key: 'k',
      altKey: true,
      action: 'toggle-captions',
      description: 'Toggle caption styling',
    });

    // Handle shortcut execution
    document.addEventListener('keydown', (event) => {
      this.handleShortcut(event);
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    // Don't interfere with input fields unless it's a specific shortcut
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (event.key === 'Enter' && target.id === 'chatInput') {
        const sendButton = document.getElementById('sendMessage') as HTMLButtonElement;
        if (sendButton) {
          sendButton.click();
          event.preventDefault();
        }
      }
      return;
    }

    const shortcutKey = this.getShortcutKey(event);

    switch (shortcutKey) {
      case 'alt+c':
        this.activateCreateRoom();
        event.preventDefault();
        break;
      case 'alt+j':
        this.activateJoinRoom();
        event.preventDefault();
        break;
      case 'alt+s':
        this.activateSettings();
        event.preventDefault();
        break;
      case 'ctrl+m':
        this.focusChatInput();
        event.preventDefault();
        break;
      case 'alt+k':
        this.toggleCaptionStyling();
        event.preventDefault();
        break;
    }
  }

  /**
   * Get shortcut key string
   */
  private getShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Activate create room
   */
  private activateCreateRoom(): void {
    const createButton = document.getElementById('createRoom') as HTMLButtonElement;
    if (createButton && !createButton.disabled) {
      createButton.click();
      announce('Create room form opened');
    }
  }

  /**
   * Activate join room
   */
  private activateJoinRoom(): void {
    const joinButton = document.getElementById('joinRoom') as HTMLButtonElement;
    if (joinButton && !joinButton.disabled) {
      joinButton.click();
      announce('Join room form opened');
    }
  }

  /**
   * Activate settings
   */
  private activateSettings(): void {
    const settingsButton = document.getElementById('openOptions') as HTMLButtonElement;
    if (settingsButton && !settingsButton.disabled) {
      settingsButton.click();
      announce('Opening settings');
    }
  }

  /**
   * Focus chat input
   */
  private focusChatInput(): void {
    const chatInput = document.getElementById('chatInput') as HTMLInputElement;
    if (chatInput && !chatInput.disabled) {
      chatInput.focus();
      announce('Chat input focused');
    }
  }

  /**
   * Toggle caption styling
   */
  private toggleCaptionStyling(): void {
    const existingStyler = document.querySelector('.caption-styler');
    if (existingStyler) {
      existingStyler.remove();
      announce('Caption styling closed');
      return;
    }

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    this.captionStyler.createStylerUI(container);
    document.body.appendChild(container);
    announce('Caption styling opened');

    // Focus first control
    const firstControl = container.querySelector('button, input, select') as HTMLElement;
    if (firstControl) {
      firstControl.focus();
    }
  }

  /**
   * Enhance existing elements with accessibility features
   */
  private enhanceExistingElements(): void {
    // Enhance buttons with better descriptions
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
      if (!button.getAttribute('aria-label') && !button.getAttribute('aria-describedby')) {
        this.enhanceButton(button);
      }
    });

    // Enhance form inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      this.enhanceFormInput(input as HTMLInputElement);
    });

    // Enhance status indicators
    const statusElements = document.querySelectorAll('.status');
    statusElements.forEach((status) => {
      this.enhanceStatusElement(status as HTMLElement);
    });
  }

  /**
   * Enhance button accessibility
   */
  private enhanceButton(button: HTMLElement): void {
    const id = button.id;
    const text = button.textContent?.trim() || '';

    switch (id) {
      case 'createRoom':
        makeAccessible(button, {
          description: 'Create a new watch party room',
          shortcuts: ['Alt+C'],
        });
        break;
      case 'joinRoom':
        makeAccessible(button, {
          description: 'Join an existing watch party room',
          shortcuts: ['Alt+J'],
        });
        break;
      case 'openOptions':
        makeAccessible(button, {
          description: 'Open extension settings and preferences',
          shortcuts: ['Alt+S'],
        });
        break;
      case 'sendMessage':
        makeAccessible(button, {
          description: 'Send the typed message to all participants',
          shortcuts: ['Enter'],
        });
        break;
      case 'playButton':
        makeAccessible(button, {
          description: 'Play video for all participants',
        });
        break;
      case 'pauseButton':
        makeAccessible(button, {
          description: 'Pause video for all participants',
        });
        break;
      default:
        if (button.classList.contains('reaction-btn')) {
          const reaction = button.getAttribute('data-reaction');
          const emoji = button.textContent?.trim();
          makeAccessible(button, {
            label: `Send ${reaction?.replace('_', ' ')} reaction`,
            description: `Send ${emoji} reaction to all participants`,
          });
        }
        break;
    }
  }

  /**
   * Enhance form input accessibility
   */
  private enhanceFormInput(input: HTMLInputElement): void {
    const id = input.id;

    // Add required indicators
    if (input.hasAttribute('required') && !input.getAttribute('aria-required')) {
      input.setAttribute('aria-required', 'true');
    }

    // Add input format hints
    switch (id) {
      case 'roomName':
        if (!input.getAttribute('aria-describedby')) {
          const helpId = 'room-name-help';
          if (!document.getElementById(helpId)) {
            const help = document.createElement('div');
            help.id = helpId;
            help.className = 'sr-only';
            help.textContent = 'Enter a descriptive name for your watch party room';
            input.parentElement?.appendChild(help);
            input.setAttribute('aria-describedby', helpId);
          }
        }
        break;
      case 'joinRoomId':
        if (!input.getAttribute('aria-describedby')) {
          const helpId = 'join-id-help';
          if (!document.getElementById(helpId)) {
            const help = document.createElement('div');
            help.id = helpId;
            help.className = 'sr-only';
            help.textContent = 'Enter the room ID or paste the full invitation link';
            input.parentElement?.appendChild(help);
            input.setAttribute('aria-describedby', helpId);
          }
        }
        break;
      case 'chatInput':
        if (!input.getAttribute('aria-describedby')) {
          const helpId = 'chat-help';
          if (!document.getElementById(helpId)) {
            const help = document.createElement('div');
            help.id = helpId;
            help.className = 'sr-only';
            help.textContent =
              'Type your message and press Enter or click Send. Use Ctrl+M to focus this input.';
            input.parentElement?.appendChild(help);
            input.setAttribute('aria-describedby', helpId);
          }
        }
        break;
    }
  }

  /**
   * Enhance status element accessibility
   */
  private enhanceStatusElement(status: HTMLElement): void {
    if (!status.getAttribute('role')) {
      status.setAttribute('role', 'status');
    }

    if (!status.getAttribute('aria-live')) {
      status.setAttribute('aria-live', 'polite');
    }

    // Add screen reader text for status
    const existingSrText = status.querySelector('.sr-only');
    if (!existingSrText) {
      const srText = document.createElement('span');
      srText.className = 'sr-only';
      srText.textContent = 'Connection status: ';
      status.insertBefore(srText, status.firstChild);
    }
  }

  /**
   * Setup status announcements
   */
  private setupStatusAnnouncements(): void {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    // Observe status changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const statusText = statusElement.textContent?.trim() || '';
          if (statusText && statusText !== 'Not connected') {
            announce(`Status changed: ${statusText}`);
          }
        }
      });
    });

    observer.observe(statusElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  /**
   * Setup form validation
   */
  private setupFormValidation(): void {
    const forms = document.querySelectorAll('[role="form"]');
    forms.forEach((form) => {
      const inputs = form.querySelectorAll('input[required]');
      inputs.forEach((input) => {
        input.addEventListener('invalid', (event) => {
          const target = event.target as HTMLInputElement;
          const errorMessage = target.validationMessage;
          announce(`Validation error: ${errorMessage}`, 'assertive');
        });
      });
    });
  }

  /**
   * Setup modal accessibility
   */
  private setupModalAccessibility(): void {
    // Handle modal focus management
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      // Check if a modal is being opened
      if (target.id === 'searchOpenSubtitles' || target.id === 'advancedSubtitleSettings') {
        setTimeout(() => {
          const modal = document.querySelector('.modal:not(.hidden)') as HTMLElement;
          if (modal) {
            this.setupModalFocusManagement(modal);
          }
        }, 100);
      }
    });
  }

  /**
   * Setup modal focus management
   */
  private setupModalFocusManagement(modal: HTMLElement): void {
    // Set up focus trap
    const focusableElements = modal.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    // Focus first element
    focusableElements[0].focus();

    // Handle tab navigation within modal
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    });
  }

  /**
   * Add accessibility controls
   */
  private addAccessibilityControls(): void {
    const header = document.querySelector('.header');
    if (!header) return;

    const accessibilityControls = document.createElement('div');
    accessibilityControls.className = 'accessibility-controls';
    accessibilityControls.innerHTML = `
      <button id="toggleHighContrast" class="accessibility-btn" title="Toggle high contrast mode (Alt+C)">
        <span class="sr-only">Toggle high contrast mode</span>
        🎨
      </button>
      <button id="showKeyboardHelp" class="accessibility-btn" title="Show keyboard shortcuts (Alt+H)">
        <span class="sr-only">Show keyboard shortcuts</span>
        ⌨️
      </button>
      <button id="toggleCaptionStyling" class="accessibility-btn" title="Caption styling (Alt+K)">
        <span class="sr-only">Open caption styling</span>
        📝
      </button>
    `;

    // Add styles for accessibility controls
    const style = document.createElement('style');
    style.textContent = `
      .accessibility-controls {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      
      .accessibility-btn {
        width: 32px;
        height: 32px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .accessibility-btn:hover {
        background: #f0f0f0;
        border-color: #ccc;
      }
      
      .accessibility-btn:focus {
        outline: 2px solid #007cba;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);

    header.appendChild(accessibilityControls);

    // Add event listeners
    document.getElementById('toggleHighContrast')?.addEventListener('click', () => {
      this.accessibilityManager.toggleHighContrast();
    });

    document.getElementById('showKeyboardHelp')?.addEventListener('click', () => {
      this.accessibilityManager.announce('Opening keyboard shortcuts help');
      // The accessibility manager will handle showing the help
    });

    document.getElementById('toggleCaptionStyling')?.addEventListener('click', () => {
      this.toggleCaptionStyling();
    });
  }

  /**
   * Update accessibility for dynamic content
   */
  public updateForDynamicContent(): void {
    // Re-scan for new focusable elements
    this.keyboardNavigation.destroy();
    this.keyboardNavigation = new KeyboardNavigation(document.body);

    // Re-enhance any new elements
    this.enhanceExistingElements();
  }

  /**
   * Announce room state changes
   */
  public announceRoomStateChange(state: string, details?: string): void {
    const message = details ? `${state}. ${details}` : state;
    announce(message);
  }

  /**
   * Announce participant changes
   */
  public announceParticipantChange(action: string, participantName: string): void {
    announce(`${participantName} ${action}`);
  }

  /**
   * Announce chat message
   */
  public announceChatMessage(sender: string, message: string): void {
    // Don't announce every message to avoid spam, but announce when focused
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages && document.activeElement === chatMessages) {
      announce(`${sender}: ${message}`);
    }
  }

  /**
   * Destroy accessibility integration
   */
  public destroy(): void {
    this.accessibilityManager.destroy();
    this.keyboardNavigation.destroy();
    this.captionStyler.destroy();
  }
}
