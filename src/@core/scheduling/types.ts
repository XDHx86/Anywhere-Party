/**
 * Scheduling Types
 * Scheduled watch party sessions with ICS calendar invites and reminder notifications.
 */

export interface ReminderConfig {
  minutesBefore: number;
  label?: string;
}

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g., every 2 weeks = WEEKLY, interval 2
  until?: number; // timestamp of recurrence end
  count?: number; // max occurrences
}

export interface ScheduledSession {
  id: string;
  title: string;
  scheduledTime: number; // timestamp (ms)
  videoUrl?: string;
  hostId: string;
  recurrence?: RecurrenceRule;
  reminders: ReminderConfig[];
  createdAt: number;
  description?: string;
}

export interface SchedulingManagerConfig {
  storageKey: string;
  persistenceTTL: number; // ms — how long past sessions are retained
  maxRemindersPerSession: number;
}

export type SchedulingEventType =
  'SESSION_CREATED' | 'SESSION_CANCELLED' | 'REMINDER_FIRED' | 'SESSION_STARTED';

export interface SchedulingEvent {
  type: SchedulingEventType;
  session: ScheduledSession;
  timestamp: number;
}
