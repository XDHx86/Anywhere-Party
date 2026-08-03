/**
 * Playlist Management Types
 * Shared video queue for synchronized watch parties.
 */

export interface PlaylistItem {
  id: string;
  url: string;
  title?: string;
  duration?: number;
  addedBy: string;
  thumbnailUrl?: string;
}

export interface PlaylistState {
  items: PlaylistItem[];
  currentIndex: number;
  isPlaying: boolean;
  playHistory: string[];
}

export interface PlaylistVote {
  itemId: string;
  userId: string;
  timestamp: number;
}

export interface PlaylistManagerConfig {
  maxItems: number;
  skipVoteThreshold: number; // fraction of participants (0–1) to auto-skip
  persistenceKey: string;
  persistenceTTL: number; // milliseconds
}
