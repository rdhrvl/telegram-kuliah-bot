import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DAYS_OF_WEEK = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu'
];

const DAY_INDEX_MAP = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu'
};

export function getNow(tz = 'Asia/Jakarta') {
  return dayjs().tz(tz);
}

export function getTodayDayName(tz = 'Asia/Jakarta') {
  const dayIndex = getNow(tz).day();
  return DAY_INDEX_MAP[dayIndex];
}

export function getTomorrowDayName(tz = 'Asia/Jakarta') {
  const dayIndex = getNow(tz).add(1, 'day').day();
  return DAY_INDEX_MAP[dayIndex];
}

export function getCurrentDateStr(tz = 'Asia/Jakarta') {
  return getNow(tz).format('YYYY-MM-DD');
}

export function getCurrentTimeStr(tz = 'Asia/Jakarta') {
  return getNow(tz).format('HH:mm');
}

export function isValidTimeFormat(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const match = timeStr.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return !!match;
}

/**
 * Parses time range string like "08:00 - 10:30" or "8:00-10:00"
 * Returns { startTime: "08:00", endTime: "10:30" } or null if invalid
 */
export function parseTimeRange(input) {
  if (!input || typeof input !== 'string') return null;
  const match = input.trim().match(/^(\d{1,2}:\d{2})\s*(?:-|–|sampai|sd|s\/d)\s*(\d{1,2}:\d{2})/i);
  if (!match) return null;

  let [, start, end] = match;
  // Pad with leading zero if needed (e.g. "8:00" -> "08:00")
  if (start.length === 4) start = '0' + start;
  if (end.length === 4) end = '0' + end;

  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) return null;

  return { startTime: start, endTime: end };
}

/**
 * Returns difference in minutes (targetTime - currentTime) for today.
 * e.g. currentTime: "08:00", targetTime: "08:15" -> 15 minutes.
 */
export function getMinutesDifference(currentTimeStr, targetTimeStr) {
  const [currH, currM] = currentTimeStr.split(':').map(Number);
  const [targH, targM] = targetTimeStr.split(':').map(Number);
  return (targH * 60 + targM) - (currH * 60 + currM);
}
