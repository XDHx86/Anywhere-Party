/**
 * OpenSubtitles API client for subtitle search and download
 */

import { OpenSubtitlesSearchResult, SubtitleTrack, SubtitleSearchOptions } from './types';

export interface OpenSubtitlesConfig {
  apiKey: string;
  userAgent: string;
  baseUrl: string;
}

/** A single subtitle entry from the OpenSubtitles API response */
interface OpenSubtitlesApiItem {
  id?: string;
  attributes?: {
    language?: string;
    files?: Array<{
      file_id?: number | string;
      file_name?: string;
    }>;
    ratings?: string;
    download_count?: string;
  };
}

/** Search response shape returned by the OpenSubtitles API */
interface OpenSubtitlesApiResponse {
  data?: OpenSubtitlesApiItem[];
}

export class OpenSubtitlesClient {
  private static readonly DEFAULT_BASE_URL = 'https://api.opensubtitles.com/api/v1';
  private static readonly DEFAULT_USER_AGENT = 'WatchPartyExtension v1.0';
  private static readonly REQUEST_TIMEOUT_MS = 10000;
  private static readonly MAX_SEARCH_RESULTS = 20;

  private config: OpenSubtitlesConfig;

  constructor(apiKey: string, userAgent?: string, baseUrl?: string) {
    this.config = {
      apiKey,
      userAgent: userAgent || OpenSubtitlesClient.DEFAULT_USER_AGENT,
      baseUrl: baseUrl || OpenSubtitlesClient.DEFAULT_BASE_URL,
    };
  }

  /**
   * Search for subtitles with advanced options
   */
  async searchSubtitlesAdvanced(
    options: SubtitleSearchOptions
  ): Promise<OpenSubtitlesSearchResult[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenSubtitles API key not configured');
    }

    if (!options.query || options.query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const searchParams = new URLSearchParams({
      query: options.query.trim(),
      type: 'movie,episode',
      order_by: 'download_count',
      order_direction: 'desc',
    });

    // Add language filters
    if (options.languages && options.languages.length > 0) {
      searchParams.set('languages', options.languages.join(','));
    }

    // Add movie hash if available
    if (options.movieHash) {
      searchParams.set('moviehash', options.movieHash);
    }

    // Add IMDB ID if available
    if (options.imdbId) {
      searchParams.set('imdb_id', options.imdbId);
    }

    // Add season/episode for TV shows
    if (options.season !== undefined) {
      searchParams.set('season_number', options.season.toString());
    }
    if (options.episode !== undefined) {
      searchParams.set('episode_number', options.episode.toString());
    }

    // Add year filter
    if (options.year) {
      searchParams.set('year', options.year.toString());
    }

    const url = `${this.config.baseUrl}/subtitles?${searchParams}`;
    const maxResults = options.maxResults || OpenSubtitlesClient.MAX_SEARCH_RESULTS;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        OpenSubtitlesClient.REQUEST_TIMEOUT_MS
      );

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Api-Key': this.config.apiKey,
          'User-Agent': this.config.userAgent,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid OpenSubtitles API key');
        } else if (response.status === 429) {
          throw new Error('OpenSubtitles API rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          throw new Error('OpenSubtitles service temporarily unavailable');
        } else {
          throw new Error(`OpenSubtitles API error: ${response.status} ${response.statusText}`);
        }
      }

      const data: OpenSubtitlesApiResponse = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      return data.data
        .slice(0, maxResults)
        .map((item) => this.mapSearchResult(item))
        .filter(
          (result: OpenSubtitlesSearchResult | null) => result !== null
        ) as OpenSubtitlesSearchResult[];
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('OpenSubtitles request timed out');
        }
        throw error;
      }
      throw new Error('Failed to search OpenSubtitles');
    }
  }

  /**
   * Search for subtitles by query and language (legacy method)
   */
  async searchSubtitles(query: string, language?: string): Promise<OpenSubtitlesSearchResult[]> {
    return this.searchSubtitlesAdvanced({
      query,
      languages: language ? [language] : undefined,
    });
  }

  /**
   * Download subtitle file from OpenSubtitles
   */
  async downloadSubtitle(result: OpenSubtitlesSearchResult): Promise<SubtitleTrack> {
    if (!this.config.apiKey) {
      throw new Error('OpenSubtitles API key not configured');
    }

    const url = `${this.config.baseUrl}/download`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        OpenSubtitlesClient.REQUEST_TIMEOUT_MS
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Api-Key': this.config.apiKey,
          'User-Agent': this.config.userAgent,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: result.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid OpenSubtitles API key');
        } else if (response.status === 404) {
          throw new Error('Subtitle file not found');
        } else if (response.status === 429) {
          throw new Error('OpenSubtitles API rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          throw new Error('OpenSubtitles service temporarily unavailable');
        } else {
          throw new Error(
            `OpenSubtitles download error: ${response.status} ${response.statusText}`
          );
        }
      }

      const data = await response.json();

      if (!data.link) {
        throw new Error('No download link provided by OpenSubtitles');
      }

      // Download the actual subtitle file
      const subtitleResponse = await fetch(data.link, {
        signal: controller.signal,
      });

      if (!subtitleResponse.ok) {
        throw new Error('Failed to download subtitle file');
      }

      const content = await subtitleResponse.text();

      if (!content || content.trim().length === 0) {
        throw new Error('Downloaded subtitle file is empty');
      }

      // Create subtitle track
      const track: SubtitleTrack = {
        id: `opensubtitles-${result.id}-${Date.now()}`,
        userId: '', // Will be set by the calling code
        language: result.language,
        source: 'opensubtitles',
        content,
        offset: 0,
        enabled: true,
        fileName: result.fileName,
        priority: 0,
        createdAt: new Date(),
      };

      return track;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('OpenSubtitles download timed out');
        }
        throw error;
      }
      throw new Error('Failed to download from OpenSubtitles');
    }
  }

  /**
   * Check if API key is configured and valid
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      // Make a simple request to validate the API key
      const response = await fetch(`${this.config.baseUrl}/infos/user`, {
        method: 'GET',
        headers: {
          'Api-Key': this.config.apiKey,
          'User-Agent': this.config.userAgent,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Map OpenSubtitles API response to our search result format
   */
  private mapSearchResult(item: OpenSubtitlesApiItem): OpenSubtitlesSearchResult | null {
    try {
      if (
        !item.attributes ||
        !item.attributes.files ||
        !Array.isArray(item.attributes.files) ||
        item.attributes.files.length === 0
      ) {
        return null;
      }

      const file = item.attributes.files[0];
      if (!file) return null;

      return {
        id: file.file_id?.toString() || item.id?.toString() || '',
        language: item.attributes.language || 'unknown',
        fileName: file.file_name || 'subtitle.srt',
        downloadUrl: '', // Will be populated during download
        rating: parseFloat(item.attributes.ratings ?? '') || 0,
        downloadCount: parseInt(item.attributes.download_count ?? '', 10) || 0,
      };
    } catch {
      return null;
    }
  }
}
