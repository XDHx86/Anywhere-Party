/**
 * ICS Calendar File Generator
 * Generates RFC 5545 compliant .ics content for scheduled watch party sessions.
 */

import { ScheduledSession } from './types';

/**
 * Format a timestamp as ICS date-time string (local time)
 */
function formatICSDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/**
 * Generate a UID for the ICS event
 */
function generateUID(session: ScheduledSession): string {
  return `${session.id}@watchparty-extension`;
}

/**
 * Escape special characters for ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate RFC 5545 compliant ICS content for a scheduled session
 */
export function generateSessionICS(session: ScheduledSession): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Watch Party Extension//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUID(session)}`,
    `DTSTART:${formatICSDateTime(session.scheduledTime)}`,
    `SUMMARY:${escapeICSText(session.title)}`,
  ];

  // Add end time (assume 2 hours if no duration info)
  const endTime = session.scheduledTime + 2 * 60 * 60 * 1000;
  lines.push(`DTEND:${formatICSDateTime(endTime)}`);

  // Description
  const descParts: string[] = [];
  if (session.description) descParts.push(session.description);
  if (session.videoUrl) descParts.push(`Video: ${session.videoUrl}`);
  if (descParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeICSText(descParts.join('\\n'))}`);
  }

  // Location (video URL)
  if (session.videoUrl) {
    lines.push(`LOCATION:${session.videoUrl}`);
  }

  // Timestamps
  lines.push(`DTSTAMP:${formatICSDateTime(Date.now())}`);

  // Recurrence rule
  if (session.recurrence && session.recurrence.frequency !== 'NONE') {
    const freq = session.recurrence.frequency;
    let rrule = `RRULE:FREQ=${freq}`;
    if (session.recurrence.interval > 1) {
      rrule += `;INTERVAL=${session.recurrence.interval}`;
    }
    if (session.recurrence.until) {
      rrule += `;UNTIL=${formatICSDateTime(session.recurrence.until)}`;
    }
    if (session.recurrence.count) {
      rrule += `;COUNT=${session.recurrence.count}`;
    }
    lines.push(rrule);
  }

  // Alarm reminders
  for (const reminder of session.reminders) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Watch party "${session.title}" starts in ${reminder.minutesBefore} minutes`,
      `TRIGGER:-PT${reminder.minutesBefore}M`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Create a downloadable Blob URL for an ICS file
 */
export function createICSDownloadUrl(session: ScheduledSession): string {
  const icsContent = generateSessionICS(session);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Trigger download of an ICS file
 */
export function downloadICS(session: ScheduledSession): void {
  const url = createICSDownloadUrl(session);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
