/**
 * ICS Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateSessionICS } from './ics-generator';
import type { ScheduledSession } from './types';

const createSession = (overrides: Partial<ScheduledSession> = {}): ScheduledSession => ({
  id: 'test-session-1',
  title: 'Friday Movie Night',
  scheduledTime: new Date('2026-08-10T20:00:00').getTime(),
  hostId: 'user-1',
  reminders: [{ minutesBefore: 15 }],
  createdAt: Date.now(),
  ...overrides,
});

describe('ICS Generator', () => {
  it('generates valid ICS structure', () => {
    const session = createSession();
    const ics = generateSessionICS(session);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('VERSION:2.0');
  });

  it('includes session title as SUMMARY', () => {
    const session = createSession({ title: 'My Watch Party' });
    const ics = generateSessionICS(session);
    expect(ics).toContain('SUMMARY:My Watch Party');
  });

  it('includes video URL as LOCATION', () => {
    const session = createSession({ videoUrl: 'https://youtube.com/watch?v=abc' });
    const ics = generateSessionICS(session);
    expect(ics).toContain('LOCATION:https://youtube.com/watch?v=abc');
  });

  it('includes VALARM for reminders', () => {
    const session = createSession({
      reminders: [{ minutesBefore: 15 }, { minutesBefore: 60 }],
    });
    const ics = generateSessionICS(session);
    const alarmCount = (ics.match(/BEGIN:VALARM/g) || []).length;
    expect(alarmCount).toBe(2);
    expect(ics).toContain('TRIGGER:-PT15M');
    expect(ics).toContain('TRIGGER:-PT60M');
  });

  it('includes RRULE for recurrence', () => {
    const session = createSession({
      recurrence: { frequency: 'WEEKLY', interval: 2 },
    });
    const ics = generateSessionICS(session);
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2');
  });

  it('includes UID based on session id', () => {
    const session = createSession({ id: 'session-abc' });
    const ics = generateSessionICS(session);
    expect(ics).toContain('UID:session-abc@watchparty-extension');
  });

  it('escapes special characters in title', () => {
    const session = createSession({ title: 'Movie; Night, Party' });
    const ics = generateSessionICS(session);
    expect(ics).toContain('SUMMARY:Movie\\; Night\\, Party');
  });
});
