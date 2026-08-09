/**
 * Export Manager for Shareable Results and Moments
 * Implements requirements 9.1, 9.2, 9.3 for exportable results and shareable moments
 */

import {
  ExportableResult,
  ShareableLink,
  ShareableMoment,
  Poll,
  Quiz,
  Bookmark,
  Highlight,
  PollVote,
  PollOption,
  QuizResponse,
  QuizAnswer,
  WhiteboardSession,
  WhiteboardAnnotation,
  CollaborationEvent,
} from './types';

export interface ExportManagerOptions {
  maxExportsPerUser?: number;
  maxShareableLinks?: number;
  defaultLinkExpiration?: number; // in milliseconds
  onResultExported?: (result: ExportableResult) => void;
  onLinkCreated?: (link: ShareableLink) => void;
  onMomentShared?: (moment: ShareableMoment) => void;
  onCollaborationEvent?: (event: CollaborationEvent) => void;
}

export class ExportManager {
  private exportedResults: Map<string, ExportableResult> = new Map();
  private shareableLinks: Map<string, ShareableLink> = new Map();
  private shareableMoments: Map<string, ShareableMoment> = new Map();
  private options: Required<ExportManagerOptions>;

  constructor(options: ExportManagerOptions = {}) {
    this.options = {
      maxExportsPerUser: options.maxExportsPerUser ?? 100,
      maxShareableLinks: options.maxShareableLinks ?? 50,
      defaultLinkExpiration: options.defaultLinkExpiration ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      onResultExported: options.onResultExported ?? (() => {}),
      onLinkCreated: options.onLinkCreated ?? (() => {}),
      onMomentShared: options.onMomentShared ?? (() => {}),
      onCollaborationEvent: options.onCollaborationEvent ?? (() => {}),
    };
  }

  /**
   * Export poll results
   */
  exportPollResults(
    poll: Poll,
    votes: PollVote[],
    userId: string,
    userName: string
  ): ExportableResult {
    const result: ExportableResult = {
      id: this.generateId(),
      type: 'poll',
      title: `Poll Results: ${poll.title}`,
      description: poll.question,
      roomId: poll.roomId,
      videoTimestamp: poll.videoTimestamp,
      data: {
        poll,
        votes,
        totalVotes: votes.length,
        participantCount: new Set(votes.map((v: PollVote) => v.userId)).size,
        results: poll.options.map((option) => ({
          option: option.text,
          votes: option.votes,
          percentage: votes.length > 0 ? (option.votes / votes.length) * 100 : 0,
        })),
      },
      participants: Array.from(new Set(votes.map((v: PollVote) => v.userId))),
      createdAt: poll.createdAt,
      exportedAt: Date.now(),
    };

    this.exportedResults.set(result.id, result);

    this.options.onResultExported(result);
    this.options.onCollaborationEvent({
      type: 'poll_created', // Reuse existing event type
      userId,
      userName,
      roomId: poll.roomId,
      timestamp: result.exportedAt,
      data: { exportId: result.id, type: 'poll_export' },
    });

    console.log('Poll results exported:', result.id, poll.title);
    return result;
  }

  /**
   * Export quiz results
   */
  exportQuizResults(
    quiz: Quiz,
    responses: QuizResponse[],
    userId: string,
    userName: string
  ): ExportableResult {
    const totalResponses = responses.length;
    const averageScore =
      totalResponses > 0
        ? responses.reduce((sum: number, r: QuizResponse) => sum + r.score / r.maxScore, 0) /
          totalResponses
        : 0;

    const questionStats = quiz.questions.map((question) => {
      const questionResponses = responses
        .map((r: QuizResponse) => r.answers.find((a: QuizAnswer) => a.questionId === question.id))
        .filter((a): a is QuizAnswer => a !== undefined);

      const correctCount = questionResponses.filter((a: QuizAnswer) => a.isCorrect).length;

      return {
        question: question.question,
        type: question.type,
        correctAnswers: correctCount,
        totalAnswers: questionResponses.length,
        accuracy:
          questionResponses.length > 0 ? (correctCount / questionResponses.length) * 100 : 0,
      };
    });

    const result: ExportableResult = {
      id: this.generateId(),
      type: 'quiz',
      title: `Quiz Results: ${quiz.title}`,
      description: `Quiz with ${quiz.questions.length} questions`,
      roomId: quiz.roomId,
      videoTimestamp: quiz.videoTimestamp,
      data: {
        quiz,
        responses,
        totalResponses,
        averageScore: averageScore * 100, // Convert to percentage
        questionStats,
        topScorers: responses
          .sort((a: QuizResponse, b: QuizResponse) => b.score / b.maxScore - a.score / a.maxScore)
          .slice(0, 5)
          .map((r: QuizResponse) => ({
            userName: r.userName,
            score: r.score,
            maxScore: r.maxScore,
            percentage: (r.score / r.maxScore) * 100,
          })),
      },
      participants: Array.from(new Set(responses.map((r: QuizResponse) => r.userId))),
      createdAt: quiz.createdAt,
      exportedAt: Date.now(),
    };

    this.exportedResults.set(result.id, result);

    this.options.onResultExported(result);
    this.options.onCollaborationEvent({
      type: 'quiz_created', // Reuse existing event type
      userId,
      userName,
      roomId: quiz.roomId,
      timestamp: result.exportedAt,
      data: { exportId: result.id, type: 'quiz_export' },
    });

    console.log('Quiz results exported:', result.id, quiz.title);
    return result;
  }

