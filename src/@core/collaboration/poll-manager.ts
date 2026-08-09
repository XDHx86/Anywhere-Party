/**
 * Poll Manager for Live Polls and Quizzes
 * Implements requirements 9.1, 9.2
 */

import {
  Poll,
  PollVote,
  Quiz,
  QuizQuestion,
  QuizResponse,
  QuizAnswer,
  CollaborationEvent,
} from './types';

export interface PollManagerOptions {
  maxPollsPerRoom?: number;
  maxQuizzesPerRoom?: number;
  defaultPollDuration?: number;
  defaultQuizDuration?: number;
  onPollCreated?: (poll: Poll) => void;
  onPollVoted?: (vote: PollVote) => void;
  onPollClosed?: (pollId: string) => void;
  onQuizCreated?: (quiz: Quiz) => void;
  onQuizAnswered?: (response: QuizResponse) => void;
  onQuizClosed?: (quizId: string) => void;
  onCollaborationEvent?: (event: CollaborationEvent) => void;
}

export class PollManager {
  private polls: Map<string, Poll> = new Map();
  private votes: Map<string, PollVote[]> = new Map(); // pollId -> votes
  private quizzes: Map<string, Quiz> = new Map();
  private quizResponses: Map<string, QuizResponse[]> = new Map(); // quizId -> responses
  private options: Required<PollManagerOptions>;
  private timers: Map<string, number> = new Map(); // For auto-closing polls/quizzes

  constructor(options: PollManagerOptions = {}) {
    this.options = {
      maxPollsPerRoom: options.maxPollsPerRoom ?? 10,
      maxQuizzesPerRoom: options.maxQuizzesPerRoom ?? 5,
      defaultPollDuration: options.defaultPollDuration ?? 60, // 1 minute
      defaultQuizDuration: options.defaultQuizDuration ?? 300, // 5 minutes
      onPollCreated: options.onPollCreated ?? (() => {}),
      onPollVoted: options.onPollVoted ?? (() => {}),
      onPollClosed: options.onPollClosed ?? (() => {}),
      onQuizCreated: options.onQuizCreated ?? (() => {}),
      onQuizAnswered: options.onQuizAnswered ?? (() => {}),
      onQuizClosed: options.onQuizClosed ?? (() => {}),
      onCollaborationEvent: options.onCollaborationEvent ?? (() => {}),
    };
  }

  /**
   * Create a new poll tied to video timestamp
   */
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
    // Check room poll limit
    const roomPolls = this.getPollsByRoom(roomId);
    if (roomPolls.length >= this.options.maxPollsPerRoom) {
      throw new Error('Maximum polls per room reached');
    }

    // Validate options
    if (options.length < 2) {
      throw new Error('Poll must have at least 2 options');
    }

    if (options.length > 10) {
      throw new Error('Poll cannot have more than 10 options');
    }

    const pollDuration = duration ?? this.options.defaultPollDuration;
    const now = Date.now();

    const poll: Poll = {
      id: this.generateId(),
      userId,
      userName,
      roomId,
      title: title.trim(),
      question: question.trim(),
      options: options.map((text, index) => ({
        id: `option_${index}`,
        text: text.trim(),
        votes: 0,
        voters: [],
      })),
      videoTimestamp,
      duration: pollDuration,
      allowMultipleChoices,
      isAnonymous,
      createdAt: now,
      expiresAt: now + pollDuration * 1000,
      status: 'active',
    };

    this.polls.set(poll.id, poll);
    this.votes.set(poll.id, []);

    // Set auto-close timer
    const timer = window.setTimeout(() => {
      this.closePoll(poll.id);
    }, pollDuration * 1000);
    this.timers.set(poll.id, timer);

    // Notify callbacks
    this.options.onPollCreated(poll);
    this.options.onCollaborationEvent({
      type: 'poll_created',
      userId,
      userName,
      roomId,
      timestamp: now,
      data: poll,
    });

