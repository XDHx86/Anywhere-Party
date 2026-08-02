/**
 * Subtitle engine tests
 * Tests subtitle parsing, validation, file loading, and OpenSubtitles integration
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubtitleEngineImpl } from './subtitle-engine';
import { SubtitleParser } from './subtitle-parser';
import { OpenSubtitlesClient } from './opensubtitles-client';
import { SubtitleEngineConfig, SubtitleTrack } from './types';

describe('SubtitleParser', () => {
  describe('SRT parsing', () => {
    it('should parse valid SRT content', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello world

2
00:00:04,500 --> 00:00:06,500
This is a test`;

      const cues = SubtitleParser.parseSRT(srtContent);

      expect(cues).toHaveLength(2);
      expect(cues[0]).toEqual({
        startTime: 1,
        endTime: 3,
        text: 'Hello world',
        id: 'srt-0',
      });
      expect(cues[1]).toEqual({
        startTime: 4.5,
        endTime: 6.5,
        text: 'This is a test',
        id: 'srt-1',
      });
    });

    it('should handle multiline text in SRT', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Line one
Line two
Line three`;

      const cues = SubtitleParser.parseSRT(srtContent);

      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe('Line one\nLine two\nLine three');
    });

    it('should skip invalid SRT blocks', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Valid subtitle

invalid block without timing

2
00:00:04,500 --> 00:00:06,500
Another valid subtitle`;

      const cues = SubtitleParser.parseSRT(srtContent);

      expect(cues).toHaveLength(2);
      expect(cues[0].text).toBe('Valid subtitle');
      expect(cues[1].text).toBe('Another valid subtitle');
    });
  });

  describe('VTT parsing', () => {
    it('should parse valid VTT content', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello world

00:00:04.500 --> 00:00:06.500
This is a test`;

      const cues = SubtitleParser.parseVTT(vttContent);

      expect(cues).toHaveLength(2);
      expect(cues[0]).toEqual({
        startTime: 1,
        endTime: 3,
        text: 'Hello world',
        id: 'vtt-0',
      });
      expect(cues[1]).toEqual({
        startTime: 4.5,
        endTime: 6.5,
        text: 'This is a test',
        id: 'vtt-1',
      });
    });

    it('should handle VTT with cue identifiers', () => {
      const vttContent = `WEBVTT

cue1
00:00:01.000 --> 00:00:03.000
Hello world

cue2
00:00:04.500 --> 00:00:06.500
This is a test`;

      const cues = SubtitleParser.parseVTT(vttContent);

      expect(cues).toHaveLength(2);
      expect(cues[0].id).toBe('cue1');
      expect(cues[1].id).toBe('cue2');
    });
  });

  describe('Content validation', () => {
    it('should validate correct SRT content', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello world`;

      const result = SubtitleParser.validateSubtitleContent(srtContent);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('srt');
      expect(result.cueCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct VTT content', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello world`;

      const result = SubtitleParser.validateSubtitleContent(vttContent);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('vtt');
      expect(result.cueCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const result = SubtitleParser.validateSubtitleContent('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Subtitle content is empty');
    });

    it('should reject unrecognized format', () => {
      const result = SubtitleParser.validateSubtitleContent('This is not a subtitle file');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unrecognized subtitle format. Expected SRT or VTT format.');
    });

    it('should warn about timing issues', () => {
      const srtContent = `1
00:00:03,000 --> 00:00:01,000
Invalid timing`;

      const result = SubtitleParser.validateSubtitleContent(srtContent);

      expect(result.isValid).toBe(true); // Still valid, just warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Start time');
    });
  });

  describe('Text sanitization', () => {
    it('should remove dangerous HTML tags', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
<script>alert('xss')</script>Hello world`;

      const cues = SubtitleParser.parseSRT(srtContent);

      expect(cues[0].text).toBe('Hello world');
      expect(cues[0].text).not.toContain('<script>');
    });

    it('should preserve basic formatting tags', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b>Bold</b> and <i>italic</i> text`;

      const cues = SubtitleParser.parseSRT(srtContent);

      expect(cues[0].text).toBe('<b>Bold</b> and <i>italic</i> text');
    });

    it('should remove dangerous attributes', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b onclick="alert('xss')">Safe text</b>`;

      const cues = SubtitleParser.parseSRT(srtContent);

      expect(cues[0].text).toBe('<b>Safe text</b>');
      expect(cues[0].text).not.toContain('onclick');
    });

    it('should handle excessive whitespace', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
  Multiple    spaces   and
  
  
  newlines  `;

      const cues = SubtitleParser.parseSRT(srtContent);

      // Check that multiple spaces are collapsed and excessive whitespace is cleaned up
      expect(cues[0].text).toBe('Multiple spaces and');
      expect(cues[0].text).not.toContain('    '); // Multiple spaces should be collapsed
    });

    it('should truncate overly long text', () => {
      const longText = 'x'.repeat(1001); // Exceeds MAX_CUE_TEXT_LENGTH
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
${longText}`;

      const cues = SubtitleParser.parseSRT(srtContent);

      expect(cues[0].text.length).toBeLessThanOrEqual(1003); // 1000 + '...'
      expect(cues[0].text.endsWith('...')).toBe(true);
    });
  });
});

describe('SubtitleEngineImpl', () => {
  let engine: SubtitleEngineImpl;
  let config: SubtitleEngineConfig;

  beforeEach(() => {
    config = {
      maxFileSizeBytes: 1024 * 1024, // 1MB
      allowedFormats: ['.srt', '.vtt'],
      sanitizeHtml: true,
      openSubtitlesApiKey: 'test-api-key',
      defaultLanguages: ['en'],
    };
    engine = new SubtitleEngineImpl(config);
  });

  describe('File loading', () => {
    it('should load valid SRT file', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello world`;

      const mockFile = new File([srtContent], 'test.srt', { type: 'text/plain' });

      const track = await engine.loadSubtitleFile(mockFile);

      expect(track.source).toBe('file');
      expect(track.fileName).toBe('test.srt');
      expect(track.content).toBe(srtContent);
      expect(track.language).toBe('en');
      expect(track.enabled).toBe(true);
    });

    it('should reject oversized files', async () => {
      const largeContent = 'x'.repeat(config.maxFileSizeBytes + 1);
      const mockFile = new File([largeContent], 'large.srt', { type: 'text/plain' });

      await expect(engine.loadSubtitleFile(mockFile)).rejects.toThrow('File size');
    });

    it('should reject unsupported formats', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(engine.loadSubtitleFile(mockFile)).rejects.toThrow(
        'File format .txt not supported'
      );
    });

    it('should reject invalid subtitle content', async () => {
      const invalidContent = 'This is not a subtitle file';
      const mockFile = new File([invalidContent], 'invalid.srt', { type: 'text/plain' });

      await expect(engine.loadSubtitleFile(mockFile)).rejects.toThrow('Invalid subtitle file');
    });

    it('should detect language from filename', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hola mundo`;

      const mockFile = new File([srtContent], 'movie.es.srt', { type: 'text/plain' });

      const track = await engine.loadSubtitleFile(mockFile);

      expect(track.language).toBe('es');
    });
  });

  describe('Track management', () => {
    let testTrack: SubtitleTrack;

    beforeEach(() => {
      testTrack = {
        id: 'test-track',
        userId: 'user1',
        language: 'en',
        source: 'file',
        content: `1\n00:00:01,000 --> 00:00:03,000\nHello world`,
        offset: 0,
        enabled: true,
        fileName: 'test.srt',
        createdAt: new Date(),
      };
    });

    it('should add and retrieve tracks', () => {
      engine.addTrack(testTrack);

      const retrieved = engine.getTrack(testTrack.id);
      expect(retrieved).toEqual(testTrack);
    });

    it('should remove tracks', () => {
      engine.addTrack(testTrack);
      engine.removeTrack(testTrack.id);

      const retrieved = engine.getTrack(testTrack.id);
      expect(retrieved).toBeNull();
    });

    it('should get user tracks', () => {
      const track1 = { ...testTrack, id: 'track1', userId: 'user1' };
      const track2 = { ...testTrack, id: 'track2', userId: 'user2' };
      const track3 = { ...testTrack, id: 'track3', userId: 'user1' };

      engine.addTrack(track1);
      engine.addTrack(track2);
      engine.addTrack(track3);

      const userTracks = engine.getUserTracks('user1');
      expect(userTracks).toHaveLength(2);
      expect(userTracks.map((t) => t.id)).toContain('track1');
      expect(userTracks.map((t) => t.id)).toContain('track3');
    });

    it('should update track offset', () => {
      engine.addTrack(testTrack);
      engine.updateTrackOffset(testTrack.id, 1000);

      const updated = engine.getTrack(testTrack.id);
      expect(updated?.offset).toBe(1000);
    });

    it('should toggle track enabled state', () => {
      engine.addTrack(testTrack);
      engine.toggleTrack(testTrack.id, false);

      const updated = engine.getTrack(testTrack.id);
      expect(updated?.enabled).toBe(false);
    });
  });

  describe('Cue retrieval', () => {
    beforeEach(() => {
      const track: SubtitleTrack = {
        id: 'test-track',
        userId: 'user1',
        language: 'en',
        source: 'file',
        content: `1
00:00:01,000 --> 00:00:03,000
First subtitle

2
00:00:04,000 --> 00:00:06,000
Second subtitle`,
        offset: 0,
        enabled: true,
        fileName: 'test.srt',
        createdAt: new Date(),
      };
      engine.addTrack(track);
    });

    it('should return current cues at specific time', () => {
      const cues = engine.getCurrentCues(2, 'user1'); // 2 seconds

      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe('First subtitle');
    });

    it('should return no cues when outside time range', () => {
      const cues = engine.getCurrentCues(0.5, 'user1'); // 0.5 seconds

      expect(cues).toHaveLength(0);
    });

    it('should apply offset to cue timing', () => {
      engine.updateTrackOffset('test-track', 1000); // 1 second offset

      const cues = engine.getCurrentCues(3, 'user1'); // 3 seconds with 1s offset = 2s effective

      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe('First subtitle');
    });

    it('should apply negative offset to cue timing', () => {
      engine.updateTrackOffset('test-track', -1000); // -1 second offset

      const cues = engine.getCurrentCues(1, 'user1'); // 1 second with -1s offset = 2s effective

      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe('First subtitle');
    });

    it('should handle multiple simultaneous cues with different offsets', () => {
      // Add a second track with different offset
      const track2: SubtitleTrack = {
        id: 'test-track-2',
        userId: 'user1',
        language: 'es',
        source: 'file',
        content: `1
00:00:02,000 --> 00:00:04,000
Segundo subtítulo`,
        offset: 500, // 0.5 second offset
        enabled: true,
        fileName: 'test-es.srt',
        createdAt: new Date(),
      };
      engine.addTrack(track2);

      const cues = engine.getCurrentCues(2.5, 'user1'); // Should get both cues

      expect(cues).toHaveLength(2);
      expect(cues.map((c) => c.text)).toContain('First subtitle');
      expect(cues.map((c) => c.text)).toContain('Segundo subtítulo');
    });

    it('should ignore disabled tracks', () => {
      engine.toggleTrack('test-track', false);

      const cues = engine.getCurrentCues(2, 'user1');

      expect(cues).toHaveLength(0);
    });

    it('should handle precise timing boundaries', () => {
      // Test exact start time
      const cuesAtStart = engine.getCurrentCues(1, 'user1');
      expect(cuesAtStart).toHaveLength(1);

      // Test exact end time
      const cuesAtEnd = engine.getCurrentCues(3, 'user1');
      expect(cuesAtEnd).toHaveLength(1);

      // Test just before start
      const cuesBeforeStart = engine.getCurrentCues(0.999, 'user1');
      expect(cuesBeforeStart).toHaveLength(0);

      // Test just after end
      const cuesAfterEnd = engine.getCurrentCues(3.001, 'user1');
      expect(cuesAfterEnd).toHaveLength(0);
    });
  });

  describe('Subtitle rendering', () => {
    it('should render cues in container', () => {
      const container = document.createElement('div');
      const cues = [
        { startTime: 1, endTime: 3, text: 'First subtitle', id: 'cue1' },
        { startTime: 2, endTime: 4, text: 'Second subtitle', id: 'cue2' },
      ];

      engine.renderSubtitles(cues, container);

      expect(container.children).toHaveLength(2);
      expect(container.children[0].textContent).toBe('First subtitle');
      expect(container.children[1].textContent).toBe('Second subtitle');
    });

    it('should clear container when no cues', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div>existing content</div>';

      engine.renderSubtitles([], container);

      expect(container.innerHTML).toBe('');
    });

    it('should apply proper styling to subtitle elements', () => {
      const container = document.createElement('div');
      const cues = [{ startTime: 1, endTime: 3, text: 'Test subtitle', id: 'cue1' }];

      engine.renderSubtitles(cues, container, 'test-user');

      const subtitleElement = container.children[0] as HTMLElement;
      expect(subtitleElement.className).toBe('subtitle-cue subtitle-lang-unknown');
      expect(subtitleElement.style.position).toBe('absolute');
      expect(subtitleElement.style.color).toBe('rgb(255, 255, 255)');
    });
  });

  describe('OpenSubtitles integration', () => {
    beforeEach(() => {
      // Mock the OpenSubtitlesClient
      vi.clearAllMocks();
      global.fetch = vi.fn();
    });

    it('should search OpenSubtitles when API key is configured', async () => {
      const mockResponse = {
        data: [
          {
            id: '123',
            attributes: {
              language: 'en',
              download_count: '100',
              ratings: '8.5',
              files: [
                {
                  file_id: 456,
                  file_name: 'movie.srt',
                },
              ],
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await engine.searchOpenSubtitles({ query: 'test movie', languages: ['en'] });

      expect(results).toHaveLength(1);
      expect(results[0].language).toBe('en');
    });

    it('should throw error when OpenSubtitles API key not configured', async () => {
      const engineWithoutKey = new SubtitleEngineImpl({
        ...config,
        openSubtitlesApiKey: undefined,
      });

      await expect(engineWithoutKey.searchOpenSubtitles('test')).rejects.toThrow(
        'OpenSubtitles API key not configured'
      );
    });

    it('should download and validate subtitle from OpenSubtitles', async () => {
      const mockDownloadResponse = {
        link: 'https://example.com/subtitle.srt',
      };

      const mockSubtitleContent = `1
00:00:01,000 --> 00:00:03,000
Downloaded subtitle`;

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDownloadResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockSubtitleContent),
        });

      const searchResult = {
        id: '123',
        language: 'en',
        fileName: 'movie.srt',
        downloadUrl: '',
        rating: 8.5,
        downloadCount: 100,
      };

      const track = await engine.downloadFromOpenSubtitles(searchResult);

      expect(track.source).toBe('opensubtitles');
      expect(track.content).toBe(mockSubtitleContent);
      expect(engine.getTrack(track.id)).toBeTruthy();
    });

    it('should reject invalid downloaded content', async () => {
      const mockDownloadResponse = {
        link: 'https://example.com/subtitle.srt',
      };

      const invalidContent = 'This is not a valid subtitle file';

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDownloadResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(invalidContent),
        });

      const searchResult = {
        id: '123',
        language: 'en',
        fileName: 'movie.srt',
        downloadUrl: '',
        rating: 8.5,
        downloadCount: 100,
      };

      await expect(engine.downloadFromOpenSubtitles(searchResult)).rejects.toThrow(
        'Downloaded subtitle is invalid'
      );
    });
  });

  describe('Configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxFileSizeBytes: 2 * 1024 * 1024,
        openSubtitlesApiKey: 'new-api-key',
      };

      engine.updateConfig(newConfig);

      const currentConfig = engine.getConfig();
      expect(currentConfig.maxFileSizeBytes).toBe(2 * 1024 * 1024);
      expect(currentConfig.openSubtitlesApiKey).toBe('new-api-key');
    });

    it('should clear all tracks', () => {
      const track: SubtitleTrack = {
        id: 'test-track',
        userId: 'user1',
        language: 'en',
        source: 'file',
        content: 'test content',
        offset: 0,
        enabled: true,
        createdAt: new Date(),
      };

      engine.addTrack(track);
      expect(engine.getAllTracks()).toHaveLength(1);

      engine.clearAllTracks();
      expect(engine.getAllTracks()).toHaveLength(0);
    });
  });
});

describe('OpenSubtitlesClient', () => {
  let client: OpenSubtitlesClient;

  beforeEach(() => {
    client = new OpenSubtitlesClient('test-api-key');
    // Mock fetch for testing
    global.fetch = vi.fn();
  });

  describe('Search functionality', () => {
    it('should search for subtitles', async () => {
      const mockResponse = {
        data: [
          {
            id: '123',
            attributes: {
              language: 'en',
              download_count: '100',
              ratings: '8.5',
              files: [
                {
                  file_id: 456,
                  file_name: 'movie.srt',
                },
              ],
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await client.searchSubtitles('test movie');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('456');
      expect(results[0].language).toBe('en');
      expect(results[0].fileName).toBe('movie.srt');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(client.searchSubtitles('test')).rejects.toThrow('Invalid OpenSubtitles API key');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(client.searchSubtitles('test')).rejects.toThrow('rate limit exceeded');
    });

    it('should reject empty queries', async () => {
      await expect(client.searchSubtitles('')).rejects.toThrow('Search query cannot be empty');
    });
  });

  describe('Download functionality', () => {
    it('should download subtitle file', async () => {
      const mockDownloadResponse = {
        link: 'https://example.com/subtitle.srt',
      };

      const mockSubtitleContent = `1
00:00:01,000 --> 00:00:03,000
Downloaded subtitle`;

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDownloadResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockSubtitleContent),
        });

      const result = {
        id: '123',
        language: 'en',
        fileName: 'movie.srt',
        downloadUrl: '',
        rating: 8.5,
        downloadCount: 100,
      };

      const track = await client.downloadSubtitle(result);

      expect(track.content).toBe(mockSubtitleContent);
      expect(track.language).toBe('en');
      expect(track.source).toBe('opensubtitles');
    });

    it('should handle download failures', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = {
        id: '123',
        language: 'en',
        fileName: 'movie.srt',
        downloadUrl: '',
        rating: 8.5,
        downloadCount: 100,
      };

      await expect(client.downloadSubtitle(result)).rejects.toThrow('Subtitle file not found');
    });

    it('should handle empty downloaded content', async () => {
      const mockDownloadResponse = {
        link: 'https://example.com/subtitle.srt',
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDownloadResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(''),
        });

      const result = {
        id: '123',
        language: 'en',
        fileName: 'movie.srt',
        downloadUrl: '',
        rating: 8.5,
        downloadCount: 100,
      };

      await expect(client.downloadSubtitle(result)).rejects.toThrow(
        'Downloaded subtitle file is empty'
      );
    });

    it('should handle timeout during download', async () => {
      const mockDownloadResponse = {
        link: 'https://example.com/subtitle.srt',
      };

      // Create a proper AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      // Mock first call to succeed, second call to timeout
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDownloadResponse),
        })
        .mockRejectedValueOnce(abortError);

      const result = {
        id: '123',
        language: 'en',
        fileName: 'movie.srt',
        downloadUrl: '',
        rating: 8.5,
        downloadCount: 100,
      };

      await expect(client.downloadSubtitle(result)).rejects.toThrow(
        'OpenSubtitles download timed out'
      );
    });
  });

  describe('API key validation', () => {
    it('should validate correct API key', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const isValid = await client.validateApiKey();

      expect(isValid).toBe(true);
    });

    it('should reject invalid API key', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const isValid = await client.validateApiKey();

      expect(isValid).toBe(false);
    });

    it('should handle network errors during validation', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const isValid = await client.validateApiKey();

      expect(isValid).toBe(false);
    });
  });
});
