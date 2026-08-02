/**
 * Options page entry point - Enhanced configuration management
 * Implements requirements 11.2, 11.3, 11.4, 11.5
 *
 * This file is kept for backward compatibility.
 * The new Material Design 3 options page is in options-react.tsx
 */

import { ExtensionConfig, AccessibilitySettings } from '../../@core/browser-bridge/types';
import { ValidationResult } from '../../@core/config/config-validator';

// Export new components and services
export { OptionsApp } from './OptionsApp';
export { SettingsService } from './services/settings-service';
export * from './components';
export * from './utils/validation';

interface ConfigFormData {
  SIGNALING_SERVER: string;
  SIGNALING_WS_PATH: string;
  LOCAL_DEV_MODE: boolean;
  ROOM_DEFAULT_PASSWORD: string;
  SYNC_TOLERANCE_MS: number;
  SYNC_TIMEOUT_MS: number;
  HEARTBEAT_INTERVAL_MS: number;
  ANNOTATION_RENDER_INTERVAL_MS: number;
  RECONNECT_INTERVAL_MS: number;
  ROOM_STATE_TTL_MS: number;
  VIDEO_DETECT_POLL_MS?: number;
  STUN_SERVERS: string[];
  TURN_SERVERS: any[];
  OPENSUBTITLES_KEY: string;
  DEFAULT_SUBTITLE_LANGS: string[];
  FEATURE_FLAGS: Record<string, boolean>;
  TELEMETRY_ENABLED: boolean;
  // Accessibility settings
  ACCESSIBILITY_SETTINGS?: AccessibilitySettings;
}

class EnhancedOptionsPage {
  private form: HTMLFormElement;
  private statusDiv: HTMLElement;
  private config: ExtensionConfig | null = null;
  private isDirty = false;
  private accessibilityVisible = false;

  constructor() {
    this.form = document.getElementById('configForm') as HTMLFormElement;
    this.statusDiv = document.getElementById('status') as HTMLElement;
    this.initialize();
  }

  private async initialize() {
    await this.loadCurrentConfig();
    this.setupEventListeners();
    this.setupDynamicSections();
    this.setupCollapsibleSections();
    this.setupAccessibilityToggle();
  }

