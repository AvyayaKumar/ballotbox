import type { PollingHours } from './types';

/**
 * Parses the free-text hours officials publish to VIP, e.g.
 *   "Tue, Nov 3: 6 am - 7 pm\nWed, Nov 4: 8:30 am - 5:00 pm"  or  "6:00 AM - 8:00 PM"
 * Lines that can't be split into a range are kept verbatim in `openTime`.
 */
export function parseHours(text: string | undefined): PollingHours[] {
  if (!text) return [];
  const out: PollingHours[] = [];
  const time = String.raw`\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|noon|midnight)?`;
  const re = new RegExp(`^(?:(.*?):\\s+)?(${time})\\s*[-–—]\\s*(${time})$`, 'i');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(re);
    if (m) {
      out.push({ day: m[1]?.trim() || undefined, openTime: m[2].trim(), closeTime: m[3].trim() });
    } else {
      out.push({ openTime: line, closeTime: '' });
    }
  }
  return out;
}

/** "Fri, Oct 2" - the day format VIP uses, in the viewer's local time zone. */
export function todayLabel(now = new Date()): string {
  return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function parseClock(timeStr: string, now: Date): Date | null {
  const s = timeStr.trim().toLowerCase();
  if (s === 'noon') return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0);
  if (s === 'midnight') return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const period = m[3]?.replace(/\./g, '');
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

/** The hours line that matters most right now: today's if present, else the next dated one, else the first. */
export function pickRelevantHours(hours: PollingHours[], now = new Date()): PollingHours | undefined {
  if (hours.length === 0) return undefined;
  const label = todayLabel(now);
  const today = hours.find((h) => h.day === label);
  if (today) return today;
  const undated = hours.find((h) => !h.day);
  if (undated && hours.every((h) => !h.day)) return undated;
  // Dated lines are published in chronological order; the first one at or after today is next.
  const year = now.getFullYear();
  const upcoming = hours.find((h) => {
    if (!h.day) return false;
    const d = new Date(`${h.day} ${year}`);
    return !Number.isNaN(d.getTime()) && d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  return upcoming ?? hours[0];
}

export type OpenStatus = { label: string; variant: 'success' | 'warning' | 'neutral' };

/** Open/closed status for right now. Only computed for a line that applies today (or has no date). */
export function getOpenStatus(entry: PollingHours | undefined, now = new Date()): OpenStatus | null {
  if (!entry || !entry.closeTime) return null;
  if (entry.day && entry.day !== todayLabel(now)) return null;
  const open = parseClock(entry.openTime, now);
  const close = parseClock(entry.closeTime, now);
  if (!open || !close) return null;
  if (now >= open && now < close) {
    const diffMins = Math.round((close.getTime() - now.getTime()) / 60000);
    if (diffMins <= 60) return { label: `Closes in ${diffMins}m`, variant: 'warning' };
    return { label: 'Open now', variant: 'success' };
  }
  if (now < open) return { label: `Opens ${entry.openTime}`, variant: 'neutral' };
  return { label: 'Closed for today', variant: 'neutral' };
}

export function formatHoursLine(h: PollingHours): string {
  const range = h.closeTime ? `${h.openTime} – ${h.closeTime}` : h.openTime;
  return h.day ? `${h.day}: ${range}` : range;
}
