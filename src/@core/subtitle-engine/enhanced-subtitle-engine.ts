/**
 * Enhanced Subtitle Engine with Graceful Error Handling
 * Fixes requirements 34 and 43: API Error Handling
 */

import { getAPIKeyManager } from '../api-keys/api-key-manager';

/** Per-user preference data stored by the engine */
interface UserSubtitlePreferences {
  preferredLanguages?: string[];
  enabledLanguages?: string[];
  [key: string]: unknown;
}

/** A subtitle cue produced for rendering */
interface SubtitleCueOutput {
  trackId: string;
  text: string;
  startTime: number;
  endTime: number;
}

/** Search response shape returned by the OpenSubtitles API */
interface OpenSubtitlesApiResponse {
  data?: Array<{
    id?: string;
    attributes?: {
      language?: string;
      files?: Array<{
        file_name?: string;
        file_id?: string;
      }>;
      ratings?: number;
      download_count?: number;
    };
  }>;
}

export interface SubtitleErrorResponse {
  type: 'api_key_missing' | 'network_error' | 'service_unavailable' | 'invalid_response';
  message: string;
  action?: {
    text: string;
    callback: () => void;
  };
  fallbackAvailable: boolean;
  retryable: boolean;
}

export interface SubtitleTrack {
  id: string;
  fileName: string;
  language: string;
  source: 'local' | 'opensubtitles' | 'user_upload';
  enabled: boolean;
  offset: number;
  content: string;
  format: 'srt' | 'vtt';
}

export interface SubtitleResult {
  id: string;
  language: string;
  fileName: string;
  downloadUrl: string;
  rating: number;
  downloads: number;
}

export class EnhancedSubtitleEngine {
  private apiKeyManager = getAPIKeyManager();
  private tracks: Map<string, SubtitleTrack> = new Map();
  private errorCallbacks: ((error: SubtitleErrorResponse) => void)[] = [];
  private userPreferences: Map<string, UserSubtitlePreferences> = new Map();
  private config: Record<string, unknown> = {};

