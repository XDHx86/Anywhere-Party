/**
 * Main Collaboration Manager
 * Coordinates all advanced collaboration features
 * Implements requirements 9.1, 9.2, 9.3
 */

import { PollManager } from './poll-manager';
import { BookmarkManager } from './bookmark-manager';
import { WhiteboardManager } from './whiteboard-manager';
import { ExportManager } from './export-manager';
import {
  CollaborationManagerOptions,
  CollaborationEvent,
  Poll,
  Quiz,
  Bookmark,
  Highlight,
  QuizQuestion,
  QuizAnswer,
  PollVote,
  QuizResponse,
  WhiteboardSession,
  WhiteboardLayer,
  WhiteboardAnnotation,
  WhiteboardAnnotationData,
  ShareableMoment,
  ShareableLink,
} from './types';

export class CollaborationManager {
  private pollManager: PollManager;
  private bookmarkManager: BookmarkManager;
  private whiteboardManager: WhiteboardManager;
  private exportManager: ExportManager;
  private options: Required<CollaborationManagerOptions>;
  private eventListeners: Set<(event: CollaborationEvent) => void> = new Set();

  constructor(options: CollaborationManagerOptions = {}) {
    this.options = {
      maxPollsPerRoom: options.maxPollsPerRoom ?? 10,
      maxQuizzesPerRoom: options.maxQuizzesPerRoom ?? 5,
      maxBookmarksPerUser: options.maxBookmarksPerUser ?? 50,
      maxHighlightsPerUser: options.maxHighlightsPerUser ?? 30,
      maxWhiteboardLayers: options.maxWhiteboardLayers ?? 10,
      maxAnnotationsPerLayer: options.maxAnnotationsPerLayer ?? 100,
      thumbnailWidth: options.thumbnailWidth ?? 160,
      thumbnailHeight: options.thumbnailHeight ?? 90,
      thumbnailQuality: options.thumbnailQuality ?? 0.8,
      onPollCreated: options.onPollCreated ?? (() => {}),
      onPollVoted: options.onPollVoted ?? (() => {}),
      onQuizCreated: options.onQuizCreated ?? (() => {}),
      onQuizAnswered: options.onQuizAnswered ?? (() => {}),
      onBookmarkCreated: options.onBookmarkCreated ?? (() => {}),
      onHighlightCreated: options.onHighlightCreated ?? (() => {}),
      onWhiteboardAnnotationCreated: options.onWhiteboardAnnotationCreated ?? (() => {}),
      onMomentShared: options.onMomentShared ?? (() => {}),
    };

    // Initialize sub-managers
    this.pollManager = new PollManager({
      maxPollsPerRoom: this.options.maxPollsPerRoom,
      maxQuizzesPerRoom: this.options.maxQuizzesPerRoom,
      onPollCreated: this.options.onPollCreated,
      onPollVoted: this.options.onPollVoted,
      onQuizCreated: this.options.onQuizCreated,
      onQuizAnswered: this.options.onQuizAnswered,
      onCollaborationEvent: (event) => this.broadcastEvent(event),
    });

    this.bookmarkManager = new BookmarkManager({
      maxBookmarksPerUser: this.options.maxBookmarksPerUser,
      maxHighlightsPerUser: this.options.maxHighlightsPerUser,
      thumbnailWidth: this.options.thumbnailWidth,
      thumbnailHeight: this.options.thumbnailHeight,
      thumbnailQuality: this.options.thumbnailQuality,
      onBookmarkCreated: this.options.onBookmarkCreated,
      onHighlightCreated: this.options.onHighlightCreated,
      onCollaborationEvent: (event) => this.broadcastEvent(event),
    });

    this.whiteboardManager = new WhiteboardManager({
      maxLayers: this.options.maxWhiteboardLayers,
      maxAnnotationsPerLayer: this.options.maxAnnotationsPerLayer,
      onAnnotationCreated: this.options.onWhiteboardAnnotationCreated,
      onCollaborationEvent: (event) => this.broadcastEvent(event),
    });

    this.exportManager = new ExportManager({
      onMomentShared: this.options.onMomentShared,
      onCollaborationEvent: (event) => this.broadcastEvent(event),
    });

    console.log('Collaboration manager initialized');
  }