  /**
   * Export bookmark collection
   */
  exportBookmarks(
    bookmarks: Bookmark[],
    userId: string,
    userName: string,
    title: string,
    roomId: string
  ): ExportableResult {
    const result: ExportableResult = {
      id: this.generateId(),
      type: 'bookmark',
      title: `Bookmarks: ${title}`,
      description: `Collection of ${bookmarks.length} bookmarks`,
      roomId,
      videoTimestamp: bookmarks[0]?.videoTimestamp ?? 0,
      data: {
        bookmarks: bookmarks.map((bookmark) => ({
          title: bookmark.title,
          description: bookmark.description,
          videoTimestamp: bookmark.videoTimestamp,
          thumbnail: bookmark.thumbnail,
          tags: bookmark.tags,
          createdAt: bookmark.createdAt,
          userName: bookmark.userName,
        })),
        totalBookmarks: bookmarks.length,
        timeRange:
          bookmarks.length > 0
            ? {
                start: Math.min(...bookmarks.map((b) => b.videoTimestamp)),
                end: Math.max(...bookmarks.map((b) => b.videoTimestamp)),
              }
            : null,
        tagCloud: this.generateTagCloud(bookmarks.flatMap((b) => b.tags)),
      },
      participants: Array.from(new Set(bookmarks.map((b) => b.userId))),
      createdAt: Date.now(),
      exportedAt: Date.now(),
    };

    this.exportedResults.set(result.id, result);

    this.options.onResultExported(result);
    this.options.onCollaborationEvent({
      type: 'bookmark_created', // Reuse existing event type
      userId,
      userName,
      roomId,
      timestamp: result.exportedAt,
      data: { exportId: result.id, type: 'bookmark_export' },
    });

    console.log('Bookmarks exported:', result.id, title);
    return result;
  }

  /**
   * Export highlight collection
   */
  exportHighlights(
    highlights: Highlight[],
    userId: string,
    userName: string,
    title: string,
    roomId: string
  ): ExportableResult {
    const totalDuration = highlights.reduce(
      (sum, h) => sum + (h.endTimestamp - h.startTimestamp),
      0
    );

    const result: ExportableResult = {
      id: this.generateId(),
      type: 'highlight',
      title: `Highlights: ${title}`,
      description: `Collection of ${highlights.length} highlights`,
      roomId,
      videoTimestamp: highlights[0]?.startTimestamp ?? 0,
      data: {
        highlights: highlights.map((highlight) => ({
          title: highlight.title,
          description: highlight.description,
          startTimestamp: highlight.startTimestamp,
          endTimestamp: highlight.endTimestamp,
          duration: highlight.endTimestamp - highlight.startTimestamp,
          thumbnail: highlight.thumbnail,
          tags: highlight.tags,
          createdAt: highlight.createdAt,
          userName: highlight.userName,
        })),
        totalHighlights: highlights.length,
        totalDuration,
        averageDuration: highlights.length > 0 ? totalDuration / highlights.length : 0,
        timeRange:
          highlights.length > 0
            ? {
                start: Math.min(...highlights.map((h) => h.startTimestamp)),
                end: Math.max(...highlights.map((h) => h.endTimestamp)),
              }
            : null,
        tagCloud: this.generateTagCloud(highlights.flatMap((h) => h.tags)),
      },
      participants: Array.from(new Set(highlights.map((h) => h.userId))),
      createdAt: Date.now(),
      exportedAt: Date.now(),
    };

    this.exportedResults.set(result.id, result);

    this.options.onResultExported(result);
    this.options.onCollaborationEvent({
      type: 'highlight_created', // Reuse existing event type
      userId,
      userName,
      roomId,
      timestamp: result.exportedAt,
      data: { exportId: result.id, type: 'highlight_export' },
    });

    console.log('Highlights exported:', result.id, title);
    return result;
  }

