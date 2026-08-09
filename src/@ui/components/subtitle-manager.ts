/**
 * Advanced subtitle management UI component
 */

import {
  SubtitleEngine,
  SubtitleTrack,
  SubtitleStyle,
  SubtitleUserPreferences,
} from '../../@core/subtitle-engine/types';

export interface SubtitleManagerConfig {
  userId: string;
  subtitleEngine: SubtitleEngine;
  container: HTMLElement;
  onTrackAdded?: (track: SubtitleTrack) => void;
  onTrackRemoved?: (trackId: string) => void;
  onPreferencesChanged?: (preferences: SubtitleUserPreferences) => void;
}

export class SubtitleManager {
  private config: SubtitleManagerConfig;
  private container: HTMLElement;
  private isVisible: boolean = false;

  constructor(config: SubtitleManagerConfig) {
    this.config = config;
    this.container = config.container;
    this.init();
  }

  /**
   * Initialize the subtitle manager UI
   */
  private init(): void {
    this.container.innerHTML = this.getHTML();
    this.attachEventListeners();
    this.updateUI();
  }

  /**
   * Show the subtitle manager
   */
  show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.updateUI();
  }

  /**
   * Hide the subtitle manager
   */
  hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update the UI with current data
   */
  private updateUI(): void {
    if (!this.isVisible) return;

    this.updateTracksList();
    this.updateLanguageSettings();
    this.updateStyleSettings();
  }

  /**
   * Update the tracks list
   */
  private updateTracksList(): void {
    const tracksList = this.container.querySelector('.subtitle-tracks-list') as HTMLElement;
    if (!tracksList) return;

    const tracks = this.config.subtitleEngine.getUserTracks(this.config.userId);

    tracksList.innerHTML = tracks
      .map(
        (track) => `
      <div class="subtitle-track-item" data-track-id="${track.id}">
        <div class="track-info">
          <span class="track-language">${track.language.toUpperCase()}</span>
          <span class="track-name">${track.fileName || 'Unknown'}</span>
          <span class="track-source">(${track.source})</span>
        </div>
        <div class="track-controls">
          <label class="track-enabled">
            <input type="checkbox" ${track.enabled ? 'checked' : ''} data-action="toggle-track">
            Enabled
          </label>
          <input type="number" class="track-priority" value="${track.priority}" min="1" max="10" data-action="update-priority">
          <input type="range" class="track-offset" value="${track.offset}" min="-5000" max="5000" step="100" data-action="update-offset">
          <span class="offset-value">${track.offset}ms</span>
          <button class="btn-remove-track" data-action="remove-track">Remove</button>
        </div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Update language settings
   */
  private updateLanguageSettings(): void {
    const languageSettings = this.container.querySelector('.language-settings') as HTMLElement;
    if (!languageSettings) return;

    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    const availableLanguages = this.config.subtitleEngine.getAvailableLanguages(this.config.userId);

    const preferredLanguagesHtml = preferences.preferredLanguages
      .map(
        (lang, index) => `
      <div class="preferred-language-item" data-language="${lang}">
        <span class="language-code">${lang.toUpperCase()}</span>
        <button class="btn-move-up" data-action="move-language-up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn-move-down" data-action="move-language-down" ${index === preferences.preferredLanguages.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn-remove-language" data-action="remove-preferred-language">×</button>
      </div>
    `
      )
      .join('');

    const availableLanguagesHtml = availableLanguages
      .filter((lang) => !preferences.preferredLanguages.includes(lang))
      .map(
        (lang) => `
        <option value="${lang}">${lang.toUpperCase()}</option>
      `
      )
      .join('');

    languageSettings.innerHTML = `
      <div class="preferred-languages">
        <h4>Preferred Languages (in order)</h4>
        <div class="preferred-languages-list">${preferredLanguagesHtml}</div>
        <div class="add-language">
          <select class="language-select">
            <option value="">Add language...</option>
            ${availableLanguagesHtml}
          </select>
          <button class="btn-add-language" data-action="add-preferred-language">Add</button>
        </div>
      </div>
      <div class="language-options">
        <label>
          <input type="checkbox" ${preferences.autoDownloadMissing ? 'checked' : ''} data-action="toggle-auto-download">
          Auto-download missing languages
        </label>
        <label>
          Max simultaneous tracks:
          <input type="number" value="${preferences.maxSimultaneousTracks}" min="1" max="5" data-action="update-max-tracks">
        </label>
      </div>
    `;
  }

  /**
   * Update style settings
   */
  private updateStyleSettings(): void {
    const styleSettings = this.container.querySelector('.style-settings') as HTMLElement;
    if (!styleSettings) return;

    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    const style = preferences.defaultStyle;

    styleSettings.innerHTML = `
      <div class="style-controls">
        <div class="style-group">
          <label>Font Size: <input type="range" min="12" max="32" value="${style.fontSize}" data-style="fontSize"> <span>${style.fontSize}px</span></label>
          <label>Font Family: 
            <select data-style="fontFamily">
              <option value="Arial, sans-serif" ${style.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
              <option value="Georgia, serif" ${style.fontFamily === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
              <option value="'Courier New', monospace" ${style.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
              <option value="Verdana, sans-serif" ${style.fontFamily === 'Verdana, sans-serif' ? 'selected' : ''}>Verdana</option>
            </select>
          </label>
        </div>
        <div class="style-group">
          <label>Text Color: <input type="color" value="${this.hexToColor(style.color)}" data-style="color"></label>
          <label>Background: <input type="color" value="${this.hexToColor(style.backgroundColor)}" data-style="backgroundColor"></label>
          <label>Outline: <input type="color" value="${this.hexToColor(style.outlineColor)}" data-style="outlineColor"></label>
          <label>Outline Width: <input type="range" min="0" max="3" step="0.5" value="${style.outlineWidth}" data-style="outlineWidth"> <span>${style.outlineWidth}px</span></label>
        </div>
        <div class="style-group">
          <label>Position: 
            <select data-style="position">
              <option value="bottom" ${style.position === 'bottom' ? 'selected' : ''}>Bottom</option>
              <option value="top" ${style.position === 'top' ? 'selected' : ''}>Top</option>
              <option value="center" ${style.position === 'center' ? 'selected' : ''}>Center</option>
            </select>
          </label>
          <label>Alignment: 
            <select data-style="alignment">
              <option value="left" ${style.alignment === 'left' ? 'selected' : ''}>Left</option>
              <option value="center" ${style.alignment === 'center' ? 'selected' : ''}>Center</option>
              <option value="right" ${style.alignment === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </label>
        </div>
        <div class="style-group">
          <label>Opacity: <input type="range" min="0.1" max="1" step="0.1" value="${style.opacity}" data-style="opacity"> <span>${Math.round(style.opacity * 100)}%</span></label>
          <label>Max Width: <input type="range" min="50" max="100" value="${style.maxWidth}" data-style="maxWidth"> <span>${style.maxWidth}%</span></label>
        </div>
        <div class="style-preview">
          <div class="preview-subtitle" id="subtitle-preview">Sample subtitle text</div>
        </div>
        <div class="style-actions">
          <button class="btn-reset-style" data-action="reset-style">Reset to Default</button>
          <button class="btn-save-style" data-action="save-style">Save Style</button>
        </div>
      </div>
    `;

    this.updateStylePreview();
  }

  /**
   * Update the style preview
   */
  private updateStylePreview(): void {
    const preview = this.container.querySelector('#subtitle-preview') as HTMLElement;
    if (!preview) return;

    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    this.config.subtitleEngine.applySubtitleStyle(preview, preferences.defaultStyle);
    preview.style.position = 'relative';
    preview.style.transform = 'none';
    preview.style.left = 'auto';
    preview.style.bottom = 'auto';
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    this.container.addEventListener('click', this.handleClick.bind(this));
    this.container.addEventListener('change', this.handleChange.bind(this));
    this.container.addEventListener('input', this.handleInput.bind(this));
  }

  /**
   * Handle click events
   */
  private handleClick(event: Event): void {
    const target = event.target as HTMLElement;
    const action = target.dataset.action;
    const trackId = target.closest('.subtitle-track-item')?.getAttribute('data-track-id');

    switch (action) {
      case 'remove-track':
        if (trackId) {
          this.config.subtitleEngine.removeTrack(trackId);
          this.config.onTrackRemoved?.(trackId);
          this.updateUI();
        }
        break;

      case 'add-preferred-language':
        this.addPreferredLanguage();
        break;

      case 'remove-preferred-language':
        this.removePreferredLanguage(target);
        break;

      case 'move-language-up':
        this.moveLanguage(target, -1);
        break;

      case 'move-language-down':
        this.moveLanguage(target, 1);
        break;

      case 'reset-style':
        this.resetStyle();
        break;

      case 'save-style':
        this.saveStyle();
        break;
    }
  }

  /**
   * Handle change events
   */
  private handleChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const action = target.dataset.action;
    const styleProperty = target.dataset.style;
    const trackId = target.closest('.subtitle-track-item')?.getAttribute('data-track-id');

    if (styleProperty) {
      this.updateStyleProperty(styleProperty, target.value);
      return;
    }

    switch (action) {
      case 'toggle-track':
        if (trackId) {
          this.config.subtitleEngine.toggleTrack(trackId, (target as HTMLInputElement).checked);
          this.updateUI();
        }
        break;

      case 'update-priority':
        if (trackId) {
          this.config.subtitleEngine.updateTrackPriority(trackId, parseInt(target.value));
          this.updateUI();
        }
        break;

      case 'toggle-auto-download':
        this.updatePreference('autoDownloadMissing', (target as HTMLInputElement).checked);
        break;

      case 'update-max-tracks':
        this.updatePreference('maxSimultaneousTracks', parseInt(target.value));
        break;
    }
  }

  /**
   * Handle input events (for range sliders)
   */
  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const action = target.dataset.action;
    const styleProperty = target.dataset.style;
    const trackId = target.closest('.subtitle-track-item')?.getAttribute('data-track-id');

    if (styleProperty) {
      this.updateStyleProperty(styleProperty, target.value);
      return;
    }

    switch (action) {
      case 'update-offset':
        if (trackId) {
          this.config.subtitleEngine.updateTrackOffset(trackId, parseInt(target.value));
          const offsetValue = target.parentElement?.querySelector('.offset-value');
          if (offsetValue) {
            offsetValue.textContent = `${target.value}ms`;
          }
        }
        break;
    }
  }

  /**
   * Update a style property and refresh preview
   */
  private updateStyleProperty(property: string, value: string): void {
    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    const style = { ...preferences.defaultStyle };

    // Convert value based on property type
    switch (property) {
      case 'fontSize':
      case 'outlineWidth':
      case 'lineHeight':
      case 'maxWidth':
      case 'marginBottom':
      case 'borderRadius':
      case 'padding':
      case 'shadowBlur':
        style[property] = parseFloat(value);
        break;
      case 'opacity':
        style[property] = parseFloat(value);
        break;
      default:
        switch (property) {
          case 'fontFamily':
          case 'color':
          case 'backgroundColor':
          case 'outlineColor':
          case 'shadowColor':
            style[property] = value;
            break;
          case 'position':
          case 'alignment':
            (style as Record<string, string | number>)[property] = value;
            break;
          default:
            break;
        }
    }

    preferences.defaultStyle = style;
    this.config.subtitleEngine.updateUserPreferences(this.config.userId, preferences);
    this.updateStylePreview();

    // Update range value displays
    const rangeInput = this.container.querySelector(
      `[data-style="${property}"]`
    ) as HTMLInputElement;
    if (rangeInput && rangeInput.type === 'range') {
      const valueSpan = rangeInput.parentElement?.querySelector('span');
      if (valueSpan) {
        const unit =
          property === 'opacity'
            ? '%'
            : property.includes('Width') || property.includes('Size')
              ? 'px'
              : property === 'maxWidth'
                ? '%'
                : '';
        const displayValue = property === 'opacity' ? Math.round(parseFloat(value) * 100) : value;
        valueSpan.textContent = `${displayValue}${unit}`;
      }
    }
  }

  /**
   * Update user preference
   */
  private updatePreference(key: keyof SubtitleUserPreferences, value: unknown): void {
    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    Object.assign(preferences, { [key]: value });
    this.config.subtitleEngine.updateUserPreferences(this.config.userId, preferences);
    this.config.onPreferencesChanged?.(preferences);
  }

  /**
   * Add preferred language
   */
  private addPreferredLanguage(): void {
    const select = this.container.querySelector('.language-select') as HTMLSelectElement;
    if (!select || !select.value) return;

    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    preferences.preferredLanguages.push(select.value);
    this.config.subtitleEngine.updateUserPreferences(this.config.userId, preferences);
    this.updateUI();
  }

  /**
   * Remove preferred language
   */
  private removePreferredLanguage(button: HTMLElement): void {
    const languageItem = button.closest('.preferred-language-item');
    const language = languageItem?.getAttribute('data-language');
    if (!language) return;

    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    preferences.preferredLanguages = preferences.preferredLanguages.filter(
      (lang) => lang !== language
    );
    this.config.subtitleEngine.updateUserPreferences(this.config.userId, preferences);
    this.updateUI();
  }

  /**
   * Move language in preference order
   */
  private moveLanguage(button: HTMLElement, direction: number): void {
    const languageItem = button.closest('.preferred-language-item');
    const language = languageItem?.getAttribute('data-language');
    if (!language) return;

    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    const currentIndex = preferences.preferredLanguages.indexOf(language);
    const newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < preferences.preferredLanguages.length) {
      preferences.preferredLanguages.splice(currentIndex, 1);
      preferences.preferredLanguages.splice(newIndex, 0, language);
      this.config.subtitleEngine.updateUserPreferences(this.config.userId, preferences);
      this.updateUI();
    }
  }

  /**
   * Reset style to default
   */
  private resetStyle(): void {
    const preferences = this.config.subtitleEngine.getUserPreferences(this.config.userId);
    preferences.defaultStyle = this.getDefaultStyle();
    this.config.subtitleEngine.updateUserPreferences(this.config.userId, preferences);
    this.updateUI();
  }

  /**
   * Save current style
   */
  private saveStyle(): void {
    this.config.subtitleEngine.saveUserPreferences(this.config.userId);
  }

  /**
   * Convert hex color to color input format
   */
  private hexToColor(hex: string): string {
    // Extract hex color from rgba/rgb strings
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
      return '#ffffff'; // Default fallback
    }
    return hex.startsWith('#') ? hex : '#ffffff';
  }

  /**
   * Get default style
   */
  private getDefaultStyle(): SubtitleStyle {
    return {
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
    };
  }

  /**
   * Get the HTML template
   */
  private getHTML(): string {
    return `
      <div class="subtitle-manager">
        <div class="subtitle-manager-header">
          <h3>Advanced Subtitle Settings</h3>
          <button class="btn-close" onclick="this.closest('.subtitle-manager').style.display='none'">×</button>
        </div>
        
        <div class="subtitle-manager-tabs">
          <button class="tab-button active" data-tab="tracks">Tracks</button>
          <button class="tab-button" data-tab="languages">Languages</button>
          <button class="tab-button" data-tab="style">Style</button>
          <button class="tab-button" data-tab="search">Search</button>
        </div>

        <div class="subtitle-manager-content">
          <div class="tab-content active" data-tab="tracks">
            <div class="subtitle-tracks-list"></div>
            <div class="tracks-actions">
              <input type="file" id="subtitle-file-input" accept=".srt,.vtt" style="display: none;">
              <button class="btn-add-file" onclick="document.getElementById('subtitle-file-input').click()">Add Subtitle File</button>
            </div>
          </div>

          <div class="tab-content" data-tab="languages">
            <div class="language-settings"></div>
          </div>

          <div class="tab-content" data-tab="style">
            <div class="style-settings"></div>
          </div>

          <div class="tab-content" data-tab="search">
            <div class="search-settings">
              <div class="search-form">
                <input type="text" class="search-query" placeholder="Search for subtitles...">
                <select class="search-language">
                  <option value="">Any language</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                </select>
                <button class="btn-search" data-action="search-subtitles">Search</button>
              </div>
              <div class="search-results"></div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .subtitle-manager {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          max-height: 80vh;
          background: #2a2a2a;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          color: white;
          font-family: Arial, sans-serif;
          z-index: 10001;
          overflow: hidden;
          display: none;
        }

        .subtitle-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1a1a1a;
          border-bottom: 1px solid #444;
        }

        .subtitle-manager-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .btn-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .subtitle-manager-tabs {
          display: flex;
          background: #333;
          border-bottom: 1px solid #444;
        }

        .tab-button {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: #ccc;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button:hover {
          background: #444;
          color: white;
        }

        .tab-button.active {
          background: #2a2a2a;
          color: white;
          border-bottom: 2px solid #007acc;
        }

        .subtitle-manager-content {
          max-height: 60vh;
          overflow-y: auto;
          padding: 20px;
        }

        .tab-content {
          display: none;
        }

        .tab-content.active {
          display: block;
        }

        .subtitle-track-item {
          background: #333;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .track-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .track-language {
          background: #007acc;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
        }

        .track-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .track-controls input[type="number"] {
          width: 60px;
        }

        .track-controls input[type="range"] {
          width: 100px;
        }

        .style-group {
          margin-bottom: 16px;
          padding: 12px;
          background: #333;
          border-radius: 6px;
        }

        .style-group label {
          display: block;
          margin-bottom: 8px;
        }

        .style-preview {
          margin: 16px 0;
          padding: 20px;
          background: #000;
          border-radius: 6px;
          text-align: center;
        }

        .preview-subtitle {
          display: inline-block;
        }

        .preferred-language-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #333;
          border-radius: 4px;
          margin-bottom: 4px;
        }

        .language-code {
          background: #007acc;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
        }

        .btn-move-up, .btn-move-down, .btn-remove-language {
          background: #555;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-move-up:hover, .btn-move-down:hover, .btn-remove-language:hover {
          background: #666;
        }

        .btn-move-up:disabled, .btn-move-down:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        button {
          background: #007acc;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        button:hover {
          background: #005a9e;
        }

        input, select {
          background: #444;
          border: 1px solid #666;
          color: white;
          padding: 6px 8px;
          border-radius: 4px;
        }

        input:focus, select:focus {
          outline: none;
          border-color: #007acc;
        }
      </style>
    `;
  }
}
