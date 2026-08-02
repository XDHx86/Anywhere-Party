/**
 * Bookmark and Highlight Manager
 * Implements requirements 9.1, 9.2 for timestamped bookmarks and highlights with thumbnails
 */

import { Bookmark, Highlight, CollaborationEvent } from './types';

export interface BookmarkManagerOptions {
  maxBookmarksPerUser?: number;
  maxHighlightsPerUser?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailQuality?: number;
  onBookmarkCreated?: (bookmark: Bookmark) => void;
  onBookmarkUpdated?: (bookmark: Bookmark) => void;
  onBookmarkDeleted?: (bookmarkId: string) => void;
  onHighlightCreated?: (highlight: Highlight) => void;
  onHighlightUpdated?: (highlight: Highlight) => void;
  onHighlightDeleted?: (highlightId: string) => void;
  onCollaborationEvent?: (event: CollaborationEvent) => void;
}

export class BookmarkManager {
  private bookmarks: Map<string, Bookmark> = new Map();
  private highlights: Map<string, Highlight> = new Map();
  private options: Required<BookmarkManagerOptions>;

  constructor(options: BookmarkManagerOptions = {}) {
    this.options = {
      maxBookmarksPerUser: options.maxBookmarksPerUser ?? 50,
      maxHighlightsPerUser: options.maxHighlightsPerUser ?? 30,
      thumbnailWidth: options.thumbnailWidth ?? 160,
      thumbnailHeight: options.thumbnailHeight ?? 90,
      thumbnailQuality: options.thumbnailQuality ?? 0.8,
      onBookmarkCreated: options.onBookmarkCreated ?? (() => {}),
      onBookmarkUpdated: options.onBookmarkUpdated ?? (() => {}),
      onBookmarkDeleted: options.onBookmarkDeleted ?? (() => {}),
      onHighlightCreated: options.onHighlightCreated ?? (() => {}),
      onHighlightUpdated: options.onHighlightUpdated ?? (() => {}),
      onHighlightDeleted: options.onHighlightDeleted ?? (() => {}),
      onCollaborationEvent: options.onCollaborationEvent ?? (() => {}),
    };
  }

  /**
   * Create a bookmark at current video timestamp
   */
  async createBookmark(
    userId: string,
    userName: string,
    roomId: string,
    title: string,
    videoTimestamp: number,
    videoElement?: HTMLVideoElement,
    description?: string,
    tags: string[] = [],
    isPublic = true
  ): Promise<Bookmark> {
    // Check user bookmark limit
    const userBookmarks = this.getBookmarksByUser(userId);
    if (userBookmarks.length >= this.options.maxBookmarksPerUser) {
      throw new Error('Maximum bookmarks per user reached');
    }

    // Validate inputs
    if (!title.trim()) {
      throw new Error('Bookmark title is required');
    }

    if (videoTimestamp < 0) {
      throw new Error('Video timestamp must be non-negative');
    }

    // Generate thumbnail if video element is provided
    let thumbnail: string | undefined;
    if (videoElement) {
      try {
        thumbnail = await this.generateThumbnail(videoElement);
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
      }
    }

    const now = Date.now();
    const bookmark: Bookmark = {
      id: this.generateId(),
      userId,
      userName,
      roomId,
      title: title.trim(),
      description: description?.trim(),
      videoTimestamp,
      thumbnail,
      tags: tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0),
      isPublic,
      createdAt: now,
      updatedAt: now,
    };

    this.bookmarks.set(bookmark.id, bookmark);

    // Notify callbacks
    this.options.onBookmarkCreated(bookmark);
    this.options.onCollaborationEvent({
      type: 'bookmark_created',
      userId,
      userName,
      roomId,
      timestamp: now,
      data: bookmark,
    });

