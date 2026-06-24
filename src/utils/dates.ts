/**
 * Dates are stored/compared as UTC calendar dates (midnight UTC) to avoid
 * timezone drift between server and client. We parse "YYYY-MM-DD" strings
 * directly into UTC dates rather than relying on the local timezone of
 * wherever the Node process happens to run.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Inclusive day count between two UTC calendar dates.
 * ASSUMPTION: counts every calendar day including weekends/public holidays.
 * Half-days are not supported - see README "Ambiguous Requirements".
 */
export function inclusiveDayCount(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}