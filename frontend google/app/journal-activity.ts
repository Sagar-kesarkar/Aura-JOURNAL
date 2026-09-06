import type { Entry } from './journal-data';

const valid = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function entryActivity(entry: Entry): string[] {
  if (entry.sample) return [];
  return [...new Set((entry.activityAt?.length ? entry.activityAt : [entry.createdAt, entry.updatedAt]).filter(valid))];
}

/** Record only changed user writing, preserving previous save history. */
export function trackWriting(next: Entry[], previous: Entry[], now = new Date().toISOString()): Entry[] {
  const previousById = new Map(previous.map(entry => [entry.id, entry]));
  const writing = (entry: Entry) => JSON.stringify([entry.title, entry.text, entry.messages?.filter(message => message.role !== 'model').map(message => message.text) || []]);
  return next.map(entry => {
    const old = previousById.get(entry.id);
    if (entry.sample) return entry;
    const history = [...new Set([...(old ? entryActivity(old) : []), ...(entry.activityAt || [])].filter(valid))];
    const changed = !old || old.sample || writing(old) !== writing(entry);
    return { ...entry, activityAt: [...new Set([...history, ...(changed ? [now] : [])])] };
  });
}

export function weeklyActivity(entries: Entry[], now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(monday);
    start.setDate(start.getDate() + index);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    let count = 0;
    for (const entry of entries) for (const timestamp of entryActivity(entry)) {
      const time = Date.parse(timestamp);
      if (time >= +start && time < +end && time <= +now) count++;
    }
    return { label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index], date: start, count, future: +start > +now };
  });
  return { days, total: days.reduce((sum, day) => sum + day.count, 0), activeDays: days.filter(day => day.count > 0).length };
}