  // Poll Management
  createPoll(
    userId: string,
    userName: string,
    roomId: string,
    title: string,
    question: string,
    options: string[],
    videoTimestamp: number,
    duration?: number,
    allowMultipleChoices = false,
    isAnonymous = false
  ): Poll {
    return this.pollManager.createPoll(
      userId,
      userName,
      roomId,
      title,
      question,
      options,
      videoTimestamp,
      duration,
      allowMultipleChoices,
      isAnonymous
    );
  }

  votePoll(pollId: string, userId: string, userName: string, optionIds: string[]) {
    return this.pollManager.votePoll(pollId, userId, userName, optionIds);
  }

  closePoll(pollId: string): boolean {
    return this.pollManager.closePoll(pollId);
  }

  getPoll(pollId: string) {
    return this.pollManager.getPoll(pollId);
  }

  getActivePollsByRoom(roomId: string) {
    return this.pollManager.getActivePollsByRoom(roomId);
  }

  getPollResults(pollId: string) {
    return this.pollManager.getPollResults(pollId);
  }

  // Quiz Management
  createQuiz(
    userId: string,
    userName: string,
    roomId: string,
    title: string,
    questions: Omit<QuizQuestion, 'id'>[],
    videoTimestamp: number,
    duration?: number,
    isAnonymous = false
  ): Quiz {
    return this.pollManager.createQuiz(
      userId,
      userName,
      roomId,
      title,
      questions,
      videoTimestamp,
      duration,
      isAnonymous
    );
  }

  answerQuiz(
    quizId: string,
    userId: string,
    userName: string,
    answers: Omit<QuizAnswer, 'isCorrect' | 'points'>[]
  ) {
    return this.pollManager.answerQuiz(quizId, userId, userName, answers);
  }

  closeQuiz(quizId: string): boolean {
    return this.pollManager.closeQuiz(quizId);
  }

  getQuiz(quizId: string) {
    return this.pollManager.getQuiz(quizId);
  }

  getActiveQuizzesByRoom(roomId: string) {
    return this.pollManager.getActiveQuizzesByRoom(roomId);
  }

  getQuizResults(quizId: string) {
    return this.pollManager.getQuizResults(quizId);
  }

