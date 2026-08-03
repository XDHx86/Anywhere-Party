/**
 * Scheduling Manager
 * CRUD for scheduled sessions, reminder scheduling via browser alarms.
 */

import { createBrowserBridge } from '../browser-bridge';
import {
  ScheduledSession,
  SchedulingManagerConfig,
  SchedulingEvent,
  ReminderConfig,
} from './types';

const DEFAULT_CONFIG: SchedulingManagerConfig = {
  storageKey: 'watchPartyScheduledSessions',
  persistenceTTL: 7 * 24 * 60 * 60 * 1000, // 7 days past session time
  maxRemindersPerSession: 3,
};

export class SchedulingManager {
  private browserBridge = createBrowserBridge();
  private sessions: Map<string, ScheduledSession> = new Map();
  private eventCallbacks: ((event: SchedulingEvent) => void)[] = [];
  private config: SchedulingManagerConfig;

  constructor(config?: Partial<SchedulingManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadSessions();
    this.setupAlarmListener();
  }

  // ─── CRUD ────────────────────────────────────────────────

  async createSession(session: ScheduledSession): Promise<void> {
    this.sessions.set(session.id, session);
    await this.persist();
    await this.scheduleReminders(session);
    this.emit({ type: 'SESSION_CREATED', session, timestamp: Date.now() });
  }

  async cancelSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    await this.clearReminders(session);
    this.sessions.delete(sessionId);
    await this.persist();
    this.emit({ type: 'SESSION_CANCELLED', session, timestamp: Date.now() });
  }

  getSession(sessionId: string): ScheduledSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getAllSessions(): ScheduledSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => a.scheduledTime - b.scheduledTime);
  }

  getUpcomingSessions(): ScheduledSession[] {
    const now = Date.now();
    return this.getAllSessions().filter((s) => s.scheduledTime > now);
  }

  // ─── Reminders ───────────────────────────────────────────

  private async scheduleReminders(session: ScheduledSession): Promise<void> {
    for (let i = 0; i < session.reminders.length; i++) {
      const reminder = session.reminders[i];
      const alarmName = `reminder-${session.id}-${i}`;
      const triggerTime = session.scheduledTime - reminder.minutesBefore * 60 * 1000;

      if (triggerTime > Date.now()) {
        this.browserBridge.alarms.create(alarmName, { when: triggerTime });
      }
    }

    // Schedule session start alarm
    const startAlarmName = `session-start-${session.id}`;
    if (session.scheduledTime > Date.now()) {
      this.browserBridge.alarms.create(startAlarmName, { when: session.scheduledTime });
    }
  }

  private async clearReminders(session: ScheduledSession): Promise<void> {
    for (let i = 0; i < session.reminders.length; i++) {
      const alarmName = `reminder-${session.id}-${i}`;
      await this.browserBridge.alarms.clear(alarmName);
    }
    await this.browserBridge.alarms.clear(`session-start-${session.id}`);
  }

  private setupAlarmListener(): void {
    this.browserBridge.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name.startsWith('reminder-')) {
        const parts = alarm.name.split('-');
        const sessionId = parts.slice(1, -1).join('-');
        const session = this.sessions.get(sessionId);
        if (session) {
          await this.browserBridge.notifications.create(`reminder-${session.id}`, {
            type: 'basic',
            title: `Upcoming: ${session.title}`,
            message: `Watch party starts in a few minutes!${session.videoUrl ? `\nVideo: ${session.videoUrl}` : ''}`,
            priority: 2,
          });
          this.emit({ type: 'REMINDER_FIRED', session, timestamp: Date.now() });
        }
      } else if (alarm.name.startsWith('session-start-')) {
        const sessionId = alarm.name.replace('session-start-', '');
        const session = this.sessions.get(sessionId);
        if (session) {
          await this.browserBridge.notifications.create(`start-${session.id}`, {
            type: 'basic',
            title: `Starting: ${session.title}`,
            message: 'Your watch party session is starting now!',
            priority: 3,
          });
          this.emit({ type: 'SESSION_STARTED', session, timestamp: Date.now() });
        }
      }
    });
  }

  // ─── Persistence ─────────────────────────────────────────

  private async persist(): Promise<void> {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      await this.browserBridge.storage.local.set({
        [this.config.storageKey]: sessionsArray,
      });
    } catch (error) {
      console.error('Failed to persist scheduled sessions:', error);
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get(this.config.storageKey);
      const sessionsArray: ScheduledSession[] = result[this.config.storageKey] || [];
      const now = Date.now();

      for (const session of sessionsArray) {
        // Retain sessions up to TTL past their scheduled time
        const maxAge = session.scheduledTime + this.config.persistenceTTL;
        if (maxAge > now) {
          this.sessions.set(session.id, session);
        }
      }
    } catch (error) {
      console.error('Failed to load scheduled sessions:', error);
    }
  }

  // ─── Events ──────────────────────────────────────────────

  subscribe(callback: (event: SchedulingEvent) => void): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }

  private emit(event: SchedulingEvent): void {
    this.eventCallbacks.forEach((cb) => {
      try {
        cb(event);
      } catch (error) {
        console.error('Error in scheduling event callback:', error);
      }
    });
  }
}

// Singleton
let instance: SchedulingManager | null = null;

export function getSchedulingManager(config?: Partial<SchedulingManagerConfig>): SchedulingManager {
  if (!instance) {
    instance = new SchedulingManager(config);
  }
  return instance;
}

export default SchedulingManager;
