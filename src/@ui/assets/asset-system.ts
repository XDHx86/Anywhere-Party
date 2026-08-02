/**
 * Asset System for Cross-Browser Icon Loading
 * Handles local font bundling and SVG fallbacks
 */

export interface AssetLoadResult {
  success: boolean;
  method: 'font' | 'svg' | 'fallback';
  error?: string;
}

export interface IconAsset {
  name: string;
  fontClass?: string;
  svgPath?: string;
  fallbackText?: string;
}

export class AssetSystem {
  private static instance: AssetSystem;
  private fontLoaded = false;
  private svgSprites: Map<string, string> = new Map();
  private iconRegistry: Map<string, IconAsset> = new Map();

  private constructor() {
    this.initializeIconRegistry();
  }

  public static getInstance(): AssetSystem {
    if (!AssetSystem.instance) {
      AssetSystem.instance = new AssetSystem();
    }
    return AssetSystem.instance;
  }

  /**
   * Initialize the icon registry with mappings
   */
  private initializeIconRegistry(): void {
    const icons: IconAsset[] = [
      // UI Icons
      { name: 'play', fontClass: 'fas fa-play', svgPath: 'M8 5v14l11-7z', fallbackText: '▶' },
      {
        name: 'pause',
        fontClass: 'fas fa-pause',
        svgPath: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
        fallbackText: '⏸',
      },
      { name: 'stop', fontClass: 'fas fa-stop', svgPath: 'M6 6h12v12H6z', fallbackText: '⏹' },
      {
        name: 'settings',
        fontClass: 'fas fa-cog',
        svgPath:
          'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
        fallbackText: '⚙',
      },
      {
        name: 'close',
        fontClass: 'fas fa-times',
        svgPath:
          'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
        fallbackText: '✕',
      },
      {
        name: 'menu',
        fontClass: 'fas fa-bars',
        svgPath: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
        fallbackText: '☰',
      },
      {
        name: 'users',
        fontClass: 'fas fa-users',
        svgPath:
          'M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4h2v-4h3v4h2v-4h3v4h2v-6H2v6h2zm14-3.5c-.83 0-1.5.67-1.5 1.5v4h3v-4c0-.83-.67-1.5-1.5-1.5z',
        fallbackText: '👥',
      },
      {
        name: 'user',
        fontClass: 'fas fa-user',
        svgPath:
          'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
        fallbackText: '👤',
      },
      {
        name: 'chat',
        fontClass: 'fas fa-comments',
        svgPath:
          'M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
        fallbackText: '💬',
      },
      {
        name: 'mic',
        fontClass: 'fas fa-microphone',
        svgPath:
          'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z',
        fallbackText: '🎤',
      },
      {
        name: 'mic-off',
        fontClass: 'fas fa-microphone-slash',
        svgPath:
          'M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z',
        fallbackText: '🎤🚫',
      },
      {
        name: 'video',
        fontClass: 'fas fa-video',
        svgPath:
          'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
        fallbackText: '📹',
      },
      {
        name: 'share',
        fontClass: 'fas fa-share',
        svgPath:
          'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.50-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
        fallbackText: '📤',
      },
      {
        name: 'copy',
        fontClass: 'fas fa-copy',
        svgPath:
          'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
        fallbackText: '📋',
      },

      // Reactions
      {
        name: 'heart',
        fontClass: 'fas fa-heart',
        svgPath:
          'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
        fallbackText: '❤',
      },
      {
        name: 'laugh',
        fontClass: 'fas fa-laugh',
        svgPath:
          'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8.5 9C9.33 9 10 8.33 10 7.5S9.33 6 8.5 6 7 6.67 7 7.5 7.67 9 8.5 9zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 6 15.5 6 14 6.67 14 7.5 14.67 9 15.5 9zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z',
        fallbackText: '😂',
      },
      {
        name: 'thumbs-up',
        fontClass: 'fas fa-thumbs-up',
        svgPath:
          'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z',
        fallbackText: '👍',
      },
      {
        name: 'thumbs-down',
        fontClass: 'fas fa-thumbs-down',
        svgPath:
          'M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z',
        fallbackText: '👎',
      },

      // Navigation
      {
        name: 'expand_more',
        fontClass: 'fas fa-chevron-down',
        svgPath: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
        fallbackText: '⌄',
      },
      {
        name: 'expand_less',
        fontClass: 'fas fa-chevron-up',
        svgPath: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
        fallbackText: '⌃',
      },
      {
        name: 'arrow-left',
        fontClass: 'fas fa-arrow-left',
        svgPath: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
        fallbackText: '←',
      },
      {
        name: 'arrow-right',
        fontClass: 'fas fa-arrow-right',
        svgPath: 'M4 11v2h12.17l-5.59 5.59L12 20l8-8-8-8-1.41 1.41L16.17 11H4z',
        fallbackText: '→',
      },

      // Status
      {
        name: 'check',
        fontClass: 'fas fa-check',
        svgPath: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
        fallbackText: '✓',
      },
      {
        name: 'warning',
        fontClass: 'fas fa-exclamation-triangle',
        svgPath: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
        fallbackText: '⚠',
      },
      {
        name: 'error',
        fontClass: 'fas fa-times-circle',
        svgPath:
          'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
        fallbackText: '✕',
      },
      {
        name: 'info',
        fontClass: 'fas fa-info-circle',
        svgPath:
          'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
        fallbackText: 'ℹ',
      },
      {
        name: 'success',
        fontClass: 'fas fa-check-circle',
        svgPath:
          'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
        fallbackText: '✓',
      },

      // Additional UI
      {
        name: 'key',
        fontClass: 'fas fa-key',
        svgPath:
          'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
        fallbackText: '🔑',
      },
      {
        name: 'accessibility',
        fontClass: 'fas fa-universal-access',
        svgPath:
          'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z',
        fallbackText: '♿',
      },
      {
        name: 'palette',
        fontClass: 'fas fa-palette',
        svgPath:
          'M12 3c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99a1.5 1.5 0 0 1 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z',
        fallbackText: '🎨',
      },
      {
        name: 'download',
        fontClass: 'fas fa-download',
        svgPath: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
        fallbackText: '⬇',
      },
      {
        name: 'save',
        fontClass: 'fas fa-save',
        svgPath:
          'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
        fallbackText: '💾',
      },
      {
        name: 'restore',
        fontClass: 'fas fa-undo',
        svgPath:
          'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
        fallbackText: '↶',
      },
      {
        name: 'refresh',
        fontClass: 'fas fa-sync',
        svgPath:
          'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
        fallbackText: '↻',
      },
    ];

    icons.forEach((icon) => {
      this.iconRegistry.set(icon.name, icon);
    });
  }