  private async loadCurrentConfig() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (response.success) {
        this.config = response.config;
        this.populateForm(response.config);
      } else {
        this.showStatus(
          'Failed to load configuration: ' + (response.error || 'Unknown error'),
          'error'
        );
      }
    } catch (error) {
      this.showStatus('Error loading configuration', 'error');
      console.error('Error loading config:', error);
    }
  }

  private populateForm(config: ExtensionConfig) {
    // Server configuration
    this.setInputValue('signalingServer', config.SIGNALING_SERVER);
    this.setInputValue('signalingWsPath', config.SIGNALING_WS_PATH);
    this.setCheckboxValue('localDevMode', config.LOCAL_DEV_MODE);
    this.setInputValue('roomDefaultPassword', config.ROOM_DEFAULT_PASSWORD);

    // Synchronization settings
    this.setInputValue('syncTolerance', config.SYNC_TOLERANCE_MS.toString());
    this.setInputValue('syncTimeout', config.SYNC_TIMEOUT_MS.toString());
    this.setInputValue('heartbeatInterval', config.HEARTBEAT_INTERVAL_MS.toString());
    this.setInputValue('annotationRenderInterval', config.ANNOTATION_RENDER_INTERVAL_MS.toString());
    this.setInputValue('reconnectInterval', config.RECONNECT_INTERVAL_MS.toString());
    this.setInputValue('roomStateTtl', config.ROOM_STATE_TTL_MS.toString());
    this.setInputValue('videoDetectPoll', config.VIDEO_DETECT_POLL_MS?.toString() || '');

    // WebRTC configuration
    this.populateStunServers(config.STUN_SERVERS);
    this.populateTurnServers(config.TURN_SERVERS);

    // Subtitle configuration
    this.setInputValue('opensubtitlesKey', config.OPENSUBTITLES_KEY);
    this.populateSubtitleLanguages(config.DEFAULT_SUBTITLE_LANGS);

    // Feature flags
    Object.entries(config.FEATURE_FLAGS).forEach(([flag, enabled]) => {
      this.setCheckboxValue(flag.toLowerCase().replace('_', ''), enabled);
    });
    this.setCheckboxValue('telemetry', config.TELEMETRY_ENABLED);

    // Populate accessibility settings if they exist
    if (config.ACCESSIBILITY_SETTINGS) {
      this.populateAccessibilitySettings(config.ACCESSIBILITY_SETTINGS);
    }

    this.isDirty = false;
  }

  private populateAccessibilitySettings(settings: AccessibilitySettings) {
    this.setCheckboxValue('keyboardNavigation', settings.keyboardNavigationEnabled);
    this.setCheckboxValue('screenReaderSupport', settings.screenReaderEnabled);
    this.setCheckboxValue('highContrastMode', settings.highContrastMode);
    this.setCheckboxValue('reducedMotion', settings.reducedMotion);
    this.setCheckboxValue('audioDescriptions', settings.audioDescriptions);

    this.setSelectValue('fontSize', settings.fontSize);
    this.setSelectValue('focusIndicatorStyle', settings.focusIndicatorStyle);

    if (settings.customColors) {
      this.setInputValue('customBackground', settings.customColors.background);
      this.setInputValue('customForeground', settings.customColors.foreground);
      this.setInputValue('customAccent', settings.customColors.accent);
      this.setInputValue('customBorder', settings.customColors.border);
    }

    if (settings.captionStyling) {
      this.setSelectValue('captionFontSize', settings.captionStyling.fontSize);
      this.setInputValue('captionBackground', settings.captionStyling.backgroundColor);
      this.setInputValue('captionTextColor', settings.captionStyling.textColor);
      this.setCheckboxValue('captionOutline', settings.captionStyling.outline);
    }
  }

  private setSelectValue(id: string, value: string) {
    const element = document.getElementById(id) as HTMLSelectElement;
    if (element) {
      element.value = value;
    }
  }

  private setInputValue(id: string, value: string) {
    const element = document.getElementById(id) as HTMLInputElement;
    if (element) {
      element.value = value;
    }
  }

  private setCheckboxValue(id: string, checked: boolean) {
    const element = document.getElementById(id) as HTMLInputElement;
    if (element) {
      element.checked = checked;
    }
  }

  private populateStunServers(servers: string[]) {
    const container = document.getElementById('stunServersContainer');
    if (!container) return;

    container.innerHTML = '';
    servers.forEach((server, index) => {
      this.addStunServerRow(container, server, index);
    });
  }

  private populateTurnServers(servers: any[]) {
    const container = document.getElementById('turnServersContainer');
    if (!container) return;

    container.innerHTML = '';
    servers.forEach((server, index) => {
      this.addTurnServerRow(container, server, index);
    });
  }

  private populateSubtitleLanguages(languages: string[]) {
    const container = document.getElementById('subtitleLanguagesContainer');
    if (!container) return;

    container.innerHTML = '';
    languages.forEach((lang, index) => {
      this.addSubtitleLanguageRow(container, lang, index);
    });
  }

  private addStunServerRow(container: HTMLElement, server: string, index: number) {
    const row = document.createElement('div');
    row.className = 'server-item';
    row.innerHTML = `
      <input type="text" value="${server}" placeholder="stun:stun.example.com:19302" data-stun-index="${index}">
      <button type="button" class="btn-danger btn-small" onclick="this.parentElement.remove(); this.markDirty();">Remove</button>
    `;
    container.appendChild(row);
  }

  private addTurnServerRow(container: HTMLElement, server: any, index: number) {
    const urls = Array.isArray(server.urls) ? server.urls[0] : server.urls;
    const row = document.createElement('div');
    row.className = 'turn-server-item';
    row.innerHTML = `
      <div class="form-group">
        <label>URL</label>
        <input type="text" value="${urls}" placeholder="turn:turn.example.com:3478" data-turn-urls="${index}">
      </div>
      <div class="form-group">
        <label>Username</label>
        <input type="text" value="${server.username || ''}" placeholder="username" data-turn-username="${index}">
      </div>
      <div class="form-group">
        <label>Credential</label>
        <input type="password" value="${server.credential || ''}" placeholder="password" data-turn-credential="${index}">
      </div>
      <button type="button" class="btn-danger btn-small" onclick="this.parentElement.remove(); this.markDirty();">Remove TURN Server</button>
    `;
    container.appendChild(row);
  }

  private addSubtitleLanguageRow(container: HTMLElement, lang: string, index: number) {
    const row = document.createElement('div');
    row.className = 'language-item';

    const commonLanguages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
    ];

    const selectOptions = commonLanguages
      .map(
        ({ code, name }) =>
          `<option value="${code}" ${code === lang ? 'selected' : ''}>${name} (${code})</option>`
      )
      .join('');

    row.innerHTML = `
      <select data-lang-select="${index}">
        <option value="">Select language...</option>
        ${selectOptions}
      </select>
      <input type="text" value="${lang}" placeholder="Language code (e.g., en, es, fr)" 
             pattern="[a-z]{2}(-[A-Z]{2})?" data-lang-input="${index}">
      <button type="button" class="btn-danger btn-small" onclick="this.parentElement.remove(); this.markDirty();">Remove</button>
    `;
    container.appendChild(row);
  }

  private setupDynamicSections() {
    // Add STUN server button
    const addStunBtn = document.getElementById('addStunServer');
    if (addStunBtn) {
      addStunBtn.addEventListener('click', () => {
        const container = document.getElementById('stunServersContainer');
        if (container) {
          const index = container.children.length;
          this.addStunServerRow(container, 'stun:stun.example.com:19302', index);
          this.markDirty();
        }
      });
    }

    // Add TURN server button
    const addTurnBtn = document.getElementById('addTurnServer');
    if (addTurnBtn) {
      addTurnBtn.addEventListener('click', () => {
        const container = document.getElementById('turnServersContainer');
        if (container) {
          const index = container.children.length;
          this.addTurnServerRow(
            container,
            {
              urls: 'turn:turn.example.com:3478',
              username: '',
              credential: '',
            },
            index
          );
          this.markDirty();
        }
      });
    }

    // Add subtitle language button
    const addLangBtn = document.getElementById('addSubtitleLanguage');
    if (addLangBtn) {
      addLangBtn.addEventListener('click', () => {
        const container = document.getElementById('subtitleLanguagesContainer');
        if (container) {
          const index = container.children.length;
          this.addSubtitleLanguageRow(container, 'en', index);
          this.markDirty();
        }
      });
    }
  }

  private setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', this.handleSave.bind(this));

    // Import/Export buttons
    document.getElementById('exportBtn')?.addEventListener('click', this.handleExport.bind(this));
    document.getElementById('importBtn')?.addEventListener('click', this.handleImport.bind(this));
    document.getElementById('resetBtn')?.addEventListener('click', this.handleReset.bind(this));

    // File import
    document
      .getElementById('fileImport')
      ?.addEventListener('change', this.handleFileImport.bind(this));
    document.getElementById('importFromFile')?.addEventListener('click', () => {
      document.getElementById('fileImport')?.click();
    });

    // Download export
    document
      .getElementById('downloadExport')
      ?.addEventListener('click', this.handleDownloadExport.bind(this));

    // Mark form as dirty on any input change
    this.form.addEventListener('input', () => this.markDirty());
    this.form.addEventListener('change', () => this.markDirty());

    // Keyboard shortcut for accessibility toggle
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.toggleAccessibilitySection();
      }
    });
  }

  private setupCollapsibleSections() {
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');

    collapsibleHeaders.forEach((header) => {
      header.addEventListener('click', () => {
        const section = header.closest('.collapsible-section');
        const content = header.getAttribute('aria-controls');
        const contentElement = document.getElementById(content!);

        if (section && contentElement) {
          const isExpanded = section.classList.contains('expanded');

          // Toggle expanded state
          section.classList.toggle('expanded');
          header.setAttribute('aria-expanded', (!isExpanded).toString());

          // Update icon rotation
          const icon = header.querySelector('.collapsible-icon');
          if (icon) {
            icon.textContent = isExpanded ? '▼' : '▲';
          }
        }
      });
    });
  }

  private setupAccessibilityToggle() {
    const toggleButton = document.getElementById('accessibilityToggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.toggleAccessibilitySection();
      });
    }
  }

  private toggleAccessibilitySection() {
    this.accessibilityVisible = !this.accessibilityVisible;
    const accessibilitySection = document.querySelector('.accessibility-section');
    const toggleButton = document.getElementById('accessibilityToggle');

    if (accessibilitySection && toggleButton) {
      if (this.accessibilityVisible) {
        accessibilitySection.classList.add('visible');
        toggleButton.setAttribute('aria-pressed', 'true');
        toggleButton.title = 'Hide accessibility options (Alt+A)';

        // Scroll to accessibility section
        accessibilitySection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Expand the accessibility section
        const accessibilityHeader = accessibilitySection.querySelector(
          '.collapsible-header'
        ) as HTMLElement;
        if (accessibilityHeader && !accessibilitySection.classList.contains('expanded')) {
          accessibilityHeader.click();
        }
      } else {
        accessibilitySection.classList.remove('visible');
        toggleButton.setAttribute('aria-pressed', 'false');
        toggleButton.title = 'Show accessibility options (Alt+A)';
      }
    }
  }

  private markDirty() {
    this.isDirty = true;
    const saveBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }

  private collectFormData(): Partial<ExtensionConfig> {
    const formData = new FormData(this.form);

    // Collect STUN servers
    const stunServers: string[] = [];
    document.querySelectorAll('[data-stun-index]').forEach((input: any) => {
      if (input.value.trim()) {
        stunServers.push(input.value.trim());
      }
    });

    // Collect TURN servers
    const turnServers: any[] = [];
    const turnGroups = new Map();
    document
      .querySelectorAll('[data-turn-urls], [data-turn-username], [data-turn-credential]')
      .forEach((input: any) => {
        const index =
          input.dataset.turnUrls || input.dataset.turnUsername || input.dataset.turnCredential;
        if (!turnGroups.has(index)) {
          turnGroups.set(index, {});
        }
        const server = turnGroups.get(index);

        if (input.dataset.turnUrls !== undefined) server.urls = input.value;
        if (input.dataset.turnUsername !== undefined) server.username = input.value;
        if (input.dataset.turnCredential !== undefined) server.credential = input.value;
      });
    turnGroups.forEach((server) => {
      if (server.urls) turnServers.push(server);
    });

    // Collect subtitle languages
    const subtitleLangs: string[] = [];
    document.querySelectorAll('[data-lang-input]').forEach((input: any) => {
      if (input.value.trim()) {
        subtitleLangs.push(input.value.trim());
      }
    });

    const updates: Partial<ExtensionConfig> = {
      SIGNALING_SERVER: formData.get('SIGNALING_SERVER') as string,
      SIGNALING_WS_PATH: formData.get('SIGNALING_WS_PATH') as string,
      LOCAL_DEV_MODE: formData.has('LOCAL_DEV_MODE'),
      ROOM_DEFAULT_PASSWORD: formData.get('ROOM_DEFAULT_PASSWORD') as string,
      SYNC_TOLERANCE_MS: parseInt(formData.get('SYNC_TOLERANCE_MS') as string) || 300,
      SYNC_TIMEOUT_MS: parseInt(formData.get('SYNC_TIMEOUT_MS') as string) || 5000,
      HEARTBEAT_INTERVAL_MS: parseInt(formData.get('HEARTBEAT_INTERVAL_MS') as string) || 2000,
      ANNOTATION_RENDER_INTERVAL_MS:
        parseInt(formData.get('ANNOTATION_RENDER_INTERVAL_MS') as string) || 16,
      RECONNECT_INTERVAL_MS: parseInt(formData.get('RECONNECT_INTERVAL_MS') as string) || 5000,
      ROOM_STATE_TTL_MS: parseInt(formData.get('ROOM_STATE_TTL_MS') as string) || 300000,
      VIDEO_DETECT_POLL_MS: formData.get('VIDEO_DETECT_POLL_MS')
        ? parseInt(formData.get('VIDEO_DETECT_POLL_MS') as string)
        : undefined,
      STUN_SERVERS: stunServers,
      TURN_SERVERS: turnServers,
      OPENSUBTITLES_KEY: formData.get('OPENSUBTITLES_KEY') as string,
      DEFAULT_SUBTITLE_LANGS: subtitleLangs,
      TELEMETRY_ENABLED: formData.has('TELEMETRY_ENABLED'),
      FEATURE_FLAGS: {
        VOICE_CHAT: formData.has('VOICE_CHAT'),
        ANNOTATIONS: formData.has('ANNOTATIONS'),
        SUBTITLES: formData.has('SUBTITLES'),
        PLAYLISTS: formData.has('PLAYLISTS'),
        SCHEDULING: formData.has('SCHEDULING'),
        ADVANCED_ANNOTATIONS: formData.has('ADVANCED_ANNOTATIONS'),
        E2E_ENCRYPTION: formData.has('E2E_ENCRYPTION'),
      },
      ACCESSIBILITY_SETTINGS: {
        keyboardNavigationEnabled: formData.has('KEYBOARD_NAVIGATION_ENABLED'),
        screenReaderEnabled: formData.has('SCREEN_READER_ENABLED'),
        highContrastMode: formData.has('HIGH_CONTRAST_MODE'),
        fontSize:
          (formData.get('FONT_SIZE') as 'small' | 'medium' | 'large' | 'extra-large') || 'medium',
        reducedMotion: formData.has('REDUCED_MOTION'),
        focusIndicatorStyle:
          (formData.get('FOCUS_INDICATOR_STYLE') as 'default' | 'high-contrast' | 'custom') ||
          'default',
        customColors: {
          background: (formData.get('CUSTOM_BG_COLOR') as string) || '#ffffff',
          foreground: (formData.get('CUSTOM_FG_COLOR') as string) || '#000000',
          accent: (formData.get('CUSTOM_ACCENT_COLOR') as string) || '#007cba',
          border: (formData.get('CUSTOM_BORDER_COLOR') as string) || '#cccccc',
        },
        captionStyling: {
          fontSize:
            (formData.get('CAPTION_FONT_SIZE') as 'small' | 'medium' | 'large' | 'extra-large') ||
            'medium',
          backgroundColor: (formData.get('CAPTION_BG_COLOR') as string) || '#000000',
          textColor: (formData.get('CAPTION_TEXT_COLOR') as string) || '#ffffff',
          outline: formData.has('CAPTION_OUTLINE'),
        },
        audioDescriptions: formData.has('AUDIO_DESCRIPTIONS'),
      },
    };

    return updates;
  }

  private async handleSave(event: Event) {
    event.preventDefault();

    try {
      const updates = this.collectFormData();

      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_CONFIG',
        updates,
      });

      if (response.success) {
        this.showStatus('Settings saved successfully', 'success');
        this.isDirty = false;
        const saveBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (saveBtn) {
          saveBtn.disabled = true;
        }
      } else {
        this.showStatus('Failed to save settings: ' + (response.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      this.showStatus('Error saving settings', 'error');
      console.error('Error saving config:', error);
    }
  }

  private async handleExport() {
    try {
      const format = (document.getElementById('configFormat') as HTMLSelectElement).value as
        | 'json'
        | 'env'
        | 'ini';
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_CONFIG',
        format,
      });

      if (response.success) {
        (document.getElementById('configData') as HTMLTextAreaElement).value = response.data;
        this.showStatus('Configuration exported', 'success');
      } else {
        this.showStatus(
          'Failed to export configuration: ' + (response.error || 'Unknown error'),
          'error'
        );
      }
    } catch (error) {
      this.showStatus('Error exporting configuration', 'error');
      console.error('Error exporting config:', error);
    }
  }

  private async handleImport() {
    try {
      const format = (document.getElementById('configFormat') as HTMLSelectElement).value as
        | 'json'
        | 'env'
        | 'ini';
      const content = (document.getElementById('configData') as HTMLTextAreaElement).value;

      if (!content.trim()) {
        this.showStatus('Please paste configuration data to import', 'error');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_CONFIG',
        content,
        format,
      });

      if (response.success) {
        this.showStatus('Configuration imported successfully', 'success');

        // Show validation warnings if any
        if (response.validation && response.validation.warnings.length > 0) {
          const warningMessages = response.validation.warnings
            .map((w: any) => `${w.field}: ${w.message}`)
            .join('; ');
          this.showStatus(`Import successful with warnings: ${warningMessages}`, 'warning');
        }

        await this.loadCurrentConfig(); // Reload form with new config
      } else {
        let errorMessage = 'Failed to import configuration';
        if (response.validation && response.validation.errors.length > 0) {
          const errorMessages = response.validation.errors
            .map((e: any) => `${e.field}: ${e.message}`)
            .join('; ');
          errorMessage += `: ${errorMessages}`;
        } else if (response.error) {
          errorMessage += `: ${response.error}`;
        }
        this.showStatus(errorMessage, 'error');
      }
    } catch (error) {
      this.showStatus('Error importing configuration', 'error');
      console.error('Error importing config:', error);
    }
  }

  private async handleFileImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const content = await this.readFileAsText(file);
      (document.getElementById('configData') as HTMLTextAreaElement).value = content;

      // Auto-detect format from file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      const formatSelect = document.getElementById('configFormat') as HTMLSelectElement;
      if (extension === 'json') formatSelect.value = 'json';
      else if (extension === 'env') formatSelect.value = 'env';
      else if (extension === 'ini') formatSelect.value = 'ini';

      this.showStatus('File loaded. Click "Import Config" to apply.', 'success');
    } catch (error) {
      this.showStatus('Error reading file', 'error');
      console.error('Error reading file:', error);
    }

    // Clear the input
    input.value = '';
  }

  private handleDownloadExport() {
    const configData = (document.getElementById('configData') as HTMLTextAreaElement).value;
    const format = (document.getElementById('configFormat') as HTMLSelectElement).value;

    if (!configData) {
      this.showStatus('No configuration data to download. Export first.', 'error');
      return;
    }

    const blob = new Blob([configData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watch-party-config.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus('Configuration file downloaded', 'success');
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'utf-8');
    });
  }

  private async handleReset() {
    if (
      !confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')
    ) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: 'RESET_CONFIG' });

      if (response.success) {
        this.showStatus('Settings reset to defaults', 'success');
        await this.loadCurrentConfig();
      } else {
        this.showStatus(
          'Failed to reset settings: ' + (response.error || 'Unknown error'),
          'error'
        );
      }
    } catch (error) {
      this.showStatus('Error resetting settings', 'error');
      console.error('Error resetting config:', error);
    }
  }

  private showStatus(message: string, type: 'success' | 'error' | 'warning') {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.statusDiv.style.display = 'none';
    }, 5000);
  }
}

// Initialize enhanced options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new EnhancedOptionsPage();
});