  /**
   * Load subtitle file with error handling
   */
  async loadSubtitleFile(file: File, _userId: string): Promise<SubtitleTrack> {
    try {
      // Validate file
      if (!this.isValidSubtitleFile(file)) {
        throw new Error('Invalid subtitle file format. Only SRT and VTT files are supported.');
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        throw new Error('Subtitle file is too large. Maximum size is 5MB.');
      }

      // Read file content
      const content = await this.readFileContent(file);

      // Create track
      const track: SubtitleTrack = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        language: this.detectLanguageFromFileName(file.name),
        source: 'user_upload',
        enabled: true,
        offset: 0,
        content: this.sanitizeSubtitleContent(content),
        format: file.name.toLowerCase().endsWith('.vtt') ? 'vtt' : 'srt',
      };

      this.tracks.set(track.id, track);
      return track;
    } catch (error) {
      const errorResponse = this.createErrorResponse(
        'invalid_response',
        error instanceof Error ? error.message : 'Failed to load subtitle file',
        false,
        false
      );
      this.notifyError(errorResponse);
      throw error;
    }
  }

  /**
   * Search OpenSubtitles with graceful error handling
   */
  async searchOpenSubtitles(_query: string, _language?: string): Promise<SubtitleResult[]> {
    try {
      // Check if API key is available
      const apiKey = await this.apiKeyManager.getAPIKey('opensubtitles');

      if (!apiKey) {
        const errorResponse = this.createAPIKeyMissingError('opensubtitles');
        this.notifyError(errorResponse);
        throw new Error('OpenSubtitles API key is required');
      }

      // Test API key validity
      const isValid = await this.apiKeyManager.validateAPIKey('opensubtitles', apiKey);
      if (!isValid) {
        const errorResponse = this.createErrorResponse(
          'api_key_missing',
          'OpenSubtitles API key is invalid. Please check your settings.',
          false,
          false,
          {
            text: 'Update API Key',
            callback: () => this.openSettingsPage(),
          }
        );
        this.notifyError(errorResponse);
        throw new Error('Invalid OpenSubtitles API key');
      }

      // Make API request
      const response = await fetch('https://api.opensubtitles.com/api/v1/subtitles', {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'WatchPartyExtension v1.0',
        },
        // Add query parameters
      });

      if (!response.ok) {
        if (response.status === 401) {
          const errorResponse = this.createAPIKeyMissingError('opensubtitles');
          this.notifyError(errorResponse);
          throw new Error('OpenSubtitles API key is invalid');
        } else if (response.status === 429) {
          const errorResponse = this.createErrorResponse(
            'service_unavailable',
            'OpenSubtitles API rate limit exceeded. Please try again later.',
            true,
            true
          );
          this.notifyError(errorResponse);
          throw new Error('Rate limit exceeded');
        } else {
          const errorResponse = this.createErrorResponse(
            'service_unavailable',
            `OpenSubtitles API error: ${response.status}`,
            true,
            true
          );
          this.notifyError(errorResponse);
          throw new Error(`API error: ${response.status}`);
        }
      }

      const data = await response.json();
      return this.parseOpenSubtitlesResponse(data);
    } catch (error) {
      // If it's not already handled, create a generic error
      if (!(error instanceof Error && error.message.includes('API key'))) {
        const errorResponse = this.createErrorResponse(
          'network_error',
          'Failed to search subtitles. Check your internet connection.',
          true,
          true
        );
        this.notifyError(errorResponse);
      }

      // Return empty results for graceful degradation
      return [];
    }
  }

  /**
   * Download from OpenSubtitles with error handling
   */
  async downloadFromOpenSubtitles(result: SubtitleResult, _userId: string): Promise<SubtitleTrack> {
    try {
      const apiKey = await this.apiKeyManager.getAPIKey('opensubtitles');

      if (!apiKey) {
        const errorResponse = this.createAPIKeyMissingError('opensubtitles');
        this.notifyError(errorResponse);
        throw new Error('OpenSubtitles API key is required');
      }

      // Download subtitle content
      const response = await fetch(result.downloadUrl, {
        headers: {
          'Api-Key': apiKey,
          'User-Agent': 'WatchPartyExtension v1.0',
        },
      });

      if (!response.ok) {
        const errorResponse = this.createErrorResponse(
          'service_unavailable',
          'Failed to download subtitle file from OpenSubtitles.',
          true,
          true
        );
        this.notifyError(errorResponse);
        throw new Error('Download failed');
      }

      const content = await response.text();

      // Create track
      const track: SubtitleTrack = {
        id: `opensubtitles_${result.id}`,
        fileName: result.fileName,
        language: result.language,
        source: 'opensubtitles',
        enabled: true,
        offset: 0,
        content: this.sanitizeSubtitleContent(content),
        format: result.fileName.toLowerCase().endsWith('.vtt') ? 'vtt' : 'srt',
      };

      this.tracks.set(track.id, track);
      return track;
    } catch {
      // Graceful fallback - return empty track
      const fallbackTrack: SubtitleTrack = {
        id: `fallback_${Date.now()}`,
        fileName: 'Subtitle unavailable',
        language: result.language,
        source: 'local',
        enabled: false,
        offset: 0,
        content: '',
        format: 'srt',
      };

      return fallbackTrack;
    }
  }

  /**
   * Handle API errors gracefully
   */
  handleAPIError(error: Error): SubtitleErrorResponse {
    if (error.message.includes('API key')) {
      return this.createAPIKeyMissingError('opensubtitles');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      return this.createErrorResponse(
        'network_error',
        'Network error occurred. Please check your internet connection.',
        true,
        true
      );
    } else if (error.message.includes('rate limit')) {
      return this.createErrorResponse(
        'service_unavailable',
        'Service temporarily unavailable due to rate limiting.',
        true,
        true
      );
    } else {
      return this.createErrorResponse(
        'invalid_response',
        'An unexpected error occurred while processing subtitles.',
        true,
        false
      );
    }
  }

  /**
   * Show API key missing dialog
   */
  showAPIKeyMissingDialog(): void {
    const errorResponse = this.createAPIKeyMissingError('opensubtitles');
    this.notifyError(errorResponse);
  }

  /**
   * Get fallback subtitles when external services fail
   */
  async getFallbackSubtitles(_videoInfo: unknown): Promise<SubtitleTrack[]> {
    // Return local tracks only
    return Array.from(this.tracks.values()).filter(
      (track) => track.source === 'local' || track.source === 'user_upload'
    );
  }

  /**
   * Subscribe to error notifications
   */
  onError(callback: (error: SubtitleErrorResponse) => void): () => void {
    this.errorCallbacks.push(callback);

    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index >= 0) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Create API key missing error
   */
  private createAPIKeyMissingError(service: string): SubtitleErrorResponse {
    return {
      type: 'api_key_missing',
      message: `${service} API key is missing. Configure it in settings to enable subtitle search.`,
      action: {
        text: 'Open Settings',
        callback: () => this.openSettingsPage(),
      },
      fallbackAvailable: true,
      retryable: false,
    };
  }

  /**
   * Create generic error response
   */
  private createErrorResponse(
    type: SubtitleErrorResponse['type'],
    message: string,
    fallbackAvailable: boolean,
    retryable: boolean,
    action?: SubtitleErrorResponse['action']
  ): SubtitleErrorResponse {
    return {
      type,
      message,
      action,
      fallbackAvailable,
      retryable,
    };
  }

  /**
   * Notify error callbacks
   */
  private notifyError(error: SubtitleErrorResponse): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in subtitle error callback:', err);
      }
    });
  }

  /**
   * Open settings page
   */
  private openSettingsPage(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.openOptionsPage();
    } else {
      // Fallback for Firefox
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  /**
   * Validate subtitle file
   */
  private isValidSubtitleFile(file: File): boolean {
    const validExtensions = ['.srt', '.vtt'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some((ext) => fileName.endsWith(ext));
  }

  /**
   * Read file content
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Detect language from filename
   */
  private detectLanguageFromFileName(fileName: string): string {
    const languageCodes = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
    };

    const lowerName = fileName.toLowerCase();
    for (const [code, name] of Object.entries(languageCodes)) {
      if (lowerName.includes(`.${code}.`) || lowerName.includes(`_${code}_`)) {
        return name;
      }
    }

    return 'Unknown';
  }

  /**
   * Sanitize subtitle content
   */
  private sanitizeSubtitleContent(content: string): string {
    // Remove potentially harmful content
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Parse OpenSubtitles API response
   */
  private parseOpenSubtitlesResponse(data: OpenSubtitlesApiResponse): SubtitleResult[] {
    try {
      if (!data || !data.data || !Array.isArray(data.data)) {
        return [];
      }

      return data.data.map((item) => ({
        id: item.id || '',
        language: item.attributes?.language || 'Unknown',
        fileName: item.attributes?.files?.[0]?.file_name || 'subtitle.srt',
        downloadUrl: item.attributes?.files?.[0]?.file_id || '',
        rating: item.attributes?.ratings || 0,
        downloads: item.attributes?.download_count || 0,
      }));
    } catch (error) {
      console.error('Failed to parse OpenSubtitles response:', error);
      return [];
    }
  }

  /**
   * Get all tracks
   */
  getAllTracks(): SubtitleTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Get track by ID
   */
  getTrack(id: string): SubtitleTrack | undefined {
    return this.tracks.get(id);
  }

  /**
   * Remove track
   */
  removeTrack(id: string): boolean {
    return this.tracks.delete(id);
  }

  /**
   * Clear all tracks
   */
  clearAllTracks(): void {
    this.tracks.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Record<string, unknown>): void {
    this.config = { ...this.config, ...config };
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
   * Update track priority (placeholder)
   */
  updateTrackPriority(trackId: string, priority: number): void {
    // Implementation would depend on priority system
    console.log(`Updated track ${trackId} priority to ${priority}`);
  }

  /**
   * Update track style (placeholder)
   */
  updateTrackStyle(trackId: string, style: Record<string, unknown>): void {
    // Implementation would depend on style system
    console.log(`Updated track ${trackId} style:`, style);
  }

  /**
   * Set language preference for user
   */
  setLanguagePreference(userId: string, languages: string[]): void {
    const prefs = this.userPreferences.get(userId) || {};
    prefs.preferredLanguages = languages;
    this.userPreferences.set(userId, prefs);
  }

  /**
   * Toggle language for user
   */
  toggleLanguage(userId: string, language: string, enabled: boolean): void {
    const prefs = this.userPreferences.get(userId) || {};
    const enabledLanguages = prefs.enabledLanguages ?? [];
    prefs.enabledLanguages = enabledLanguages;

    if (enabled) {
      if (!enabledLanguages.includes(language)) {
        enabledLanguages.push(language);
      }
    } else {
      prefs.enabledLanguages = enabledLanguages.filter((lang) => lang !== language);
    }

    this.userPreferences.set(userId, prefs);
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: Record<string, unknown>): void {
    const existing = this.userPreferences.get(userId) || {};
    this.userPreferences.set(userId, { ...existing, ...preferences });
  }

  /**
   * Get current cues for timestamp
   */
  getCurrentCues(currentTime: number, _userId: string): SubtitleCueOutput[] {
    // Simplified implementation - would need proper subtitle parsing
    const activeTracks = Array.from(this.tracks.values()).filter((track) => track.enabled);
    return activeTracks.map((track) => ({
      trackId: track.id,
      text: `Subtitle at ${currentTime}s`, // Placeholder
      startTime: currentTime,
      endTime: currentTime + 2,
    }));
  }

  /**
   * Render subtitles to container
   */
  renderSubtitles(cues: SubtitleCueOutput[], container: HTMLElement, _userId: string): void {
    if (!container) return;

    container.innerHTML = '';
    cues.forEach((cue) => {
      const subtitle = document.createElement('div');
      subtitle.className = 'subtitle-cue';
      subtitle.textContent = cue.text;
      container.appendChild(subtitle);
    });
  }

  /**
   * Get user tracks
   */
  getUserTracks(_userId: string): SubtitleTrack[] {
    // For now, return all tracks - could be filtered by user preferences
    return Array.from(this.tracks.values());
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(userId: string): Promise<void> {
    const prefs = this.userPreferences.get(userId);
    if (prefs && typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [`subtitle_prefs_${userId}`]: prefs });
    }
  }

  /**
   * Load user preferences
   */
  async loadUserPreferences(userId: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get([`subtitle_prefs_${userId}`]);
      const prefs = result[`subtitle_prefs_${userId}`] as UserSubtitlePreferences | undefined;
      if (prefs) {
        this.userPreferences.set(userId, prefs);
      }
    }
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): UserSubtitlePreferences {
    return this.userPreferences.get(userId) || {};
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(_userId: string): string[] {
    const uniqueLanguages = new Set<string>();
    this.tracks.forEach((track) => {
      uniqueLanguages.add(track.language);
    });
    return Array.from(uniqueLanguages);
  }

  /**
   * Auto download subtitles
   */
  async autoDownloadSubtitles(
    userId: string,
    videoInfo: { title?: string }
  ): Promise<SubtitleTrack[]> {
    try {
      const searchResults = await this.searchOpenSubtitles(videoInfo.title || '', 'en');

      const tracks: SubtitleTrack[] = [];
      for (const result of searchResults.slice(0, 3)) {
        // Limit to 3 results
        try {
          const track = await this.downloadFromOpenSubtitles(result, userId);
          tracks.push(track);
        } catch (error) {
          console.warn('Failed to download subtitle:', error);
        }
      }

      return tracks;
    } catch (error) {
      console.error('Auto download failed:', error);
      return [];
    }
  }
}

export default EnhancedSubtitleEngine;