  /**
   * Load icon font from local bundle
   */
  public async loadIconFont(): Promise<AssetLoadResult> {
    if (this.fontLoaded) {
      return { success: true, method: 'font' };
    }

    try {
      // Check if Font Awesome is already loaded
      if (this.isFontAwesomeAvailable()) {
        this.fontLoaded = true;
        return { success: true, method: 'font' };
      }

      // Load local Font Awesome bundle
      const fontAwesomeCSS = await this.loadLocalFontAwesome();
      if (fontAwesomeCSS) {
        return { success: true, method: 'font' };
      }

      return { success: false, method: 'font', error: 'Font loading failed' };
    } catch (error) {
      return {
        success: false,
        method: 'font',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if Font Awesome is available
   */
  private isFontAwesomeAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    // Check if Font Awesome CSS is loaded
    const stylesheets = Array.from(document.styleSheets);
    const hasFontAwesome = stylesheets.some((sheet) => {
      try {
        return (
          sheet.href && (sheet.href.includes('font-awesome') || sheet.href.includes('fontawesome'))
        );
      } catch (e) {
        return false;
      }
    });

    if (hasFontAwesome) return true;

    // Check if Font Awesome fonts are loaded
    try {
      const testElement = document.createElement('span');
      testElement.className = 'fas fa-home';
      testElement.style.fontFamily = '"Font Awesome 6 Free"';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      document.body.appendChild(testElement);

      const computedStyle = window.getComputedStyle(testElement);
      const fontFamily = computedStyle.fontFamily;

      document.body.removeChild(testElement);

      return fontFamily.includes('Font Awesome');
    } catch (e) {
      return false;
    }
  }

  /**
   * Load local Font Awesome bundle
   */
  private async loadLocalFontAwesome(): Promise<boolean> {
    try {
      // Check if chrome.runtime is available
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return false;
      }

      // Check if already loaded
      if (this.fontLoaded) {
        return true;
      }

      // Create and inject Font Awesome CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('assets/fonts/fontawesome/css/all.min.css');

      return new Promise((resolve) => {
        let resolved = false;

        const resolveOnce = (result: boolean) => {
          if (!resolved) {
            resolved = true;
            if (result) {
              this.fontLoaded = true;
            }
            resolve(result);
          }
        };

        link.onload = () => resolveOnce(true);
        link.onerror = () => resolveOnce(false);

        document.head.appendChild(link);

        // Shorter timeout for tests
        const timeout =
          typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 100 : 3000;
        setTimeout(() => resolveOnce(false), timeout);
      });
    } catch (error) {
      console.warn('Failed to load local Font Awesome:', error);
      return false;
    }
  }

  /**
   * Get SVG fallback for an icon
   */
  public getSVGFallback(iconName: string): string | null {
    const icon = this.iconRegistry.get(iconName);
    if (!icon?.svgPath) return null;

    // Try to use SVG sprite first if chrome.runtime is available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const spriteUrl = chrome.runtime.getURL('assets/icons/sprite.svg');
      const spriteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <use href="${spriteUrl}#icon-${iconName}"/>
      </svg>`;
      return spriteIcon;
    }

    // Fallback to inline SVG
    const inlineIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="${icon.svgPath}"/>
    </svg>`;

    return inlineIcon;
  }

  /**
   * Get text fallback for an icon
   */
  public getTextFallback(iconName: string): string {
    const icon = this.iconRegistry.get(iconName);
    return icon?.fallbackText || '?';
  }

  /**
   * Get Font Awesome class for an icon
   */
  public getFontAwesomeClass(iconName: string): string | null {
    const icon = this.iconRegistry.get(iconName);
    return icon?.fontClass || null;
  }

  /**
   * Load an icon with fallback chain
   */
  public async loadIcon(iconName: string): Promise<AssetLoadResult> {
    // Try font first
    const fontResult = await this.loadIconFont();
    if (fontResult.success && this.getFontAwesomeClass(iconName)) {
      return { success: true, method: 'font' };
    }

    // Try SVG fallback
    const svgPath = this.getSVGFallback(iconName);
    if (svgPath) {
      return { success: true, method: 'svg' };
    }

    // Use text fallback
    return { success: true, method: 'fallback' };
  }

  /**
   * Validate all asset paths during build
   */
  public validateAssetPaths(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    // Check if chrome.runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return { valid: false, missing: ['chrome.runtime not available'] };
    }

    // Check if asset manifest exists
    try {
      const assetManifestUrl = chrome.runtime.getURL('assets/asset-manifest.json');
      fetch(assetManifestUrl)
        .then((response) => response.json())
        .then((manifest) => {
          // Validate each asset path
          Object.values(manifest.assets).forEach((category: any) => {
            Object.values(category).forEach((asset: any) => {
              if (asset.path) {
                const assetUrl = chrome.runtime.getURL(`assets/${asset.path}`);
                fetch(assetUrl, { method: 'HEAD' }).catch(() => missing.push(asset.path));
              }
            });
          });
        })
        .catch(() => missing.push('asset-manifest.json'));
    } catch (error) {
      missing.push('asset-manifest.json');
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Preload critical assets
   */
  public async preloadCriticalAssets(): Promise<void> {
    const criticalIcons = ['play', 'pause', 'settings', 'users', 'chat', 'mic'];

    // Preload font (with timeout for tests)
    const fontPromise = this.loadIconFont();
    const timeout = typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 100 : 3000;

    try {
      await Promise.race([fontPromise, new Promise((resolve) => setTimeout(resolve, timeout))]);
    } catch (error) {
      // Continue with SVG fallbacks even if font loading fails
    }

    // Preload critical SVG fallbacks
    criticalIcons.forEach((iconName) => {
      const svg = this.getSVGFallback(iconName);
      if (svg && typeof document !== 'undefined') {
        try {
          // Create a hidden element to trigger SVG parsing
          const div = document.createElement('div');
          div.innerHTML = svg;
          div.style.display = 'none';
          document.body.appendChild(div);

          // Clean up immediately in tests, delayed in production
          const cleanupDelay =
            typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 10 : 100;
          setTimeout(() => {
            try {
              document.body.removeChild(div);
            } catch (e) {
              // Element might already be removed
            }
          }, cleanupDelay);
        } catch (error) {
          // Continue if DOM manipulation fails
        }
      }
    });
  }
}

// Export singleton instance
export const assetSystem = AssetSystem.getInstance();