  // Bookmark Management
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
    return this.bookmarkManager.createBookmark(
      userId,
      userName,
      roomId,
      title,
      videoTimestamp,
      videoElement,
      description,
      tags,
      isPublic
    );
  }

  updateBookmark(
    bookmarkId: string,
    userId: string,
    updates: Partial<Pick<Bookmark, 'title' | 'description' | 'tags' | 'isPublic'>>
  ): Bookmark {
    return this.bookmarkManager.updateBookmark(bookmarkId, userId, updates);
  }

  deleteBookmark(bookmarkId: string, userId: string): boolean {
    return this.bookmarkManager.deleteBookmark(bookmarkId, userId);
  }

  getBookmark(bookmarkId: string) {
    return this.bookmarkManager.getBookmark(bookmarkId);
  }

  getBookmarksByRoom(roomId: string, includePrivate = false) {
    return this.bookmarkManager.getBookmarksByRoom(roomId, includePrivate);
  }

  getBookmarksInTimeRange(roomId: string, startTime: number, endTime: number) {
    return this.bookmarkManager.getBookmarksInTimeRange(roomId, startTime, endTime);
  }

  // Highlight Management
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
    return this.bookmarkManager.createHighlight(
      userId,
      userName,
      roomId,
      title,
      startTimestamp,
      endTimestamp,
      videoElement,
      description,
      tags,
      isPublic
    );
  }

  updateHighlight(
    highlightId: string,
    userId: string,
    updates: Partial<Pick<Highlight, 'title' | 'description' | 'tags' | 'isPublic'>>
  ): Highlight {
    return this.bookmarkManager.updateHighlight(highlightId, userId, updates);
  }

  deleteHighlight(highlightId: string, userId: string): boolean {
    return this.bookmarkManager.deleteHighlight(highlightId, userId);
  }

  getHighlight(highlightId: string) {
    return this.bookmarkManager.getHighlight(highlightId);
  }

  getHighlightsByRoom(roomId: string, includePrivate = false) {
    return this.bookmarkManager.getHighlightsByRoom(roomId, includePrivate);
  }

  getHighlightsInTimeRange(roomId: string, startTime: number, endTime: number) {
    return this.bookmarkManager.getHighlightsInTimeRange(roomId, startTime, endTime);
  }

  // Search
  searchBookmarksAndHighlights(query: string, roomId?: string) {
    return this.bookmarkManager.search(query, roomId);
  }

  // Whiteboard Management
  createWhiteboardSession(
    roomId: string,
    videoTimestamp: number,
    creatorId: string
  ): WhiteboardSession {
    return this.whiteboardManager.createSession(roomId, videoTimestamp, creatorId);
  }

  joinWhiteboardSession(sessionId: string, userId: string): boolean {
    return this.whiteboardManager.joinSession(sessionId, userId);
  }

  leaveWhiteboardSession(sessionId: string, userId: string): boolean {
    return this.whiteboardManager.leaveSession(sessionId, userId);
  }

  createWhiteboardLayer(
    sessionId: string,
    userId: string,
    name: string,
    collaborators: string[] = []
  ) {
    return this.whiteboardManager.createLayer(sessionId, userId, name, collaborators);
  }

  updateWhiteboardLayer(
    sessionId: string,
    layerId: string,
    userId: string,
    updates: Partial<
      Pick<WhiteboardLayer, 'name' | 'visible' | 'locked' | 'opacity' | 'collaborators'>
    >
  ) {
    return this.whiteboardManager.updateLayer(sessionId, layerId, userId, updates);
  }

  deleteWhiteboardLayer(sessionId: string, layerId: string, userId: string): boolean {
    return this.whiteboardManager.deleteLayer(sessionId, layerId, userId);
  }

  createWhiteboardAnnotation(
    sessionId: string,
    layerId: string,
    userId: string,
    userName: string,
    type: WhiteboardAnnotation['type'],
    data: WhiteboardAnnotationData,
    videoTimestamp: number
  ) {
    return this.whiteboardManager.createAnnotation(
      sessionId,
      layerId,
      userId,
      userName,
      type,
      data,
      videoTimestamp
    );
  }

  updateWhiteboardAnnotation(
    sessionId: string,
    layerId: string,
    annotationId: string,
    userId: string,
    updates: Partial<Pick<WhiteboardAnnotation, 'data' | 'visible' | 'locked'>>
  ) {
    return this.whiteboardManager.updateAnnotation(
      sessionId,
      layerId,
      annotationId,
      userId,
      updates
    );
  }

  deleteWhiteboardAnnotation(
    sessionId: string,
    layerId: string,
    annotationId: string,
    userId: string
  ): boolean {
    return this.whiteboardManager.deleteAnnotation(sessionId, layerId, annotationId, userId);
  }

  getWhiteboardSession(sessionId: string) {
    return this.whiteboardManager.getSession(sessionId);
  }

  getWhiteboardSessionsByRoom(roomId: string) {
    return this.whiteboardManager.getSessionsByRoom(roomId);
  }

  getWhiteboardTools() {
    return this.whiteboardManager.getTools();
  }

  // Export and Sharing
  exportPollResults(poll: Poll, votes: PollVote[], userId: string, userName: string) {
    return this.exportManager.exportPollResults(poll, votes, userId, userName);
  }

  exportQuizResults(quiz: Quiz, responses: QuizResponse[], userId: string, userName: string) {
    return this.exportManager.exportQuizResults(quiz, responses, userId, userName);
  }

  exportBookmarks(
    bookmarks: Bookmark[],
    userId: string,
    userName: string,
    title: string,
    roomId: string
  ) {
    return this.exportManager.exportBookmarks(bookmarks, userId, userName, title, roomId);
  }

  exportHighlights(
    highlights: Highlight[],
    userId: string,
    userName: string,
    title: string,
    roomId: string
  ) {
    return this.exportManager.exportHighlights(highlights, userId, userName, title, roomId);
  }

  exportWhiteboardSession(session: WhiteboardSession, userId: string, userName: string) {
    return this.exportManager.exportWhiteboardSession(session, userId, userName);
  }

  createShareableLink(
    type: ShareableLink['type'],
    resourceId: string,
    roomId: string,
    videoTimestamp: number,
    createdBy: string,
    isPublic = true,
    expirationMs?: number
  ) {
    return this.exportManager.createShareableLink(
      type,
      resourceId,
      roomId,
      videoTimestamp,
      createdBy,
      isPublic,
      expirationMs
    );
  }

  createShareableMoment(
    title: string,
    roomId: string,
    startTimestamp: number,
    endTimestamp: number,
    createdBy: string,
    userName: string,
    description?: string,
    videoUrl?: string,
    thumbnail?: string,
    annotations: WhiteboardAnnotation[] = [],
    polls: Poll[] = [],
    bookmarks: Bookmark[] = [],
    highlights: Highlight[] = []
  ): ShareableMoment {
    return this.exportManager.createShareableMoment(
      title,
      roomId,
      startTimestamp,
      endTimestamp,
      createdBy,
      userName,
      description,
      videoUrl,
      thumbnail,
      annotations,
      polls,
      bookmarks,
      highlights
    );
  }

  getExportedResult(resultId: string) {
    return this.exportManager.getExportedResult(resultId);
  }

  getShareableLink(linkId: string) {
    return this.exportManager.getShareableLink(linkId);
  }

  getShareableMoment(momentId: string) {
    return this.exportManager.getShareableMoment(momentId);
  }

  validateLinkAccess(linkId: string, accessCode?: string): boolean {
    return this.exportManager.validateLinkAccess(linkId, accessCode);
  }

  exportToJSON(resultId: string): string {
    return this.exportManager.exportToJSON(resultId);
  }

  exportToCSV(resultId: string): string {
    return this.exportManager.exportToCSV(resultId);
  }

  // Event Management
  addEventListener(listener: (event: CollaborationEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private broadcastEvent(event: CollaborationEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in collaboration event listener:', error);
      }
    });
  }

  // Utility Methods
  cleanup(): void {
    this.pollManager.cleanup();
    this.exportManager.cleanup();
  }

  clear(): void {
    this.pollManager.clear();
    this.bookmarkManager.clear();
    this.whiteboardManager.clear();
    this.exportManager.clear();
  }

  // Get comprehensive room activity
  getRoomActivity(roomId: string) {
    return {
      polls: this.pollManager.getPollsByRoom(roomId),
      quizzes: this.pollManager.getQuizzesByRoom(roomId),
      bookmarks: this.bookmarkManager.getBookmarksByRoom(roomId, false),
      highlights: this.bookmarkManager.getHighlightsByRoom(roomId, false),
      whiteboardSessions: this.whiteboardManager.getSessionsByRoom(roomId),
      exportedResults: this.exportManager.getExportedResultsByRoom(roomId),
      shareableMoments: this.exportManager.getShareableMomentsByRoom(roomId),
    };
  }

  // Get user activity across all rooms
  getUserActivity(userId: string) {
    return {
      bookmarks: this.bookmarkManager.getBookmarksByUser(userId),
      highlights: this.bookmarkManager.getHighlightsByUser(userId),
      whiteboardSessions: this.whiteboardManager.getSessionsByParticipant(userId),
      exportedResults: this.exportManager.getExportedResultsByUser(userId),
    };
  }
}
