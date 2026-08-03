/**
 * Participant Manager — Public API
 *
 * Authoritative source of truth for the current room's participant list.
 * All subsystems (encryption, annotation sync, voice chat) read from here.
 */

export { ParticipantManager, getParticipantManager } from './participant-manager';
export type {
  ParticipantInfo,
  ParticipantManagerConfig,
  ParticipantEvent,
  ParticipantEventType,
} from './types';
