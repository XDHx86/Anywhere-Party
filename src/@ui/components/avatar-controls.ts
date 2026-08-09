/**
 * Avatar Controls UI Component
 * Provides interface for avatar customization and animation triggers
 */

import { AvatarManager } from '../../@core/avatar-overlay';
import { AVATAR_ANIMATIONS, AvatarAnimationKey } from '../../@core/avatar-overlay/types';

export interface AvatarControlsOptions {
  avatarManager: AvatarManager;
  onAvatarConfigChange?: (config: Record<string, string>) => void;
  onAnimationTrigger?: (animationKey: string) => void;
  onVisibilityToggle?: (visible: boolean) => void;
}

export class AvatarControls {
  private container: HTMLElement;
  private options: AvatarControlsOptions;
  private isVisible = true;

  constructor(container: HTMLElement, options: AvatarControlsOptions) {
    this.container = container;
    this.options = options;

    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="avatar-controls">
        <div class="avatar-section">
          <h3>Avatar Settings</h3>
          
          <div class="avatar-config">
            <div class="config-group">
              <label for="avatar-name">Display Name:</label>
              <input type="text" id="avatar-name" placeholder="Your name" maxlength="20">
            </div>
            
            <div class="config-group">
              <label for="avatar-image">Avatar Image URL:</label>
              <input type="url" id="avatar-image" placeholder="https://example.com/avatar.png">
            </div>
            
            <div class="config-group">
              <label>
                <input type="checkbox" id="avatar-visible" checked>
                Show my avatar
              </label>
            </div>
            
            <button id="update-avatar" class="btn-primary">Update Avatar</button>
          </div>
        </div>

        <div class="avatar-section">
          <h3>Quick Reactions</h3>
          
          <div class="reaction-grid">
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.HEART}" title="Heart">
              ❤️
            </button>
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.LAUGH}" title="Laugh">
              😂
            </button>
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.THUMBS_UP}" title="Thumbs Up">
              👍
            </button>
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.CLAP}" title="Clap">
              👏
            </button>
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.WAVE}" title="Wave">
              👋
            </button>
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.DANCE}" title="Dance">
              💃
            </button>
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.SURPRISED}" title="Surprised">
              😲
            </button>
            <button class="reaction-btn" data-animation="${AVATAR_ANIMATIONS.THINKING}" title="Thinking">
              🤔
            </button>
          </div>
        </div>

        <div class="avatar-section">
          <h3>Movement Controls</h3>
          
          <div class="movement-help">
            <p><strong>Keyboard:</strong> Use WASD or arrow keys to move your avatar</p>
            <p><strong>Mouse:</strong> Click and drag your avatar to move it</p>
            <p><strong>Touch:</strong> Tap and drag on mobile devices</p>
          </div>
        </div>

        <div class="avatar-section">
          <h3>Avatar Status</h3>
          
          <div id="avatar-status" class="status-display">
            <div class="status-item">
              <span class="status-label">Position:</span>
              <span id="avatar-position">--</span>
            </div>
            <div class="status-item">
              <span class="status-label">Voice:</span>
              <span id="voice-status">Inactive</span>
            </div>
            <div class="status-item">
              <span class="status-label">Participants:</span>
              <span id="participant-count">1</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
    this.updateStatus();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .avatar-controls {
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-height: 500px;
        overflow-y: auto;
      }

      .avatar-section {
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e9ecef;
      }

      .avatar-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .avatar-section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #495057;
      }

      .avatar-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .config-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .config-group label {
        font-size: 12px;
        font-weight: 500;
        color: #666;
      }

      .config-group input[type="text"],
      .config-group input[type="url"] {
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 14px;
      }

      .config-group input[type="checkbox"] {
        margin-right: 8px;
      }

      .btn-primary {
        padding: 10px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
      }

      .btn-primary:hover {
        background: #0056b3;
      }

      .reaction-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
      }

      .reaction-btn {
        width: 48px;
        height: 48px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .reaction-btn:hover {
        background: #f0f0f0;
        border-color: #007bff;
        transform: scale(1.05);
      }

      .reaction-btn:active {
        transform: scale(0.95);
      }

      .movement-help {
        background: #e3f2fd;
        padding: 12px;
        border-radius: 4px;
        border-left: 4px solid #2196f3;
      }

      .movement-help p {
        margin: 4px 0;
        font-size: 12px;
        color: #1565c0;
      }

      .movement-help strong {
        color: #0d47a1;
      }

      .status-display {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 4px;
      }

      .status-label {
        font-weight: 500;
        color: #666;
        font-size: 12px;
      }

      .status-item span:last-child {
        font-size: 12px;
        color: #333;
        font-family: monospace;
      }

      #voice-status.active {
        color: #28a745;
        font-weight: bold;
      }

      #voice-status.muted {
        color: #dc3545;
        font-weight: bold;
      }
    `;

    document.head.appendChild(style);
  }

  private attachEventListeners(): void {
    // Update avatar button
    this.container.querySelector('#update-avatar')?.addEventListener('click', () => {
      this.updateAvatarConfig();
    });

    // Visibility toggle
    this.container.querySelector('#avatar-visible')?.addEventListener('change', (e) => {
      const visible = (e.target as HTMLInputElement).checked;
      this.isVisible = visible;
      this.options.avatarManager.setVisibility(visible);
      this.options.onVisibilityToggle?.(visible);
    });

    // Reaction buttons
    this.container.querySelectorAll('.reaction-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const animationKey = target.dataset.animation as AvatarAnimationKey;

        if (animationKey) {
          this.triggerAnimation(animationKey);
        }
      });
    });

    // Auto-update status
    setInterval(() => {
      this.updateStatus();
    }, 1000);
  }

  private updateAvatarConfig(): void {
    const nameInput = this.container.querySelector('#avatar-name') as HTMLInputElement;
    const imageInput = this.container.querySelector('#avatar-image') as HTMLInputElement;

    const config = {
      displayName: nameInput.value.trim() || undefined,
      imageUrl: imageInput.value.trim() || undefined,
    };

    // Filter out empty values
    const filteredConfig = Object.fromEntries(
      Object.entries(config).filter(([_, value]) => value !== undefined && value !== '')
    ) as Record<string, string>;

    if (Object.keys(filteredConfig).length > 0) {
      this.options.avatarManager.updateConfig(filteredConfig);
      this.options.onAvatarConfigChange?.(filteredConfig);

      // Show feedback
      const button = this.container.querySelector('#update-avatar') as HTMLButtonElement;
      const originalText = button.textContent;
      button.textContent = 'Updated!';
      button.style.background = '#28a745';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#007bff';
      }, 2000);
    }
  }

  private triggerAnimation(animationKey: AvatarAnimationKey): void {
    this.options.avatarManager.triggerAnimation(animationKey, 2000);
    this.options.onAnimationTrigger?.(animationKey);

    // Visual feedback
    const button = this.container.querySelector(
      `[data-animation="${animationKey}"]`
    ) as HTMLElement;
    if (button) {
      button.style.transform = 'scale(1.2)';
      button.style.background = '#007bff';
      button.style.color = 'white';

      setTimeout(() => {
        button.style.transform = '';
        button.style.background = '';
        button.style.color = '';
      }, 300);
    }
  }

  private updateStatus(): void {
    const localAvatar = this.options.avatarManager.getLocalAvatar();
    const avatars = this.options.avatarManager.getAvatars();

    // Update position
    const positionElement = this.container.querySelector('#avatar-position');
    if (positionElement && localAvatar) {
      positionElement.textContent = `(${localAvatar.x.toFixed(2)}, ${localAvatar.y.toFixed(2)})`;
    }

    // Update voice status
    const voiceElement = this.container.querySelector('#voice-status');
    if (voiceElement && localAvatar) {
      voiceElement.className = '';
      if (localAvatar.muted) {
        voiceElement.textContent = 'Muted';
        voiceElement.classList.add('muted');
      } else if (localAvatar.speaking) {
        voiceElement.textContent = 'Speaking';
        voiceElement.classList.add('active');
      } else {
        voiceElement.textContent = 'Inactive';
      }
    }

    // Update participant count
    const countElement = this.container.querySelector('#participant-count');
    if (countElement) {
      countElement.textContent = avatars.length.toString();
    }
  }

  /**
   * Update voice activity from external source
   */
  public updateVoiceActivity(speaking: boolean, muted: boolean): void {
    this.options.avatarManager.setVoiceActivity(speaking, muted);
  }

  /**
   * Show chat bubble
   */
  public showChatBubble(message: string): void {
    this.options.avatarManager.showChatBubble(message, 4000);
  }

  /**
   * Get current avatar visibility
   */
  public isAvatarVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Set avatar configuration from external source
   */
  public setAvatarConfig(config: { displayName?: string; imageUrl?: string }): void {
    const nameInput = this.container.querySelector('#avatar-name') as HTMLInputElement;
    const imageInput = this.container.querySelector('#avatar-image') as HTMLInputElement;

    if (config.displayName && nameInput) {
      nameInput.value = config.displayName;
    }
    if (config.imageUrl && imageInput) {
      imageInput.value = config.imageUrl;
    }

    this.options.avatarManager.updateConfig(config);
  }
}
