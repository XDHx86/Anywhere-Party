/**
 * Types for advanced collaboration features
 * Implements requirements 9.1, 9.2, 9.3
 */

// Poll and Quiz Types
export interface Poll {
  id: string;
  userId: string;
  userName?: string;
  roomId: string;
  title: string;
  question: string;
  options: PollOption[];
  videoTimestamp: number;
  duration: number; // Duration in seconds
  allowMultipleChoices: boolean;
  isAnonymous: boolean;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'closed';
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[]; // User IDs who voted for this option
}

export interface PollVote {
  id: string;
  pollId: string;
  userId: string;
  userName?: string;
  optionIds: string[];
  timestamp: number;
}

export interface Quiz {
  id: string;
  userId: string;
  userName?: string;
  roomId: string;
  title: string;
  questions: QuizQuestion[];
  videoTimestamp: number;
  duration: number; // Duration in seconds
  isAnonymous: boolean;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'closed';
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'text';
  options?: string[]; // For multiple choice
  correctAnswer?: string | number; // Index for multiple choice, boolean for true/false, string for text
  points: number;
}

export interface QuizResponse {
  id: string;
  quizId: string;
  userId: string;
  userName?: string;
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  timestamp: number;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | number | boolean;
  isCorrect: boolean;
  points: number;
}

// Bookmark and Highlight Types
export interface Bookmark {
  id: string;
  userId: string;
  userName?: string;
  roomId: string;
  title: string;
  description?: string;
  videoTimestamp: number;
  thumbnail?: string; // Base64 encoded thumbnail
  tags: string[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Highlight {
  id: string;
  userId: string;
  userName?: string;
  roomId: string;
  title: string;
  description?: string;
  startTimestamp: number;
  endTimestamp: number;
  thumbnail?: string; // Base64 encoded thumbnail
  tags: string[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

// Whiteboard Enhancement Types
export interface WhiteboardSession {
  id: string;
  roomId: string;
  videoTimestamp: number;
  participants: string[];
  tools: WhiteboardTool[];
  layers: WhiteboardLayer[];
  createdAt: number;
  updatedAt: number;
}

export interface WhiteboardTool extends DrawingTool {
  id: string;
  name: string;
  icon: string;
  category: 'drawing' | 'shapes' | 'text' | 'collaboration';
}

export interface WhiteboardLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  ownerId: string;
  collaborators: string[];
  annotations: WhiteboardAnnotation[];
}

export interface WhiteboardAnnotation {
  id: string;
  userId: string;
  userName?: string;
  type:
    | 'pen'
    | 'highlighter'
    | 'eraser'
    | 'rectangle'
    | 'circle'
    | 'arrow'
    | 'text'
    | 'sticky_note';
  data: WhiteboardAnnotationData;
  videoTimestamp: number;
  visible: boolean;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WhiteboardAnnotationData {
  // Common properties
  color: string;
  strokeWidth: number;
  opacity: number;

  // Position and size
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // Path data for freehand drawing
  points?: Point[];

  // Shape-specific
  radius?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;

  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';

  // Sticky note specific
  backgroundColor?: string;
  borderColor?: string;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

// Export and Sharing Types
export interface ExportableResult {
  id: string;
  type: 'poll' | 'quiz' | 'bookmark' | 'highlight' | 'whiteboard';
  title: string;
  description?: string;
  roomId: string;
  videoTimestamp: number;
  data: any; // Specific data based on type
  participants: string[];
  createdAt: number;
  exportedAt: number;
}

export interface ShareableLink {
  id: string;
  type: 'poll' | 'quiz' | 'bookmark' | 'highlight' | 'whiteboard' | 'moment';
  resourceId: string;
  roomId: string;
  videoTimestamp: number;
  expiresAt?: number;
  isPublic: boolean;
  accessCode?: string;
  createdBy: string;
  createdAt: number;
}

export interface ShareableMoment {
  id: string;
  title: string;
  description?: string;
  roomId: string;
  videoUrl?: string;
  startTimestamp: number;
  endTimestamp: number;
  thumbnail?: string;
  annotations: WhiteboardAnnotation[];
  polls: Poll[];
  bookmarks: Bookmark[];
  highlights: Highlight[];
  participants: string[];
  createdBy: string;
  createdAt: number;
}

// Event Types for Real-time Collaboration
export interface CollaborationEvent {
  type: CollaborationEventType;
  userId: string;
  userName?: string;
  roomId: string;
  timestamp: number;
  data: any;
}

export type CollaborationEventType =
  | 'poll_created'
  | 'poll_voted'
  | 'poll_closed'
  | 'quiz_created'
  | 'quiz_answered'
  | 'quiz_closed'
  | 'bookmark_created'
  | 'bookmark_updated'
  | 'bookmark_deleted'
  | 'highlight_created'
  | 'highlight_updated'
  | 'highlight_deleted'
  | 'whiteboard_annotation_created'
  | 'whiteboard_annotation_updated'
  | 'whiteboard_annotation_deleted'
  | 'whiteboard_layer_created'
  | 'whiteboard_layer_updated'
  | 'whiteboard_layer_deleted'
  | 'moment_shared';

// Manager Options
export interface CollaborationManagerOptions {
  maxPollsPerRoom?: number;
  maxQuizzesPerRoom?: number;
  maxBookmarksPerUser?: number;
  maxHighlightsPerUser?: number;
  maxWhiteboardLayers?: number;
  maxAnnotationsPerLayer?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailQuality?: number;
  onPollCreated?: (poll: Poll) => void;
  onPollVoted?: (vote: PollVote) => void;
  onQuizCreated?: (quiz: Quiz) => void;
  onQuizAnswered?: (response: QuizResponse) => void;
  onBookmarkCreated?: (bookmark: Bookmark) => void;
  onHighlightCreated?: (highlight: Highlight) => void;
  onWhiteboardAnnotationCreated?: (annotation: WhiteboardAnnotation) => void;
  onMomentShared?: (moment: ShareableMoment) => void;
}

// Import from existing annotation layer types
export interface DrawingTool {
  type: string;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontFamily?: string;
}
