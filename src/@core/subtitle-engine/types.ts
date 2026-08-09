/**
 * Subtitle engine types and interfaces
 */

export interface SubtitleTrack {
  id: string;
  userId: string;
  language: string;
  source: 'file' | 'opensubtitles';
  content: string; // SRT/VTT content
  offset: number; // User-specific offset in ms
  enabled: boolean;
  fileName?: string;
  createdAt: Date;
  priority: number; // Display priority when multiple tracks are active
  style?: SubtitleStyle; // Per-track styling overrides
}

export interface SubtitleCue {
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  id?: string;
  trackId?: string; // Track this cue belongs to (attached during cue retrieval)
  language?: string; // Language of the cue's track
  priority?: number; // Display priority of the cue's track
}

export interface SubtitleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cueCount?: number;
  format?: 'srt' | 'vtt';
}

export interface OpenSubtitlesSearchResult {
  id: string;
  language: string;
  fileName: string;
  downloadUrl: string;
  rating: number;
  downloadCount: number;
}

export interface SubtitleEngineConfig {
  maxFileSizeBytes: number;
  allowedFormats: string[];
  sanitizeHtml: boolean;
  openSubtitlesApiKey?: string;
  defaultLanguages: string[];
  maxTracksPerUser: number;
  defaultStyle: SubtitleStyle;
  enableMultipleLanguages: boolean;
}

export interface SubtitleEngine {
  // File operations
  loadSubtitleFile(file: File, userId: string): Promise<SubtitleTrack>;
  parseSubtitleContent(content: string, format: 'srt' | 'vtt'): SubtitleCue[];
  validateSubtitleContent(content: string): SubtitleValidationResult;

  // Track management
  addTrack(track: SubtitleTrack): void;
  removeTrack(trackId: string): void;
  getTrack(trackId: string): SubtitleTrack | null;
  getUserTracks(userId: string): SubtitleTrack[];
  getActiveUserTracks(userId: string): SubtitleTrack[];
  updateTrackOffset(trackId: string, offsetMs: number): void;
  toggleTrack(trackId: string, enabled: boolean): void;
  updateTrackPriority(trackId: string, priority: number): void;
  updateTrackStyle(trackId: string, style: Partial<SubtitleStyle>): void;

  // Language management
  getAvailableLanguages(userId: string): string[];
  setLanguagePreference(userId: string, languages: string[]): void;
  getLanguagePreference(userId: string): string[];
  toggleLanguage(userId: string, language: string, enabled: boolean): void;

  // User preferences
  getUserPreferences(userId: string): SubtitleUserPreferences;
  updateUserPreferences(userId: string, preferences: Partial<SubtitleUserPreferences>): void;
  saveUserPreferences(userId: string): Promise<void>;
  loadUserPreferences(userId: string): Promise<void>;

  // Rendering with styling
  getCurrentCues(currentTime: number, userId: string): SubtitleCue[];
  renderSubtitles(cues: SubtitleCue[], container: HTMLElement, userId: string): void;
  applySubtitleStyle(element: HTMLElement, style: SubtitleStyle): void;

  // Advanced OpenSubtitles integration
  searchOpenSubtitles(options: SubtitleSearchOptions): Promise<OpenSubtitlesSearchResult[]>;
  downloadFromOpenSubtitles(
    result: OpenSubtitlesSearchResult,
    userId: string
  ): Promise<SubtitleTrack>;
  autoDownloadSubtitles(
    userId: string,
    videoInfo: { title?: string; imdbId?: string; hash?: string }
  ): Promise<SubtitleTrack[]>;
}

export interface SubtitleStyle {
  fontSize: number; // in pixels
  fontFamily: string;
  color: string; // hex color
  backgroundColor: string; // hex color with alpha
  outlineColor: string; // hex color
  outlineWidth: number; // in pixels
  position: 'bottom' | 'top' | 'center';
  alignment: 'left' | 'center' | 'right';
  opacity: number; // 0-1
  lineHeight: number; // multiplier
  maxWidth: number; // percentage of video width
  marginBottom: number; // pixels from bottom
  borderRadius: number; // pixels
  padding: number; // pixels
  shadowBlur: number; // pixels
  shadowColor: string; // hex color
}

export interface SubtitleUserPreferences {
  userId: string;
  preferredLanguages: string[]; // ordered by preference
  defaultStyle: SubtitleStyle;
  enabledTrackIds: string[];
  languageSettings: Record<
    string,
    {
      enabled: boolean;
      priority: number;
      style?: Partial<SubtitleStyle>;
    }
  >;
  autoDownloadMissing: boolean;
  maxSimultaneousTracks: number;
}

export interface SubtitleSearchOptions {
  query: string;
  languages?: string[];
  movieHash?: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  year?: number;
  maxResults?: number;
}

export interface SubtitleMessage {
  type:
    | 'subtitle_track_added'
    | 'subtitle_track_removed'
    | 'subtitle_offset_changed'
    | 'subtitle_toggled'
    | 'subtitle_style_changed'
    | 'subtitle_preferences_updated';
  trackId: string;
  userId: string;
  data?: unknown;
}