    console.log('Poll created:', poll.id, title);
    return poll;
  }

  /**
   * Vote on a poll
   */
  votePoll(pollId: string, userId: string, userName: string, optionIds: string[]): PollVote {
    const poll = this.polls.get(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.status !== 'active') {
      throw new Error('Poll is not active');
    }

    if (Date.now() > poll.expiresAt) {
      this.closePoll(pollId);
      throw new Error('Poll has expired');
    }

    // Validate option IDs
    const validOptionIds = poll.options.map((opt) => opt.id);
    const invalidOptions = optionIds.filter((id) => !validOptionIds.includes(id));
    if (invalidOptions.length > 0) {
      throw new Error('Invalid option IDs: ' + invalidOptions.join(', '));
    }

    // Check multiple choice restriction
    if (!poll.allowMultipleChoices && optionIds.length > 1) {
      throw new Error('Multiple choices not allowed for this poll');
    }

    // Check if user already voted
    const existingVotes = this.votes.get(pollId) || [];
    const existingVote = existingVotes.find((vote) => vote.userId === userId);

    if (existingVote) {
      // Remove previous vote counts
      existingVote.optionIds.forEach((optionId) => {
        const option = poll.options.find((opt) => opt.id === optionId);
        if (option) {
          option.votes = Math.max(0, option.votes - 1);
          option.voters = option.voters.filter((id) => id !== userId);
        }
      });

      // Remove existing vote
      const voteIndex = existingVotes.indexOf(existingVote);
      existingVotes.splice(voteIndex, 1);
    }

    // Create new vote
    const vote: PollVote = {
      id: this.generateId(),
      pollId,
      userId,
      userName: poll.isAnonymous ? undefined : userName,
      optionIds,
      timestamp: Date.now(),
    };

    // Update vote counts
    optionIds.forEach((optionId) => {
      const option = poll.options.find((opt) => opt.id === optionId);
      if (option) {
        option.votes++;
        if (!poll.isAnonymous) {
          option.voters.push(userId);
        }
      }
    });

    // Store vote
    existingVotes.push(vote);
    this.votes.set(pollId, existingVotes);

    // Notify callbacks
    this.options.onPollVoted(vote);
    this.options.onCollaborationEvent({
      type: 'poll_voted',
      userId,
      userName: poll.isAnonymous ? undefined : userName,
      roomId: poll.roomId,
      timestamp: vote.timestamp,
      data: { pollId, optionIds },
    });

    console.log('Poll vote recorded:', pollId, userId, optionIds);
    return vote;
  }

  /**
   * Close a poll manually
   */
  closePoll(pollId: string): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) {
      return false;
    }

    poll.status = 'closed';

    // Clear timer
    const timer = this.timers.get(pollId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(pollId);
    }

    // Notify callbacks
    this.options.onPollClosed(pollId);
    this.options.onCollaborationEvent({
      type: 'poll_closed',
      userId: poll.userId,
      userName: poll.userName,
      roomId: poll.roomId,
      timestamp: Date.now(),
      data: { pollId },
    });

    console.log('Poll closed:', pollId);
    return true;
  }

  /**
   * Create a new quiz tied to video timestamp
   */
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
    // Check room quiz limit
    const roomQuizzes = this.getQuizzesByRoom(roomId);
    if (roomQuizzes.length >= this.options.maxQuizzesPerRoom) {
      throw new Error('Maximum quizzes per room reached');
    }

    // Validate questions
    if (questions.length === 0) {
      throw new Error('Quiz must have at least 1 question');
    }

    if (questions.length > 20) {
      throw new Error('Quiz cannot have more than 20 questions');
    }

    const quizDuration = duration ?? this.options.defaultQuizDuration;
    const now = Date.now();

    const quiz: Quiz = {
      id: this.generateId(),
      userId,
      userName,
      roomId,
      title: title.trim(),
      questions: questions.map((q, index) => ({
        ...q,
        id: `question_${index}`,
        question: q.question.trim(),
      })),
      videoTimestamp,
      duration: quizDuration,
      isAnonymous,
      createdAt: now,
      expiresAt: now + quizDuration * 1000,
      status: 'active',
    };

    this.quizzes.set(quiz.id, quiz);
    this.quizResponses.set(quiz.id, []);

    // Set auto-close timer
    const timer = window.setTimeout(() => {
      this.closeQuiz(quiz.id);
    }, quizDuration * 1000);
    this.timers.set(quiz.id, timer);

    // Notify callbacks
    this.options.onQuizCreated(quiz);
    this.options.onCollaborationEvent({
      type: 'quiz_created',
      userId,
      userName,
      roomId,
      timestamp: now,
      data: quiz,
    });

    console.log('Quiz created:', quiz.id, title);
    return quiz;
  }

  /**
   * Submit quiz response
   */
  answerQuiz(
    quizId: string,
    userId: string,
    userName: string,
    answers: Omit<QuizAnswer, 'isCorrect' | 'points'>[]
  ): QuizResponse {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    if (quiz.status !== 'active') {
      throw new Error('Quiz is not active');
    }

    if (Date.now() > quiz.expiresAt) {
      this.closeQuiz(quizId);
      throw new Error('Quiz has expired');
    }

    // Check if user already answered
    const existingResponses = this.quizResponses.get(quizId) || [];
    const existingResponse = existingResponses.find((response) => response.userId === userId);
    if (existingResponse) {
      throw new Error('User has already answered this quiz');
    }

    // Validate answers
    if (answers.length !== quiz.questions.length) {
      throw new Error('Must answer all questions');
    }

    // Grade answers
    let score = 0;
    let maxScore = 0;
    const gradedAnswers: QuizAnswer[] = answers.map((answer, index) => {
      const question = quiz.questions[index];
      if (!question) {
        throw new Error(`Question ${index} not found`);
      }

      maxScore += question.points;

      let isCorrect = false;
      if (question.type === 'multiple_choice' && typeof question.correctAnswer === 'number') {
        isCorrect = answer.answer === question.correctAnswer;
      } else if (question.type === 'true_false' && typeof question.correctAnswer === 'boolean') {
        isCorrect = answer.answer === question.correctAnswer;
      } else if (question.type === 'text' && typeof question.correctAnswer === 'string') {
        const userAnswer = String(answer.answer).toLowerCase().trim();
        const correctAnswer = question.correctAnswer.toLowerCase().trim();
        isCorrect = userAnswer === correctAnswer;
      }

      const points = isCorrect ? question.points : 0;
      score += points;

      return {
        questionId: question.id,
        answer: answer.answer,
        isCorrect,
        points,
      };
    });

    // Create response
    const response: QuizResponse = {
      id: this.generateId(),
      quizId,
      userId,
      userName: quiz.isAnonymous ? undefined : userName,
      answers: gradedAnswers,
      score,
      maxScore,
      timestamp: Date.now(),
    };

    // Store response
    existingResponses.push(response);
    this.quizResponses.set(quizId, existingResponses);

    // Notify callbacks
    this.options.onQuizAnswered(response);
    this.options.onCollaborationEvent({
      type: 'quiz_answered',
      userId,
      userName: quiz.isAnonymous ? undefined : userName,
      roomId: quiz.roomId,
      timestamp: response.timestamp,
      data: { quizId, score, maxScore },
    });

    console.log('Quiz answered:', quizId, userId, `${score}/${maxScore}`);
    return response;
  }

  /**
   * Close a quiz manually
   */
  closeQuiz(quizId: string): boolean {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) {
      return false;
    }

    quiz.status = 'closed';

    // Clear timer
    const timer = this.timers.get(quizId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(quizId);
    }

    // Notify callbacks
    this.options.onQuizClosed(quizId);
    this.options.onCollaborationEvent({
      type: 'quiz_closed',
      userId: quiz.userId,
      userName: quiz.userName,
      roomId: quiz.roomId,
      timestamp: Date.now(),
      data: { quizId },
    });

    console.log('Quiz closed:', quizId);
    return true;
  }

  /**
   * Get poll by ID
   */
  getPoll(pollId: string): Poll | undefined {
    return this.polls.get(pollId);
  }

  /**
   * Get poll votes
   */
  getPollVotes(pollId: string): PollVote[] {
    return this.votes.get(pollId) || [];
  }

  /**
   * Get polls by room
   */
  getPollsByRoom(roomId: string): Poll[] {
    return Array.from(this.polls.values()).filter((poll) => poll.roomId === roomId);
  }

  /**
   * Get active polls by room
   */
  getActivePollsByRoom(roomId: string): Poll[] {
    return this.getPollsByRoom(roomId).filter((poll) => poll.status === 'active');
  }

  /**
   * Get quiz by ID
   */
  getQuiz(quizId: string): Quiz | undefined {
    return this.quizzes.get(quizId);
  }

  /**
   * Get quiz responses
   */
  getQuizResponses(quizId: string): QuizResponse[] {
    return this.quizResponses.get(quizId) || [];
  }

  /**
   * Get quizzes by room
   */
  getQuizzesByRoom(roomId: string): Quiz[] {
    return Array.from(this.quizzes.values()).filter((quiz) => quiz.roomId === roomId);
  }

  /**
   * Get active quizzes by room
   */
  getActiveQuizzesByRoom(roomId: string): Quiz[] {
    return this.getQuizzesByRoom(roomId).filter((quiz) => quiz.status === 'active');
  }

  /**
   * Get poll results with statistics
   */
  getPollResults(
    pollId: string
  ): { poll: Poll; votes: PollVote[]; totalVotes: number; participantCount: number } | null {
    const poll = this.polls.get(pollId);
    if (!poll) {
      return null;
    }

    const votes = this.getPollVotes(pollId);
    const totalVotes = votes.length;
    const participantCount = new Set(votes.map((vote) => vote.userId)).size;

    return {
      poll,
      votes,
      totalVotes,
      participantCount,
    };
  }

  /**
   * Get quiz results with statistics
   */
  getQuizResults(quizId: string): {
    quiz: Quiz;
    responses: QuizResponse[];
    averageScore: number;
    participantCount: number;
  } | null {
    const quiz = this.quizzes.get(quizId);
    if (!quiz) {
      return null;
    }

    const responses = this.getQuizResponses(quizId);
    const participantCount = responses.length;
    const averageScore =
      participantCount > 0
        ? responses.reduce((sum, response) => sum + response.score / response.maxScore, 0) /
          participantCount
        : 0;

    return {
      quiz,
      responses,
      averageScore,
      participantCount,
    };
  }

  /**
   * Clean up expired polls and quizzes
   */
  cleanup(): void {
    const now = Date.now();

    // Clean up expired polls
    for (const [pollId, poll] of this.polls.entries()) {
      if (poll.status === 'active' && now > poll.expiresAt) {
        this.closePoll(pollId);
      }
    }

    // Clean up expired quizzes
    for (const [quizId, quiz] of this.quizzes.entries()) {
      if (quiz.status === 'active' && now > quiz.expiresAt) {
        this.closeQuiz(quizId);
      }
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Clear data
    this.polls.clear();
    this.votes.clear();
    this.quizzes.clear();
    this.quizResponses.clear();
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