    console.log('Bookmark created:', bookmark.id, title);
    return bookmark;
  }

  /**
   * Update an existing bookmark
   */
  updateBookmark(
    bookmarkId: string,
    userId: string,
    updates: Partial<Pick<Bookmark, 'title' | 'description' | 'tags' | 'isPublic'>>
  ): Bookmark {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) {
      throw new Error('Bookmark not found');
    }

    if (bookmark.userId !== userId) {
      throw new Error('Not authorized to update this bookmark');
    }

    // Apply updates
    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        throw new Error('Bookmark title cannot be empty');
      }
      bookmark.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      bookmark.description = updates.description?.trim();
    }

    if (updates.tags !== undefined) {
      bookmark.tags = updates.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    }

    if (updates.isPublic !== undefined) {
      bookmark.isPublic = updates.isPublic;
    }

    bookmark.updatedAt = Date.now();

    // Notify callbacks
    this.options.onBookmarkUpdated(bookmark);
    this.options.onCollaborationEvent({
      type: 'bookmark_updated',
      userId,
      userName: bookmark.userName,
      roomId: bookmark.roomId,
      timestamp: bookmark.updatedAt,
      data: { bookmarkId, updates },
    });

    console.log('Bookmark updated:', bookmarkId);
    return bookmark;
  }

  /**
   * Delete a bookmark
   */
  deleteBookmark(bookmarkId: string, userId: string): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) {
      return false;
    }

    if (bookmark.userId !== userId) {
      throw new Error('Not authorized to delete this bookmark');
    }

    this.bookmarks.delete(bookmarkId);

    // Notify callbacks
    this.options.onBookmarkDeleted(bookmarkId);
    this.options.onCollaborationEvent({
      type: 'bookmark_deleted',
      userId,
      userName: bookmark.userName,
      roomId: bookmark.roomId,
      timestamp: Date.now(),
      data: { bookmarkId },
    });

    console.log('Bookmark deleted:', bookmarkId);
    return true;
  }

  /**
   * Create a highlight for a time range
   */
  async createHighlight(
    userId: string,
    userName: string,
    roomId: string,
    title: string,
    startTimestamp: number,
    endTimestamp: number,
    videoElement?: HTMLVideoElement,
    description?: string,
    tags: string[] = [],
    isPublic = true
  ): Promise<Highlight> {
    // Check user highlight limit
    const userHighlights = this.getHighlightsByUser(userId);
    if (userHighlights.length >= this.options.maxHighlightsPerUser) {
      throw new Error('Maximum highlights per user reached');
    }

    // Validate inputs
    if (!title.trim()) {
      throw new Error('Highlight title is required');
    }

    if (startTimestamp < 0 || endTimestamp < 0) {
      throw new Error('Timestamps must be non-negative');
    }

    if (startTimestamp >= endTimestamp) {
      throw new Error('End timestamp must be after start timestamp');
    }

    if (endTimestamp - startTimestamp > 600) {
      // 10 minutes max
      throw new Error('Highlight duration cannot exceed 10 minutes');
    }

    // Generate thumbnail if video element is provided
    let thumbnail: string | undefined;
    if (videoElement) {
      try {
        // Seek to start timestamp for thumbnail
        const originalTime = videoElement.currentTime;
        videoElement.currentTime = startTimestamp;

        // Wait for seek to complete
        await new Promise((resolve) => {
          const onSeeked = () => {
            videoElement.removeEventListener('seeked', onSeeked);
            resolve(void 0);
          };
          videoElement.addEventListener('seeked', onSeeked);
        });

        thumbnail = await this.generateThumbnail(videoElement);

        // Restore original time
        videoElement.currentTime = originalTime;
      } catch (error) {
        console.warn('Failed to generate highlight thumbnail:', error);
      }
    }

    const now = Date.now();
    const highlight: Highlight = {
      id: this.generateId(),
      userId,
      userName,
      roomId,
      title: title.trim(),
      description: description?.trim(),
      startTimestamp,
      endTimestamp,
      thumbnail,
      tags: tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0),
      isPublic,
      createdAt: now,
      updatedAt: now,
    };

    this.highlights.set(highlight.id, highlight);

    // Notify callbacks
    this.options.onHighlightCreated(highlight);
    this.options.onCollaborationEvent({
      type: 'highlight_created',
      userId,
      userName,
      roomId,
      timestamp: now,
      data: highlight,
    });

    console.log('Highlight created:', highlight.id, title, `${startTimestamp}-${endTimestamp}s`);
    return highlight;
  }

  /**
   * Update an existing highlight
   */
  updateHighlight(
    highlightId: string,
    userId: string,
    updates: Partial<Pick<Highlight, 'title' | 'description' | 'tags' | 'isPublic'>>
  ): Highlight {
    const highlight = this.highlights.get(highlightId);
    if (!highlight) {
      throw new Error('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new Error('Not authorized to update this highlight');
    }

    // Apply updates
    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        throw new Error('Highlight title cannot be empty');
      }
      highlight.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      highlight.description = updates.description?.trim();
    }

    if (updates.tags !== undefined) {
      highlight.tags = updates.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
    }

    if (updates.isPublic !== undefined) {
      highlight.isPublic = updates.isPublic;
    }

    highlight.updatedAt = Date.now();

    // Notify callbacks
    this.options.onHighlightUpdated(highlight);
    this.options.onCollaborationEvent({
      type: 'highlight_updated',
      userId,
      userName: highlight.userName,
      roomId: highlight.roomId,
      timestamp: highlight.updatedAt,
      data: { highlightId, updates },
    });

    console.log('Highlight updated:', highlightId);
    return highlight;
  }

  /**
   * Delete a highlight
   */
  deleteHighlight(highlightId: string, userId: string): boolean {
    const highlight = this.highlights.get(highlightId);
    if (!highlight) {
      return false;
    }

    if (highlight.userId !== userId) {
      throw new Error('Not authorized to delete this highlight');
    }

    this.highlights.delete(highlightId);

    // Notify callbacks
    this.options.onHighlightDeleted(highlightId);
    this.options.onCollaborationEvent({
      type: 'highlight_deleted',
      userId,
      userName: highlight.userName,
      roomId: highlight.roomId,
      timestamp: Date.now(),
      data: { highlightId },
    });

    console.log('Highlight deleted:', highlightId);
    return true;
  }

  /**
   * Get bookmark by ID
   */
  getBookmark(bookmarkId: string): Bookmark | undefined {
    return this.bookmarks.get(bookmarkId);
  }

  /**
   * Get bookmarks by room
   */
  getBookmarksByRoom(roomId: string, includePrivate = false): Bookmark[] {
    return Array.from(this.bookmarks.values()).filter(
      (bookmark) => bookmark.roomId === roomId && (includePrivate || bookmark.isPublic)
    );
  }

  /**
   * Get bookmarks by user
   */
  getBookmarksByUser(userId: string): Bookmark[] {
    return Array.from(this.bookmarks.values()).filter((bookmark) => bookmark.userId === userId);
  }

  /**
   * Get bookmarks by tags
   */
  getBookmarksByTags(tags: string[], roomId?: string): Bookmark[] {
    const normalizedTags = tags.map((tag) => tag.toLowerCase());
    return Array.from(this.bookmarks.values()).filter((bookmark) => {
      if (roomId && bookmark.roomId !== roomId) return false;
      if (!bookmark.isPublic) return false;
      return normalizedTags.some((tag) => bookmark.tags.includes(tag));
    });
  }

  /**
   * Get bookmarks in time range
   */
  getBookmarksInTimeRange(roomId: string, startTime: number, endTime: number): Bookmark[] {
    return this.getBookmarksByRoom(roomId, false).filter(
      (bookmark) => bookmark.videoTimestamp >= startTime && bookmark.videoTimestamp <= endTime
    );
  }

  /**
   * Get highlight by ID
   */
  getHighlight(highlightId: string): Highlight | undefined {
    return this.highlights.get(highlightId);
  }

  /**
   * Get highlights by room
   */
  getHighlightsByRoom(roomId: string, includePrivate = false): Highlight[] {
    return Array.from(this.highlights.values()).filter(
      (highlight) => highlight.roomId === roomId && (includePrivate || highlight.isPublic)
    );
  }

  /**
   * Get highlights by user
   */
  getHighlightsByUser(userId: string): Highlight[] {
    return Array.from(this.highlights.values()).filter((highlight) => highlight.userId === userId);
  }

  /**
   * Get highlights by tags
   */
  getHighlightsByTags(tags: string[], roomId?: string): Highlight[] {
    const normalizedTags = tags.map((tag) => tag.toLowerCase());
    return Array.from(this.highlights.values()).filter((highlight) => {
      if (roomId && highlight.roomId !== roomId) return false;
      if (!highlight.isPublic) return false;
      return normalizedTags.some((tag) => highlight.tags.includes(tag));
    });
  }

  /**
   * Get highlights that overlap with time range
   */
  getHighlightsInTimeRange(roomId: string, startTime: number, endTime: number): Highlight[] {
    return this.getHighlightsByRoom(roomId, false).filter(
      (highlight) => highlight.startTimestamp < endTime && highlight.endTimestamp > startTime
    );
  }

  /**
   * Search bookmarks and highlights
   */
  search(query: string, roomId?: string): { bookmarks: Bookmark[]; highlights: Highlight[] } {
    const normalizedQuery = query.toLowerCase();

    const bookmarks = Array.from(this.bookmarks.values()).filter((bookmark) => {
      if (roomId && bookmark.roomId !== roomId) return false;
      if (!bookmark.isPublic) return false;

      return (
        bookmark.title.toLowerCase().includes(normalizedQuery) ||
        bookmark.description?.toLowerCase().includes(normalizedQuery) ||
        bookmark.tags.some((tag) => tag.includes(normalizedQuery))
      );
    });

    const highlights = Array.from(this.highlights.values()).filter((highlight) => {
      if (roomId && highlight.roomId !== roomId) return false;
      if (!highlight.isPublic) return false;

      return (
        highlight.title.toLowerCase().includes(normalizedQuery) ||
        highlight.description?.toLowerCase().includes(normalizedQuery) ||
        highlight.tags.some((tag) => tag.includes(normalizedQuery))
      );
    });

    return { bookmarks, highlights };
  }

  /**
   * Generate thumbnail from video element
   */
  private async generateThumbnail(videoElement: HTMLVideoElement): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        // Set canvas size
        canvas.width = this.options.thumbnailWidth;
        canvas.height = this.options.thumbnailHeight;

        // Draw video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg', this.options.thumbnailQuality);
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.bookmarks.clear();
    this.highlights.clear();
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
