/**
 * Accessibility Manager
 *
 * Manages accessibility features including keyboard navigation,
 * screen reader support, high contrast mode, and customizable styling
 */

export interface AccessibilitySettings {
  keyboardNavigationEnabled: boolean;
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  customColors: {
    background: string;
    foreground: string;
    accent: string;
    border: string;
  };
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
  focusIndicatorStyle: 'default' | 'high-contrast' | 'custom';
  audioDescriptions: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: string;
  description: string;
}

export class AccessibilityManager {
  private settings: AccessibilitySettings;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private focusableElements: HTMLElement[] = [];
  private currentFocusIndex = -1;
  private announcer: HTMLElement | null = null;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.init();
  }

  /**
   * Initialize accessibility features
   */
  private init(): void {
    this.createScreenReaderAnnouncer();
    this.setupKeyboardNavigation();
    this.setupDefaultShortcuts();
    this.applyAccessibilitySettings();
    this.observeSystemPreferences();
  }

  /**
   * Get default accessibility settings
   */
  private getDefaultSettings(): AccessibilitySettings {
    return {
      keyboardNavigationEnabled: true,
      screenReaderEnabled: this.detectScreenReader(),
      highContrastMode: this.detectHighContrast(),
      customColors: {
        background: '#ffffff',
        foreground: '#000000',
        accent: '#007cba',
        border: '#cccccc',
      },
      fontSize: 'medium',
      reducedMotion: this.detectReducedMotion(),
      focusIndicatorStyle: 'default',
      audioDescriptions: false,
    };
  }

  /**
   * Detect if screen reader is active
   */
  private detectScreenReader(): boolean {
    // Check for common screen reader indicators
    return !!(
      (window as any).speechSynthesis ||
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver')
    );
  }

  /**
   * Detect high contrast preference
   */
  private detectHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  /**
   * Detect reduced motion preference
   */
  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Create screen reader announcer element
   */
  private createScreenReaderAnnouncer(): void {
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.announcer);
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('focusin', this.handleFocusIn.bind(this));

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden'],
    });
  }

  /**
   * Setup default keyboard shortcuts
   */
  private setupDefaultShortcuts(): void {
    this.addShortcut({
      key: 'Tab',
      action: 'navigate-next',
      description: 'Navigate to next element',
    });

    this.addShortcut({
      key: 'Tab',
      shiftKey: true,
      action: 'navigate-previous',
      description: 'Navigate to previous element',
    });

    this.addShortcut({
      key: 'Escape',
      action: 'close-modal',
      description: 'Close modal or dialog',
    });

    this.addShortcut({
      key: 'Enter',
      action: 'activate',
      description: 'Activate focused element',
    });

    this.addShortcut({
      key: ' ',
      action: 'activate',
      description: 'Activate focused element',
    });

    this.addShortcut({
      key: 'h',
      altKey: true,
      action: 'toggle-help',
      description: 'Toggle keyboard shortcuts help',
    });

    this.addShortcut({
      key: 'c',
      altKey: true,
      action: 'toggle-contrast',
      description: 'Toggle high contrast mode',
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.settings.keyboardNavigationEnabled) return;

    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut) {
      this.executeShortcut(shortcut, event);
    }
  }

  /**
   * Handle focus events
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && this.focusableElements.includes(target)) {
      this.currentFocusIndex = this.focusableElements.indexOf(target);
      this.announceElement(target);
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
   * Execute keyboard shortcut
   */
  private executeShortcut(shortcut: KeyboardShortcut, event: KeyboardEvent): void {
    switch (shortcut.action) {
      case 'navigate-next':
        this.navigateNext();
        event.preventDefault();
        break;
      case 'navigate-previous':
        this.navigatePrevious();
        event.preventDefault();
        break;
      case 'close-modal':
        this.closeModal();
        event.preventDefault();
        break;
      case 'activate':
        this.activateElement(event.target as HTMLElement);
        event.preventDefault();
        break;
      case 'toggle-help':
        this.toggleKeyboardHelp();
        event.preventDefault();
        break;
      case 'toggle-contrast':
        this.toggleHighContrast();
        event.preventDefault();
        break;
    }
  }

  /**
   * Navigate to next focusable element
   */
  private navigateNext(): void {
    this.updateFocusableElements();
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  /**
   * Navigate to previous focusable element
   */
  private navigatePrevious(): void {
    this.updateFocusableElements();
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex =
      this.currentFocusIndex <= 0 ? this.focusableElements.length - 1 : this.currentFocusIndex - 1;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  /**
   * Update list of focusable elements
   */
  private updateFocusableElements(): void {
    const selector = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      'a[href]:not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
      '[role="button"]:not([aria-disabled="true"]):not([aria-hidden="true"])',
      '[role="tab"]:not([aria-disabled="true"]):not([aria-hidden="true"])',
      '[role="menuitem"]:not([aria-disabled="true"]):not([aria-hidden="true"])',
    ].join(', ');

    this.focusableElements = Array.from(document.querySelectorAll(selector)).filter((el) =>
      this.isVisible(el as HTMLElement)
    ) as HTMLElement[];
  }

  /**
   * Check if element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetParent !== null
    );
  }

  /**
   * Close modal or dialog
   */
  private closeModal(): void {
    const modal = document.querySelector('.modal:not(.hidden), [role="dialog"]') as HTMLElement;
    if (modal) {
      const closeButton = modal.querySelector(
        '.modal-close, [aria-label*="close"], [aria-label*="Close"]'
      ) as HTMLElement;
      if (closeButton) {
        closeButton.click();
      } else {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
    }
  }

  /**
   * Activate focused element
   */
  private activateElement(element: HTMLElement): void {
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
      element.click();
    } else if (element.tagName === 'INPUT') {
      const input = element as HTMLInputElement;
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.click();
      }
    } else if (element.tagName === 'A') {
      element.click();
    }
  }

  /**
   * Announce element to screen reader
   */
  private announceElement(element: HTMLElement): void {
    if (!this.settings.screenReaderEnabled || !this.announcer) return;

    const announcement = this.getElementAnnouncement(element);
    if (announcement) {
      this.announcer.textContent = announcement;
    }
  }

  /**
   * Get announcement text for element
   */
  private getElementAnnouncement(element: HTMLElement): string {
    const label =
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.textContent?.trim() ||
      element.getAttribute('placeholder') ||
      '';

    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const state = this.getElementState(element);

    return `${label} ${role} ${state}`.trim();
  }

  /**
   * Get element state for announcement
   */
  private getElementState(element: HTMLElement): string {
    const states = [];

    if (element.getAttribute('aria-expanded') === 'true') {
      states.push('expanded');
    } else if (element.getAttribute('aria-expanded') === 'false') {
      states.push('collapsed');
    }

    if (element.getAttribute('aria-selected') === 'true') {
      states.push('selected');
    }

    if (element.getAttribute('aria-checked') === 'true') {
      states.push('checked');
    } else if (element.getAttribute('aria-checked') === 'false') {
      states.push('unchecked');
    }

    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
      states.push('disabled');
    }

    return states.join(', ');
  }

  /**
   * Apply accessibility settings
   */
  private applyAccessibilitySettings(): void {
    this.applyHighContrastMode();
    this.applyFontSize();
    this.applyReducedMotion();
    this.applyFocusIndicatorStyle();
    this.applyCustomColors();
  }

  /**
   * Apply high contrast mode
   */
  private applyHighContrastMode(): void {
    document.body.classList.toggle('high-contrast', this.settings.highContrastMode);
  }

  /**
   * Apply font size setting
   */
  private applyFontSize(): void {
    document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    document.body.classList.add(`font-${this.settings.fontSize}`);
  }

  /**
   * Apply reduced motion setting
   */
  private applyReducedMotion(): void {
    document.body.classList.toggle('reduced-motion', this.settings.reducedMotion);
  }

  /**
   * Apply focus indicator style
   */
  private applyFocusIndicatorStyle(): void {
    document.body.classList.remove('focus-default', 'focus-high-contrast', 'focus-custom');
    document.body.classList.add(`focus-${this.settings.focusIndicatorStyle}`);
  }

  /**
   * Apply custom colors
   */
  private applyCustomColors(): void {
    const root = document.documentElement;
    root.style.setProperty('--a11y-bg-color', this.settings.customColors.background);
    root.style.setProperty('--a11y-fg-color', this.settings.customColors.foreground);
    root.style.setProperty('--a11y-accent-color', this.settings.customColors.accent);
    root.style.setProperty('--a11y-border-color', this.settings.customColors.border);
  }

  /**
   * Observe system preferences changes
   */
  private observeSystemPreferences(): void {
    // High contrast preference
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.settings.highContrastMode = e.matches;
      this.applyHighContrastMode();
    });

    // Reduced motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.settings.reducedMotion = e.matches;
      this.applyReducedMotion();
    });
  }

  /**
   * Toggle high contrast mode
   */
  public toggleHighContrast(): void {
    this.settings.highContrastMode = !this.settings.highContrastMode;
    this.applyHighContrastMode();
    this.announce(`High contrast mode ${this.settings.highContrastMode ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle keyboard shortcuts help
   */
  private toggleKeyboardHelp(): void {
    const existingHelp = document.querySelector('.keyboard-help-modal');
    if (existingHelp) {
      existingHelp.remove();
      return;
    }

    this.showKeyboardHelp();
  }

  /**
   * Show keyboard shortcuts help
   */
  private showKeyboardHelp(): void {
    const modal = document.createElement('div');
    modal.className = 'keyboard-help-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'keyboard-help-title');
    modal.setAttribute('aria-modal', 'true');

    const shortcuts = Array.from(this.shortcuts.values());
    const shortcutsList = shortcuts
      .map((shortcut) => {
        const keys = [];
        if (shortcut.ctrlKey) keys.push('Ctrl');
        if (shortcut.altKey) keys.push('Alt');
        if (shortcut.shiftKey) keys.push('Shift');
        keys.push(shortcut.key);

        return `
        <tr>
          <td><kbd>${keys.join(' + ')}</kbd></td>
          <td>${shortcut.description}</td>
        </tr>
      `;
      })
      .join('');

    modal.innerHTML = `
      <div class="keyboard-help-content">
        <div class="keyboard-help-header">
          <h2 id="keyboard-help-title">Keyboard Shortcuts</h2>
          <button class="keyboard-help-close" aria-label="Close keyboard shortcuts help">&times;</button>
        </div>
        <div class="keyboard-help-body">
          <table>
            <thead>
              <tr>
                <th>Shortcut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${shortcutsList}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Focus the close button
    const closeButton = modal.querySelector('.keyboard-help-close') as HTMLElement;
    closeButton.focus();

    // Handle close
    closeButton.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  /**
   * Add keyboard shortcut
   */
  public addShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKeyFromShortcut(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Get shortcut key from shortcut object
   */
  private getShortcutKeyFromShortcut(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.shiftKey) parts.push('shift');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Remove keyboard shortcut
   */
  public removeShortcut(
    key: string,
    ctrlKey?: boolean,
    altKey?: boolean,
    shiftKey?: boolean
  ): void {
    const parts = [];
    if (ctrlKey) parts.push('ctrl');
    if (altKey) parts.push('alt');
    if (shiftKey) parts.push('shift');
    parts.push(key.toLowerCase());
    const shortcutKey = parts.join('+');
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Announce message to screen reader
   */
  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
  }

  /**
   * Update accessibility settings
   */
  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applyAccessibilitySettings();
  }

  /**
   * Get current accessibility settings
   */
  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Make element accessible
   */
  public makeElementAccessible(
    element: HTMLElement,
    options: {
      label?: string;
      description?: string;
      role?: string;
      focusable?: boolean;
      announceOnFocus?: boolean;
    }
  ): void {
    if (options.label) {
      element.setAttribute('aria-label', options.label);
    }

    if (options.description) {
      const descId = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const descElement = document.createElement('div');
      descElement.id = descId;
      descElement.className = 'sr-only';
      descElement.textContent = options.description;
      element.appendChild(descElement);
      element.setAttribute('aria-describedby', descId);
    }

    if (options.role) {
      element.setAttribute('role', options.role);
    }

    if (options.focusable !== false && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    if (options.announceOnFocus) {
      element.addEventListener('focus', () => {
        this.announceElement(element);
      });
    }
  }

  /**
   * Create accessible button
   */
  public createAccessibleButton(
    text: string,
    onClick: () => void,
    options: {
      description?: string;
      shortcut?: string;
      className?: string;
    } = {}
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = options.className || '';

    if (options.description) {
      button.setAttribute('aria-label', `${text}. ${options.description}`);
    }

    if (options.shortcut) {
      button.setAttribute('title', `${text} (${options.shortcut})`);
    }

    button.addEventListener('click', onClick);

    return button;
  }

  /**
   * Destroy accessibility manager
   */
  public destroy(): void {
    if (this.announcer) {
      this.announcer.remove();
    }

    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('focusin', this.handleFocusIn.bind(this));
  }
}