  /**
   * Export whiteboard session
   */
  exportWhiteboardSession(
    session: WhiteboardSession,
    userId: string,
    userName: string
  ): ExportableResult {
    const totalAnnotations = session.layers.reduce(
      (sum, layer) => sum + layer.annotations.length,
      0
    );

    const result: ExportableResult = {
      id: this.generateId(),
      type: 'whiteboard',
      title: `Whiteboard Session`,
      description: `Collaborative whiteboard with ${totalAnnotations} annotations`,
      roomId: session.roomId,
      videoTimestamp: session.videoTimestamp,
      data: {
        session: {
          id: session.id,
          videoTimestamp: session.videoTimestamp,
          participants: session.participants,
          layers: session.layers.map((layer) => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            opacity: layer.opacity,
            ownerId: layer.ownerId,
            collaborators: layer.collaborators,
            annotationCount: layer.annotations.length,
            annotations: layer.annotations.map((annotation) => ({
              id: annotation.id,
              userId: annotation.userId,
              userName: annotation.userName,
              type: annotation.type,
              data: annotation.data,
              videoTimestamp: annotation.videoTimestamp,
              createdAt: annotation.createdAt,
            })),
          })),
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        statistics: {
          totalLayers: session.layers.length,
          totalAnnotations,
          participantCount: session.participants.length,
          annotationTypes: this.getAnnotationTypeStats(
            session.layers.flatMap((l) => l.annotations)
          ),
        },
      },
      participants: session.participants,
      createdAt: session.createdAt,
      exportedAt: Date.now(),
    };

    this.exportedResults.set(result.id, result);

    this.options.onResultExported(result);
    this.options.onCollaborationEvent({
      type: 'whiteboard_annotation_created', // Reuse existing event type
      userId,
      userName,
      roomId: session.roomId,
      timestamp: result.exportedAt,
      data: { exportId: result.id, type: 'whiteboard_export' },
    });

