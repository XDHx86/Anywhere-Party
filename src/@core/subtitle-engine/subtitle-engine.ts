/**
 * Main subtitle engine implementation
 */

import {
  SubtitleEngine,
  SubtitleTrack,
  SubtitleCue,
  SubtitleValidationResult,
  OpenSubtitlesSearchResult,
  SubtitleEngineConfig,
  SubtitleStyle,
  SubtitleUserPreferences,
  SubtitleSearchOptions,
} from './types';
import { SubtitleParser } from './subtitle-parser';
import { OpenSubtitlesClient } from './opensubtitles-client';

export class SubtitleEngineImpl implements SubtitleEngine {
  private tracks: Map<string, SubtitleTrack> = new Map();
  private parsedCues: Map<string, SubtitleCue[]> = new Map();
  private userPreferences: Map<string, SubtitleUserPreferences> = new Map();
  private openSubtitlesClient: OpenSubtitlesClient | null = null;
  private config: SubtitleEngineConfig;

  constructor(config: SubtitleEngineConfig) {
    // Set defaults for missing properties
    this.config = {
      maxFileSizeBytes: config.maxFileSizeBytes ?? 5 * 1024 * 1024, // 5MB default
      allowedFormats: config.allowedFormats ?? ['.srt', '.vtt'],
      sanitizeHtml: config.sanitizeHtml ?? true,
      defaultLanguages: config.defaultLanguages ?? ['en'],
      openSubtitlesApiKey: config.openSubtitlesApiKey,
      maxTracksPerUser: config.maxTracksPerUser ?? 5,
      enableMultipleLanguages: config.enableMultipleLanguages ?? true,
      defaultStyle: config.defaultStyle ?? {
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
    };

    if (this.config.openSubtitlesApiKey) {
      this.openSubtitlesClient = new OpenSubtitlesClient(this.config.openSubtitlesApiKey);
    }
  }

  /**
   * Load subtitle file from user upload
   */
  async loadSubtitleFile(file: File, userId: string): Promise<SubtitleTrack> {
    // Validate file size
    if (file.size > this.config.maxFileSizeBytes) {
      throw new Error(
        `File size (${Math.round(file.size / 1024)}KB) exceeds maximum allowed size (${Math.round(this.config.maxFileSizeBytes / 1024)}KB)`
      );
    }

    // Validate file extension
    const fileExtension = this.getFileExtension(file.name);
    if (!this.config.allowedFormats.includes(fileExtension)) {
      throw new Error(
        `File format ${fileExtension} not supported. Allowed formats: ${this.config.allowedFormats.join(', ')}`
      );
    }

    // Read file content
    const content = await this.readFileContent(file);

    // Validate content
    const validation = this.validateSubtitleContent(content);
    if (!validation.isValid) {
      throw new Error(`Invalid subtitle file: ${validation.errors.join(', ')}`);
    }

    // Check user track limit
    const userTracks = this.getUserTracks(userId);
    if (userTracks.length >= this.config.maxTracksPerUser) {
      throw new Error(
        `Maximum number of subtitle tracks (${this.config.maxTracksPerUser}) reached for user`
      );
    }

    const language =
      this.detectLanguageFromFilename(file.name) || this.config.defaultLanguages[0] || 'en';

    // Create track
    const track: SubtitleTrack = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      language,
      source: 'file',
      content,
      offset: 0,
      enabled: true,
      fileName: file.name,
      createdAt: new Date(),
      priority: userTracks.length + 1,
      style: this.getUserPreferences(userId).defaultStyle,
    };

    this.addTrack(track);
    return track;
  }

