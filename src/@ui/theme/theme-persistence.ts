/**
 * Theme Persistence Service
 * Handles saving and loading theme preferences across browser sessions
 * Requirements: 26.4, 28.4
 */

import { ThemeMode } from './types';
import { browserAPI } from '../utils/browser-api';

export interface ThemeSettings {
  mode: ThemeMode;
  customPrimaryColor?: string;
  customSecondaryColor?: string;
  enableCustomColors?: boolean;
  compactMode?: boolean;
  animationsEnabled?: boolean;
}

export class ThemePersistenceService {
  private static instance: ThemePersistenceService;
  private static readonly STORAGE_KEY = 'theme_settings';

  public static getInstance(): ThemePersistenceService {
    if (!ThemePersistenceService.instance) {
      ThemePersistenceService.instance = new ThemePersistenceService();
    }
    return ThemePersistenceService.instance;
  }

  // Load theme settings from storage
  async loadThemeSettings(): Promise<ThemeSettings> {
    try {
      const result = await browserAPI.storage.local.get([ThemePersistenceService.STORAGE_KEY]);

      // Check if result exists and has the expected structure
      if (result && typeof result === 'object' && ThemePersistenceService.STORAGE_KEY in result) {
        const stored = result[ThemePersistenceService.STORAGE_KEY];

        if (stored && typeof stored === 'object') {
          return {
            mode: stored.mode || 'auto',
            customPrimaryColor: stored.customPrimaryColor || '#6200EE',
            customSecondaryColor: stored.customSecondaryColor || '#03DAC6',
            enableCustomColors: stored.enableCustomColors || false,
            compactMode: stored.compactMode || false,
            animationsEnabled: stored.animationsEnabled !== false, // Default to true
          };
        }
      }

      return this.getDefaultThemeSettings();
    } catch (error) {
      console.error('Error loading theme settings:', error);
      return this.getDefaultThemeSettings();
    }
  }

  // Save theme settings to storage
  async saveThemeSettings(settings: ThemeSettings): Promise<void> {
    try {
      await browserAPI.storage.local.set({
        [ThemePersistenceService.STORAGE_KEY]: settings,
      });

      // Notify background script of theme change
      await browserAPI.runtime.sendMessage({
        type: 'THEME_CHANGED',
        settings,
      });
    } catch (error) {
      console.error('Error saving theme settings:', error);
      throw error;
    }
  }

  // Update specific theme setting
  async updateThemeSetting<K extends keyof ThemeSettings>(
    key: K,
    value: ThemeSettings[K]
  ): Promise<void> {
    const currentSettings = await this.loadThemeSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    await this.saveThemeSettings(updatedSettings);
  }

  // Reset theme settings to defaults
  async resetThemeSettings(): Promise<void> {
    const defaultSettings = this.getDefaultThemeSettings();
    await this.saveThemeSettings(defaultSettings);
  }

  // Get default theme settings
  private getDefaultThemeSettings(): ThemeSettings {
    return {
      mode: 'auto',
      customPrimaryColor: '#6200EE',
      customSecondaryColor: '#03DAC6',
      enableCustomColors: false,
      compactMode: false,
      animationsEnabled: true,
    };
  }

  // Listen for storage changes from other contexts
  onThemeSettingsChanged(callback: (settings: ThemeSettings) => void): () => void {
    const handleStorageChange = (changes: any) => {
      if (changes[ThemePersistenceService.STORAGE_KEY]) {
        const newSettings = changes[ThemePersistenceService.STORAGE_KEY].newValue;
        if (newSettings) {
          callback(newSettings);
        }
      }
    };

    // Chrome storage change listener
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }

    // Firefox storage change listener
    if (typeof browser !== 'undefined' && browser.storage) {
      browser.storage.onChanged.addListener(handleStorageChange);
      return () => browser.storage.onChanged.removeListener(handleStorageChange);
    }

    // Fallback - no cleanup needed
    return () => {};
  }
}

export const themePersistence = ThemePersistenceService.getInstance();