    console.log('Whiteboard session exported:', result.id);
    return result;
  }

  /**
   * Create shareable link for any resource
   */
  createShareableLink(
    type: ShareableLink['type'],
    resourceId: string,
    roomId: string,
    videoTimestamp: number,
    createdBy: string,
    isPublic = true,
    expirationMs?: number
  ): ShareableLink {
    if (this.shareableLinks.size >= this.options.maxShareableLinks) {
      // Clean up expired links first
      this.cleanupExpiredLinks();

      if (this.shareableLinks.size >= this.options.maxShareableLinks) {
        throw new Error('Maximum shareable links reached');
      }
    }

    const now = Date.now();
    const expiresAt = expirationMs ? now + expirationMs : now + this.options.defaultLinkExpiration;

    const link: ShareableLink = {
      id: this.generateId(),
      type,
      resourceId,
      roomId,
      videoTimestamp,
      expiresAt,
      isPublic,
      accessCode: isPublic ? undefined : this.generateAccessCode(),
      createdBy,
      createdAt: now,
    };

    this.shareableLinks.set(link.id, link);

    this.options.onLinkCreated(link);

    console.log('Shareable link created:', link.id, type, resourceId);
    return link;
  }

  /**
   * Create shareable moment combining multiple resources
   */
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
    const participants = new Set<string>();

    // Collect all participants
    annotations.forEach((a: WhiteboardAnnotation) => participants.add(a.userId));
    polls.forEach((p) => participants.add(p.userId));
    bookmarks.forEach((b) => participants.add(b.userId));
    highlights.forEach((h) => participants.add(h.userId));
    participants.add(createdBy);

    const moment: ShareableMoment = {
      id: this.generateId(),
      title: title.trim(),
      description: description?.trim(),
      roomId,
      videoUrl,
      startTimestamp,
      endTimestamp,
      thumbnail,
      annotations,
      polls,
      bookmarks,
      highlights,
      participants: Array.from(participants),
      createdBy,
      createdAt: Date.now(),
    };

    this.shareableMoments.set(moment.id, moment);

    this.options.onMomentShared(moment);
    this.options.onCollaborationEvent({
      type: 'moment_shared',
      userId: createdBy,
      userName,
      roomId,
      timestamp: moment.createdAt,
      data: { momentId: moment.id, title },
    });

    console.log('Shareable moment created:', moment.id, title);
    return moment;
  }

  /**
   * Get exported result by ID
   */
  getExportedResult(resultId: string): ExportableResult | undefined {
    return this.exportedResults.get(resultId);
  }

  /**
   * Get exported results by user
   */
  getExportedResultsByUser(userId: string): ExportableResult[] {
    return Array.from(this.exportedResults.values()).filter((result) =>
      result.participants.includes(userId)
    );
  }

  /**
   * Get exported results by room
   */
  getExportedResultsByRoom(roomId: string): ExportableResult[] {
    return Array.from(this.exportedResults.values()).filter((result) => result.roomId === roomId);
  }

  /**
   * Get shareable link by ID
   */
  getShareableLink(linkId: string): ShareableLink | undefined {
    const link = this.shareableLinks.get(linkId);

    // Check if expired
    if (link && link.expiresAt && Date.now() > link.expiresAt) {
      this.shareableLinks.delete(linkId);
      return undefined;
    }

    return link;
  }

  /**
   * Validate access to shareable link
   */
  validateLinkAccess(linkId: string, accessCode?: string): boolean {
    const link = this.getShareableLink(linkId);
    if (!link) {
      return false;
    }

    if (link.isPublic) {
      return true;
    }

    return link.accessCode === accessCode;
  }

  /**
   * Get shareable moment by ID
   */
  getShareableMoment(momentId: string): ShareableMoment | undefined {
    return this.shareableMoments.get(momentId);
  }

  /**
   * Get shareable moments by room
   */
  getShareableMomentsByRoom(roomId: string): ShareableMoment[] {
    return Array.from(this.shareableMoments.values()).filter((moment) => moment.roomId === roomId);
  }

  /**
   * Export data to JSON format
   */
  exportToJSON(resultId: string): string {
    const result = this.exportedResults.get(resultId);
    if (!result) {
      throw new Error('Export result not found');
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * Export data to CSV format (for polls and quizzes)
   */
  exportToCSV(resultId: string): string {
    const result = this.exportedResults.get(resultId);
    if (!result) {
      throw new Error('Export result not found');
    }

    if (result.type === 'poll') {
      return this.exportPollToCSV(result);
    } else if (result.type === 'quiz') {
      return this.exportQuizToCSV(result);
    } else {
      throw new Error('CSV export not supported for this result type');
    }
  }

  /**
   * Clean up expired links and old exports
   */
  cleanup(): void {
    this.cleanupExpiredLinks();
    this.cleanupOldExports();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.exportedResults.clear();
    this.shareableLinks.clear();
    this.shareableMoments.clear();
  }

  private generateTagCloud(tags: string[]): { tag: string; count: number }[] {
    const tagCounts = new Map<string, number>();

    tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  private getAnnotationTypeStats(annotations: WhiteboardAnnotation[]): {
    type: string;
    count: number;
  }[] {
    const typeCounts = new Map<string, number>();

    annotations.forEach((annotation) => {
      typeCounts.set(annotation.type, (typeCounts.get(annotation.type) || 0) + 1);
    });

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private exportPollToCSV(result: ExportableResult): string {
    const data = result.data as { poll: Poll; votes: PollVote[] };
    const poll = data.poll;
    const votes = data.votes;

    let csv = 'Poll Title,Question,Option,Votes,Percentage\n';

    poll.options.forEach((option: PollOption) => {
      const percentage = votes.length > 0 ? (option.votes / votes.length) * 100 : 0;
      csv += `"${poll.title}","${poll.question}","${option.text}",${option.votes},${percentage.toFixed(2)}\n`;
    });

    return csv;
  }

  private exportQuizToCSV(result: ExportableResult): string {
    const data = result.data as {
      quiz: Quiz;
      questionStats: Array<{
        question: string;
        type: string;
        correctAnswers: number;
        totalAnswers: number;
        accuracy: number;
      }>;
    };
    const quiz = data.quiz;

    let csv = 'Quiz Title,Question,Question Type,Correct Answers,Total Answers,Accuracy\n';

    data.questionStats.forEach(
      (stat: {
        question: string;
        type: string;
        correctAnswers: number;
        totalAnswers: number;
        accuracy: number;
      }): void => {
        csv += `"${quiz.title}","${stat.question}","${stat.type}",${stat.correctAnswers},${stat.totalAnswers},${stat.accuracy.toFixed(2)}\n`;
      }
    );

    return csv;
  }

  private cleanupExpiredLinks(): void {
    const now = Date.now();

    for (const [linkId, link] of this.shareableLinks.entries()) {
      if (link.expiresAt && now > link.expiresAt) {
        this.shareableLinks.delete(linkId);
      }
    }
  }

  private cleanupOldExports(): void {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const [resultId, result] of this.exportedResults.entries()) {
      if (result.exportedAt < thirtyDaysAgo) {
        this.exportedResults.delete(resultId);
      }
    }
  }

  private generateAccessCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
