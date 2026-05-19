import { addDays, addHours, setHours, setMinutes, setSeconds, setMilliseconds, isWeekend } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TZ = "Europe/Paris";
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 19;
const BUSINESS_HOURS_PER_DAY = BUSINESS_END_HOUR - BUSINESS_START_HOUR;

/**
 * Add N business hours to `from`, then snap delivery to a random hour
 * within the business window of the resulting day.
 *
 * Example:
 *   - upload Monday 10:00 Paris, +48h ouvrées
 *     → land on Wednesday in business hours
 *     → final delivery randomized between 09:00 and 19:00 Paris on that day
 *   - upload Friday 17:00 Paris
 *     → skip weekend, land on Tuesday
 *
 * Why randomize and not deliver at the exact "+48h" minute?
 *   The whole point is to fake a human photographer. A delivery that lands at
 *   12:37:01 every time would be suspicious. Random within business window =
 *   credible.
 */
export function scheduleDelivery(from: Date, businessHoursToAdd: number = 48): Date {
  // Test mode: 0 means "deliver as soon as processing is done". No randomization,
  // no business-hour snapping. Returned as-is so the cron picks it up on the
  // next 15-min poll.
  if (businessHoursToAdd <= 0) return from;

  let cursor = toZonedTime(from, TZ);
  let remaining = businessHoursToAdd;

  while (remaining > 0) {
    if (isWeekend(cursor)) {
      cursor = setHours(addDays(cursor, 1), BUSINESS_START_HOUR);
      cursor = setMinutes(setSeconds(setMilliseconds(cursor, 0), 0), 0);
      continue;
    }

    const hour = cursor.getHours();

    if (hour < BUSINESS_START_HOUR) {
      cursor = setHours(setMinutes(setSeconds(setMilliseconds(cursor, 0), 0), 0), BUSINESS_START_HOUR);
      continue;
    }

    if (hour >= BUSINESS_END_HOUR) {
      cursor = setHours(addDays(cursor, 1), BUSINESS_START_HOUR);
      cursor = setMinutes(setSeconds(setMilliseconds(cursor, 0), 0), 0);
      continue;
    }

    // We're inside a business day. Add up to (BUSINESS_END_HOUR - hour) hours.
    const slotLeftToday = BUSINESS_END_HOUR - hour;
    const consume = Math.min(remaining, slotLeftToday);
    cursor = addHours(cursor, consume);
    remaining -= consume;
  }

  // We've landed in the business window of some weekday. Randomize the time
  // anywhere from BUSINESS_START_HOUR to BUSINESS_END_HOUR on that day.
  // (If the cursor already crossed past 19:00, walk it back to that day.)
  if (cursor.getHours() >= BUSINESS_END_HOUR) {
    cursor = setHours(cursor, BUSINESS_END_HOUR - 1);
  }

  const randomHour = BUSINESS_START_HOUR + Math.floor(Math.random() * BUSINESS_HOURS_PER_DAY);
  const randomMinute = Math.floor(Math.random() * 60);
  const randomSecond = Math.floor(Math.random() * 60);

  cursor = setHours(cursor, randomHour);
  cursor = setMinutes(cursor, randomMinute);
  cursor = setSeconds(cursor, randomSecond);
  cursor = setMilliseconds(cursor, 0);

  return fromZonedTime(cursor, TZ);
}

/**
 * Returns the first 9am business-day Paris time AT or AFTER `from`.
 * Used to gate the "Geoffrey est en train de retoucher" copy: a credible
 * human photographer doesn't start retouching the second the photos land —
 * he starts the next morning at the earliest.
 */
export function nextBusinessDayStart(from: Date): Date {
  let cursor = toZonedTime(from, TZ);
  cursor = setMinutes(setSeconds(setMilliseconds(cursor, 0), 0), 0);

  // If we're already after 9am on a business day, jump to tomorrow.
  if (!isWeekend(cursor) && cursor.getHours() >= BUSINESS_START_HOUR) {
    cursor = setHours(addDays(cursor, 1), BUSINESS_START_HOUR);
  } else {
    cursor = setHours(cursor, BUSINESS_START_HOUR);
  }

  // Skip weekends.
  while (isWeekend(cursor)) {
    cursor = setHours(addDays(cursor, 1), BUSINESS_START_HOUR);
  }
  return fromZonedTime(cursor, TZ);
}
