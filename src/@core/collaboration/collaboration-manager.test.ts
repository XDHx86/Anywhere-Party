/**
 * Tests for Collaboration Manager
 * Tests requirements 9.1, 9.2, 9.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CollaborationManager } from './collaboration-manager';

describe('CollaborationManager', () => {
  let collaborationManager: CollaborationManager;
  const mockUserId = 'user123';
  const mockUserName = 'Test User';
  const mockRoomId = 'room456';

  beforeEach(() => {
    collaborationManager = new CollaborationManager({
      maxPollsPerRoom: 5,
      maxQuizzesPerRoom: 3,
      maxBookmarksPerUser: 20,
      maxHighlightsPerUser: 15,
    });
  });

  describe('Poll Management', () => {
    it('should create a poll successfully', () => {
      const poll = collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Test Poll',
        'What is your favorite color?',
        ['Red', 'Blue', 'Green'],
        120.5
      );

      expect(poll).toBeDefined();
      expect(poll.title).toBe('Test Poll');
      expect(poll.question).toBe('What is your favorite color?');
      expect(poll.options).toHaveLength(3);
      expect(poll.videoTimestamp).toBe(120.5);
      expect(poll.status).toBe('active');
    });

    it('should allow voting on a poll', () => {
      const poll = collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Test Poll',
        'What is your favorite color?',
        ['Red', 'Blue', 'Green'],
        120.5
      );

      const vote = collaborationManager.votePoll(poll.id, 'voter123', 'Voter', [
        poll.options[0].id,
      ]);

      expect(vote).toBeDefined();
      expect(vote.optionIds).toContain(poll.options[0].id);

      const results = collaborationManager.getPollResults(poll.id);
      expect(results?.totalVotes).toBe(1);
      expect(results?.poll.options[0].votes).toBe(1);
    });

    it('should prevent voting on expired polls', () => {
      const poll = collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Test Poll',
        'What is your favorite color?',
        ['Red', 'Blue', 'Green'],
        120.5,
        -1 // Expired duration
      );

      expect(() => {
        collaborationManager.votePoll(poll.id, 'voter123', 'Voter', [poll.options[0].id]);
      }).toThrow('Poll has expired');
    });

    it('should close polls manually', () => {
      const poll = collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Test Poll',
        'What is your favorite color?',
        ['Red', 'Blue', 'Green'],
        120.5
      );

      const closed = collaborationManager.closePoll(poll.id);
      expect(closed).toBe(true);

      const retrievedPoll = collaborationManager.getPoll(poll.id);
      expect(retrievedPoll?.status).toBe('closed');
    });
  });

  describe('Quiz Management', () => {
    it('should create a quiz successfully', () => {
      const questions = [
        {
          question: 'What is 2 + 2?',
          type: 'multiple_choice' as const,
          options: ['3', '4', '5'],
          correctAnswer: 1,
          points: 1,
        },
      ];

      const quiz = collaborationManager.createQuiz(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Math Quiz',
        questions,
        150.0
      );

      expect(quiz).toBeDefined();
      expect(quiz.title).toBe('Math Quiz');
      expect(quiz.questions).toHaveLength(1);
      expect(quiz.videoTimestamp).toBe(150.0);
      expect(quiz.status).toBe('active');
    });

    it('should allow answering quizzes', () => {
      const questions = [
        {
          question: 'What is 2 + 2?',
          type: 'multiple_choice' as const,
          options: ['3', '4', '5'],
          correctAnswer: 1,
          points: 1,
        },
      ];

      const quiz = collaborationManager.createQuiz(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Math Quiz',
        questions,
        150.0
      );

      const answers = [
        {
          questionId: quiz.questions[0].id,
          answer: 1,
        },
      ];

      const response = collaborationManager.answerQuiz(quiz.id, 'student123', 'Student', answers);

      expect(response).toBeDefined();
      expect(response.score).toBe(1);
      expect(response.maxScore).toBe(1);
      expect(response.answers[0].isCorrect).toBe(true);
    });
  });

  describe('Bookmark Management', () => {
    it('should create bookmarks successfully', async () => {
      const bookmark = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Important Moment',
        180.5,
        undefined,
        'This is a key scene',
        ['important', 'scene']
      );

      expect(bookmark).toBeDefined();
      expect(bookmark.title).toBe('Important Moment');
      expect(bookmark.videoTimestamp).toBe(180.5);
      expect(bookmark.description).toBe('This is a key scene');
      expect(bookmark.tags).toEqual(['important', 'scene']);
    });

    it('should update bookmarks', async () => {
      const bookmark = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Important Moment',
        180.5
      );

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));

      const updated = collaborationManager.updateBookmark(bookmark.id, mockUserId, {
        title: 'Updated Title',
        description: 'Updated description',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated description');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(bookmark.createdAt);
    });

    it('should delete bookmarks', async () => {
      const bookmark = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Important Moment',
        180.5
      );

      const deleted = collaborationManager.deleteBookmark(bookmark.id, mockUserId);
      expect(deleted).toBe(true);

      const retrieved = collaborationManager.getBookmark(bookmark.id);
      expect(retrieved).toBeUndefined();
    });

    it('should prevent unauthorized bookmark updates', async () => {
      const bookmark = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Important Moment',
        180.5
      );

      expect(() => {
        collaborationManager.updateBookmark(bookmark.id, 'otherUser', { title: 'Hacked' });
      }).toThrow('Not authorized to update this bookmark');
    });
  });

  describe('Highlight Management', () => {
    it('should create highlights successfully', async () => {
      const highlight = await collaborationManager.createHighlight(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Action Sequence',
        200.0,
        230.0,
        undefined,
        'Epic fight scene',
        ['action', 'fight']
      );

      expect(highlight).toBeDefined();
      expect(highlight.title).toBe('Action Sequence');
      expect(highlight.startTimestamp).toBe(200.0);
      expect(highlight.endTimestamp).toBe(230.0);
      expect(highlight.description).toBe('Epic fight scene');
      expect(highlight.tags).toEqual(['action', 'fight']);
    });

    it('should validate highlight time ranges', async () => {
      await expect(
        collaborationManager.createHighlight(
          mockUserId,
          mockUserName,
          mockRoomId,
          'Invalid Highlight',
          230.0,
          200.0 // End before start
        )
      ).rejects.toThrow('End timestamp must be after start timestamp');
    });

    it('should limit highlight duration', async () => {
      await expect(
        collaborationManager.createHighlight(
          mockUserId,
          mockUserName,
          mockRoomId,
          'Too Long Highlight',
          0.0,
          700.0 // More than 10 minutes
        )
      ).rejects.toThrow('Highlight duration cannot exceed 10 minutes');
    });
  });

  describe('Whiteboard Management', () => {
    it('should create whiteboard sessions', () => {
      const session = collaborationManager.createWhiteboardSession(mockRoomId, 300.0, mockUserId);

      expect(session).toBeDefined();
      expect(session.roomId).toBe(mockRoomId);
      expect(session.videoTimestamp).toBe(300.0);
      expect(session.participants).toContain(mockUserId);
      expect(session.layers).toHaveLength(1); // Default layer
    });

    it('should allow joining whiteboard sessions', () => {
      const session = collaborationManager.createWhiteboardSession(mockRoomId, 300.0, mockUserId);

      const joined = collaborationManager.joinWhiteboardSession(session.id, 'user456');
      expect(joined).toBe(true);

      const updatedSession = collaborationManager.getWhiteboardSession(session.id);
      expect(updatedSession?.participants).toContain('user456');
    });

    it('should create whiteboard layers', () => {
      const session = collaborationManager.createWhiteboardSession(mockRoomId, 300.0, mockUserId);

      // First add user456 to the session
      collaborationManager.joinWhiteboardSession(session.id, 'user456');

      const layer = collaborationManager.createWhiteboardLayer(
        session.id,
        mockUserId,
        'Drawing Layer',
        ['user456']
      );

      expect(layer).toBeDefined();
      expect(layer.name).toBe('Drawing Layer');
      expect(layer.ownerId).toBe(mockUserId);
      expect(layer.collaborators).toContain('user456');
    });

    it('should create whiteboard annotations', () => {
      const session = collaborationManager.createWhiteboardSession(mockRoomId, 300.0, mockUserId);

      const layer = session.layers[0]; // Default layer

      const annotation = collaborationManager.createWhiteboardAnnotation(
        session.id,
        layer.id,
        mockUserId,
        mockUserName,
        'pen',
        {
          color: '#ff0000',
          strokeWidth: 2,
          opacity: 1.0,
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
        },
        300.5
      );

      expect(annotation).toBeDefined();
      expect(annotation.type).toBe('pen');
      expect(annotation.data.color).toBe('#ff0000');
      expect(annotation.videoTimestamp).toBe(300.5);
    });
  });

  describe('Export and Sharing', () => {
    it('should export poll results', () => {
      const poll = collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Test Poll',
        'What is your favorite color?',
        ['Red', 'Blue', 'Green'],
        120.5
      );

      // Add some votes
      collaborationManager.votePoll(poll.id, 'voter1', 'Voter 1', [poll.options[0].id]);
      collaborationManager.votePoll(poll.id, 'voter2', 'Voter 2', [poll.options[1].id]);

      const results = collaborationManager.getPollResults(poll.id);
      expect(results).toBeDefined();

      if (!results) {
        throw new Error('Expected poll results to be defined');
      }

      const exportResult = collaborationManager.exportPollResults(
        results.poll,
        results.votes,
        mockUserId,
        mockUserName
      );

      expect(exportResult).toBeDefined();
      expect(exportResult.type).toBe('poll');
      expect(exportResult.title).toContain('Test Poll');
      expect(exportResult.data.totalVotes).toBe(2);
    });

    it('should create shareable moments', async () => {
      // Create some content
      const bookmark = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Key Moment',
        100.0
      );

      const highlight = await collaborationManager.createHighlight(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Important Scene',
        95.0,
        105.0
      );

      const moment = collaborationManager.createShareableMoment(
        'Epic Moment',
        mockRoomId,
        90.0,
        110.0,
        mockUserId,
        mockUserName,
        'This is an epic moment',
        undefined,
        undefined,
        [],
        [],
        [bookmark],
        [highlight]
      );

      expect(moment).toBeDefined();
      expect(moment.title).toBe('Epic Moment');
      expect(moment.startTimestamp).toBe(90.0);
      expect(moment.endTimestamp).toBe(110.0);
      expect(moment.bookmarks).toHaveLength(1);
      expect(moment.highlights).toHaveLength(1);
    });

    it('should create shareable links', () => {
      const link = collaborationManager.createShareableLink(
        'bookmark',
        'bookmark123',
        mockRoomId,
        150.0,
        mockUserId,
        true
      );

      expect(link).toBeDefined();
      expect(link.type).toBe('bookmark');
      expect(link.resourceId).toBe('bookmark123');
      expect(link.isPublic).toBe(true);
      expect(link.accessCode).toBeUndefined(); // Public links don't need access codes
    });

    it('should validate link access', () => {
      const publicLink = collaborationManager.createShareableLink(
        'bookmark',
        'bookmark123',
        mockRoomId,
        150.0,
        mockUserId,
        true
      );

      const privateLink = collaborationManager.createShareableLink(
        'bookmark',
        'bookmark456',
        mockRoomId,
        150.0,
        mockUserId,
        false
      );

      expect(collaborationManager.validateLinkAccess(publicLink.id)).toBe(true);
      expect(collaborationManager.validateLinkAccess(privateLink.id)).toBe(false);
      expect(collaborationManager.validateLinkAccess(privateLink.id, privateLink.accessCode)).toBe(
        true
      );
    });
  });

  describe('Search and Discovery', () => {
    it('should search bookmarks and highlights', async () => {
      await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Important Scene',
        100.0,
        undefined,
        'This is important',
        ['important']
      );

      await collaborationManager.createHighlight(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Action Sequence',
        200.0,
        230.0,
        undefined,
        'Epic action',
        ['action', 'epic']
      );

      const results = collaborationManager.searchBookmarksAndHighlights('important', mockRoomId);
      expect(results.bookmarks).toHaveLength(1);
      expect(results.highlights).toHaveLength(0);

      const actionResults = collaborationManager.searchBookmarksAndHighlights('action', mockRoomId);
      expect(actionResults.bookmarks).toHaveLength(0);
      expect(actionResults.highlights).toHaveLength(1);
    });

    it('should get items in time ranges', async () => {
      await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Early Moment',
        50.0
      );

      await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Late Moment',
        150.0
      );

      await collaborationManager.createHighlight(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Middle Scene',
        90.0,
        110.0
      );

      const bookmarksInRange = collaborationManager.getBookmarksInTimeRange(mockRoomId, 40.0, 60.0);
      expect(bookmarksInRange).toHaveLength(1);
      expect(bookmarksInRange[0].title).toBe('Early Moment');

      const highlightsInRange = collaborationManager.getHighlightsInTimeRange(
        mockRoomId,
        85.0,
        115.0
      );
      expect(highlightsInRange).toHaveLength(1);
      expect(highlightsInRange[0].title).toBe('Middle Scene');
    });
  });

  describe('Room and User Activity', () => {
    it('should get comprehensive room activity', async () => {
      // Create various content
      const poll = collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Room Poll',
        'Test question?',
        ['A', 'B'],
        100.0
      );

      const bookmark = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Room Bookmark',
        200.0
      );

      const session = collaborationManager.createWhiteboardSession(mockRoomId, 300.0, mockUserId);

      const activity = collaborationManager.getRoomActivity(mockRoomId);

      expect(activity.polls).toHaveLength(1);
      expect(activity.bookmarks).toHaveLength(1);
      expect(activity.whiteboardSessions).toHaveLength(1);
      expect(activity.polls[0].id).toBe(poll.id);
      expect(activity.bookmarks[0].id).toBe(bookmark.id);
      expect(activity.whiteboardSessions[0].id).toBe(session.id);
    });

    it('should get user activity across rooms', async () => {
      const bookmark1 = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'User Bookmark 1',
        100.0
      );

      const bookmark2 = await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        'room789',
        'User Bookmark 2',
        200.0
      );

      const activity = collaborationManager.getUserActivity(mockUserId);

      expect(activity.bookmarks).toHaveLength(2);
      expect(activity.bookmarks.map((b) => b.id)).toContain(bookmark1.id);
      expect(activity.bookmarks.map((b) => b.id)).toContain(bookmark2.id);
    });
  });

  describe('Data Management', () => {
    it('should cleanup expired content', () => {
      // Create poll with short duration
      const poll = collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Short Poll',
        'Quick question?',
        ['Yes', 'No'],
        100.0,
        1 // 1 second duration
      );

      expect(poll.status).toBe('active');

      // Wait and cleanup
      setTimeout(() => {
        collaborationManager.cleanup();
        const updatedPoll = collaborationManager.getPoll(poll.id);
        expect(updatedPoll?.status).toBe('closed');
      }, 1100);
    });

    it('should clear all data', async () => {
      // Create some content
      collaborationManager.createPoll(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Test Poll',
        'Question?',
        ['A', 'B'],
        100.0
      );

      await collaborationManager.createBookmark(
        mockUserId,
        mockUserName,
        mockRoomId,
        'Test Bookmark',
        200.0
      );

      // Clear all data
      collaborationManager.clear();

      // Verify data is cleared
      const polls = collaborationManager.getActivePollsByRoom(mockRoomId);
      const bookmarks = collaborationManager.getBookmarksByRoom(mockRoomId);

      expect(polls).toHaveLength(0);
      expect(bookmarks).toHaveLength(0);
    });
  });
});