  /**
   * Parse subtitle content into cues
   */
  parseSubtitleContent(content: string, format: 'srt' | 'vtt'): SubtitleCue[] {
    try {
      return format === 'srt' ? SubtitleParser.parseSRT(content) : SubtitleParser.parseVTT(content);
    } catch (error) {
      throw new Error(
        `Failed to parse ${format.toUpperCase()} content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate subtitle content
   */
  validateSubtitleContent(content: string): SubtitleValidationResult {
    return SubtitleParser.validateSubtitleContent(content);
  }

  /**
   * Add a subtitle track
   */
  addTrack(track: SubtitleTrack): void {
    this.tracks.set(track.id, track);

    // Parse and cache cues
    const validation = this.validateSubtitleContent(track.content);
    if (validation.isValid && validation.format) {
      try {
        const cues = this.parseSubtitleContent(track.content, validation.format);
        this.parsedCues.set(track.id, cues);
      } catch (error) {
        console.warn(`Failed to parse cues for track ${track.id}:`, error);
      }
    }
  }

  /**
   * Remove a subtitle track
   */
  removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
    this.parsedCues.delete(trackId);
  }

  /**
   * Get a specific subtitle track
   */
  getTrack(trackId: string): SubtitleTrack | null {
    return this.tracks.get(trackId) || null;
  }

  /**
   * Get all tracks for a specific user
   */
  getUserTracks(userId: string): SubtitleTrack[] {
    return Array.from(this.tracks.values()).filter((track) => track.userId === userId);
  }

  /**
   * Get active (enabled) tracks for a specific user, sorted by priority
   */
  getActiveUserTracks(userId: string): SubtitleTrack[] {
    return this.getUserTracks(userId)
      .filter((track) => track.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Update track offset
   */
  updateTrackOffset(trackId: string, offsetMs: number): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.offset = offsetMs;
    }
  }

  /**
   * Toggle track enabled state
   */
  toggleTrack(trackId: string, enabled: boolean): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.enabled = enabled;
    }
  }

  /**
   * Update track priority for display ordering
   */
  updateTrackPriority(trackId: string, priority: number): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.priority = priority;
    }
  }

  /**
   * Update track-specific styling
   */
  updateTrackStyle(trackId: string, style: Partial<SubtitleStyle>): void {
    const track = this.tracks.get(trackId);
    if (track) {
      // Merge styles, keeping existing values for undefined properties
      Object.keys(style).forEach((key) => {
        const value = (style as any)[key];
        if (value !== undefined) {
          (track.style as any)[key] = value;
        }
      });
    }
  }

  /**
   * Get available languages for a user's tracks
   */
  getAvailableLanguages(userId: string): string[] {
    const languages = new Set<string>();
    this.getUserTracks(userId).forEach((track) => languages.add(track.language));
    return Array.from(languages).sort();
  }

  /**
   * Set user's preferred languages in order of preference
   */
  setLanguagePreference(userId: string, languages: string[]): void {
    const preferences = this.getUserPreferences(userId);
    preferences.preferredLanguages = [...languages];
    this.updateUserPreferences(userId, preferences);
  }

  /**
   * Get user's preferred languages
   */
  getLanguagePreference(userId: string): string[] {
    return this.getUserPreferences(userId).preferredLanguages;
  }

  /**
   * Toggle a language on/off for a user
   */
  toggleLanguage(userId: string, language: string, enabled: boolean): void {
    const preferences = this.getUserPreferences(userId);
    if (!preferences.languageSettings[language]) {
      preferences.languageSettings[language] = {
        enabled,
        priority: Object.keys(preferences.languageSettings).length + 1,
      };
    } else {
      preferences.languageSettings[language].enabled = enabled;
    }
    this.updateUserPreferences(userId, preferences);
  }

  /**
   * Get current subtitle cues for a user at a specific time
   */
  getCurrentCues(currentTime: number, userId: string): SubtitleCue[] {
    const preferences = this.getUserPreferences(userId);
    let userTracks = this.getActiveUserTracks(userId);

    // Filter by language preferences if multiple languages are not enabled
    if (!this.config.enableMultipleLanguages && preferences.preferredLanguages.length > 0) {
      // Show only the highest priority preferred language that has active tracks
      for (const preferredLang of preferences.preferredLanguages) {
        const langTracks = userTracks.filter((track) => track.language === preferredLang);
        if (langTracks.length > 0) {
          userTracks = langTracks;
          break;
        }
      }
    }

    // Limit to max simultaneous tracks
    if (userTracks.length > preferences.maxSimultaneousTracks) {
      userTracks = userTracks.slice(0, preferences.maxSimultaneousTracks);
    }

    const allCues: SubtitleCue[] = [];

    for (const track of userTracks) {
      const cues = this.parsedCues.get(track.id);
      if (!cues) continue;

      // Apply offset
      const adjustedTime = currentTime - track.offset / 1000;

      // Find cues that should be displayed at this time
      const activeCues = cues.filter(
        (cue) => cue.startTime <= adjustedTime && cue.endTime >= adjustedTime
      );

      // Add track info to cues for styling
      activeCues.forEach((cue) => {
        (cue as any).trackId = track.id;
        (cue as any).language = track.language;
        (cue as any).priority = track.priority;
      });

      allCues.push(...activeCues);
    }

    return allCues.sort((a, b) => ((a as any).priority || 0) - ((b as any).priority || 0));
  }

  /**
   * Render subtitles in a container element with user-specific styling
   */
  renderSubtitles(cues: SubtitleCue[], container: HTMLElement, userId: string): void {
    // Clear existing subtitles
    container.innerHTML = '';

    if (cues.length === 0) {
      return;
    }

    const preferences = this.getUserPreferences(userId);
    const defaultStyle = preferences.defaultStyle;

    // Create subtitle elements
    cues.forEach((cue, index) => {
      const trackId = (cue as any).trackId;
      const track = trackId ? this.getTrack(trackId) : null;
      const style = track?.style ? { ...defaultStyle, ...track.style } : defaultStyle;

      const subtitleElement = document.createElement('div');
      subtitleElement.className = `subtitle-cue subtitle-lang-${(cue as any).language || 'unknown'}`;
      subtitleElement.setAttribute('data-track-id', trackId || '');
      subtitleElement.setAttribute('data-language', (cue as any).language || '');

      this.applySubtitleStyle(subtitleElement, style);

      // Position multiple cues vertically
      const verticalOffset = this.calculateVerticalOffset(index, cues.length, style);
      subtitleElement.style.bottom = `${style.marginBottom + verticalOffset}px`;

      // Always use textContent to prevent XSS — never innerHTML
      subtitleElement.textContent = cue.text;

      container.appendChild(subtitleElement);
    });
  }

  /**
   * Apply subtitle styling to an element
   */
  applySubtitleStyle(element: HTMLElement, style: SubtitleStyle): void {
    element.style.cssText = `
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      background: ${style.backgroundColor};
      color: ${style.color};
      padding: ${style.padding}px;
      border-radius: ${style.borderRadius}px;
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize}px;
      line-height: ${style.lineHeight};
      text-align: ${style.alignment};
      max-width: ${style.maxWidth}%;
      word-wrap: break-word;
      z-index: 10000;
      pointer-events: none;
      opacity: ${style.opacity};
      text-shadow: ${style.shadowBlur}px ${style.shadowBlur}px ${style.shadowBlur * 2}px ${style.shadowColor};
      ${
        style.outlineWidth > 0
          ? `
        -webkit-text-stroke: ${style.outlineWidth}px ${style.outlineColor};
        text-stroke: ${style.outlineWidth}px ${style.outlineColor};
      `
          : ''
      }
    `;
  }

  /**
   * Get user preferences, creating defaults if not found
   */
  getUserPreferences(userId: string): SubtitleUserPreferences {
    if (!this.userPreferences.has(userId)) {
      const defaultPreferences: SubtitleUserPreferences = {
        userId,
        preferredLanguages: [...this.config.defaultLanguages],
        defaultStyle: { ...this.config.defaultStyle },
        enabledTrackIds: [],
        languageSettings: {},
        autoDownloadMissing: false,
        maxSimultaneousTracks: this.config.enableMultipleLanguages ? 3 : 1,
      };
      this.userPreferences.set(userId, defaultPreferences);
    }
    return this.userPreferences.get(userId)!;
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: Partial<SubtitleUserPreferences>): void {
    const current = this.getUserPreferences(userId);
    const updated = { ...current, ...preferences };
    this.userPreferences.set(userId, updated);
  }

  /**
   * Save user preferences to chrome.storage.local (not localStorage, which is page-accessible)
   */
  async saveUserPreferences(userId: string): Promise<void> {
    const preferences = this.getUserPreferences(userId);
    try {
      const storageKey = `subtitle-preferences-${userId}`;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [storageKey]: preferences });
      } else {
        // Fallback for environments without chrome.storage
        localStorage.setItem(storageKey, JSON.stringify(preferences));
      }
    } catch (error) {
      console.warn('Failed to save subtitle preferences:', error);
    }
  }

  /**
   * Load user preferences from chrome.storage.local
   */
  async loadUserPreferences(userId: string): Promise<void> {
    try {
      const storageKey = `subtitle-preferences-${userId}`;
      let stored: string | null = null;

      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(storageKey);
        if (result[storageKey]) {
          this.userPreferences.set(userId, result[storageKey] as SubtitleUserPreferences);
          return;
        }
      } else {
        stored = localStorage.getItem(storageKey);
      }

      if (stored) {
        const preferences = JSON.parse(stored) as SubtitleUserPreferences;
        this.userPreferences.set(userId, preferences);
      }
    } catch (error) {
      console.warn('Failed to load subtitle preferences:', error);
    }
  }

  /**
   * Search OpenSubtitles for subtitles with advanced options
   */
  async searchOpenSubtitles(options: SubtitleSearchOptions): Promise<OpenSubtitlesSearchResult[]> {
    if (!this.openSubtitlesClient) {
      throw new Error('OpenSubtitles API key not configured');
    }

    try {
      return await this.openSubtitlesClient.searchSubtitlesAdvanced(options);
    } catch (error) {
      // Log error but don't throw - provide graceful fallback
      console.error('OpenSubtitles search failed:', error);
      throw error;
    }
  }

  /**
   * Download subtitle from OpenSubtitles for a specific user
   */
  async downloadFromOpenSubtitles(
    result: OpenSubtitlesSearchResult,
    userId: string
  ): Promise<SubtitleTrack> {
    if (!this.openSubtitlesClient) {
      throw new Error('OpenSubtitles API key not configured');
    }

    try {
      // Check user track limit
      const userTracks = this.getUserTracks(userId);
      if (userTracks.length >= this.config.maxTracksPerUser) {
        throw new Error(
          `Maximum number of subtitle tracks (${this.config.maxTracksPerUser}) reached for user`
        );
      }

      const track = await this.openSubtitlesClient.downloadSubtitle(result);

      // Set user-specific properties
      track.userId = userId;
      track.priority = userTracks.length + 1;
      track.style = this.getUserPreferences(userId).defaultStyle;

      // Validate downloaded content
      const validation = this.validateSubtitleContent(track.content);
      if (!validation.isValid) {
        throw new Error(`Downloaded subtitle is invalid: ${validation.errors.join(', ')}`);
      }

      this.addTrack(track);
      return track;
    } catch (error) {
      console.error('OpenSubtitles download failed:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SubtitleEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update OpenSubtitles client if API key changed
    if (newConfig.openSubtitlesApiKey !== undefined) {
      if (newConfig.openSubtitlesApiKey) {
        this.openSubtitlesClient = new OpenSubtitlesClient(newConfig.openSubtitlesApiKey);
      } else {
        this.openSubtitlesClient = null;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SubtitleEngineConfig {
    return { ...this.config };
  }

  /**
   * Clear all tracks
   */
  clearAllTracks(): void {
    this.tracks.clear();
    this.parsedCues.clear();
  }

  /**
   * Auto-download subtitles for missing languages
   */
  async autoDownloadSubtitles(
    userId: string,
    videoInfo: { title?: string; imdbId?: string; hash?: string }
  ): Promise<SubtitleTrack[]> {
    if (!this.openSubtitlesClient) {
      return [];
    }

    const preferences = this.getUserPreferences(userId);
    if (!preferences.autoDownloadMissing) {
      return [];
    }

    const availableLanguages = new Set(this.getAvailableLanguages(userId));
    const missingLanguages = preferences.preferredLanguages.filter(
      (lang) => !availableLanguages.has(lang)
    );

    if (missingLanguages.length === 0) {
      return [];
    }

    const downloadedTracks: SubtitleTrack[] = [];

    for (const language of missingLanguages) {
      try {
        const searchOptions: SubtitleSearchOptions = {
          query: videoInfo.title || '',
          languages: [language],
          imdbId: videoInfo.imdbId,
          movieHash: videoInfo.hash,
          maxResults: 3,
        };

        const results = await this.searchOpenSubtitles(searchOptions);
        if (results.length > 0) {
          // Download the best result (first one, as they're sorted by quality)
          const track = await this.downloadFromOpenSubtitles(results[0], userId);
          downloadedTracks.push(track);
        }
      } catch (error) {
        console.warn(`Failed to auto-download subtitles for language ${language}:`, error);
      }
    }

    return downloadedTracks;
  }

  /**
   * Get all tracks
   */
  getAllTracks(): SubtitleTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Calculate vertical offset for multiple subtitle tracks
   */
  private calculateVerticalOffset(index: number, totalCues: number, style: SubtitleStyle): number {
    const lineHeight = style.fontSize * style.lineHeight;
    const spacing = 10; // pixels between lines
    return index * (lineHeight + spacing);
  }

  /**
   * Get default subtitle style
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
   * Read file content as text
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase();
  }

  /**
   * Detect language from filename (basic heuristic)
   */
  private detectLanguageFromFilename(filename: string): string | null {
    const languageCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'];
    const lowerFilename = filename.toLowerCase();

    for (const code of languageCodes) {
      if (
        lowerFilename.includes(`.${code}.`) ||
        lowerFilename.includes(`_${code}_`) ||
        lowerFilename.includes(`-${code}-`)
      ) {
        return code;
      }
    }

    return null;
  }
}
