import { addDays, isWeekend, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TZ = "Europe/Paris";
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 19;
const BUSINESS_HOURS_PER_DAY = BUSINESS_END_HOUR - BUSINESS_START_HOUR;

/**
 * Returns the delivery time = `from` + N business days, with weekends
 * skipped, snapped to a random hour in [9h, 19h] Paris time of the
 * resulting day.
 *
 * Why "business days" and not "business hours":
 *   "Livré sous 48h" in French commerce means "2 jours ouvrés" (the
 *   customer expects delivery the day after tomorrow if uploaded on a
 *   Monday — not in 4-5 working days). The previous version counted
 *   actual 9h-19h hours which was way too long.
 *
 * Examples (with N=2):
 *   Upload Mon 14h → delivery Wed [9h-19h]
 *   Upload Fri 17h → delivery Tue [9h-19h]  (Sat+Sun skipped)
 *   Upload Sat 10h → delivery Tue [9h-19h]  (Sat skipped → Mon counts as day 1)
 *
 * Why random hour:
 *   The illusion is "a human photographer finished retouching" — a delivery
 *   that lands at 12:37:01 every time looks robotic. Random within business
 *   hours feels credible.
 */
export function scheduleDelivery(from: Date, businessDays: number = 2): Date {
  if (businessDays <= 0) return from;

  let cursor = toZonedTime(from, TZ);

  // Advance day by day, only counting weekdays.
  let added = 0;
  while (added < businessDays) {
    cursor = addDays(cursor, 1);
    if (!isWeekend(cursor)) added++;
  }

  // Randomize the time within business hours of the resulting day.
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
 * The first 9am business-day Paris time at or after `from`. Used to gate
 * the "Geoffrey est en train de retoucher" copy on the order page — a
 * credible human photographer doesn't start the second the photos land,
 * he starts the next morning at earliest.
 */
export function nextBusinessDayStart(from: Date): Date {
  let cursor = toZonedTime(from, TZ);
  cursor = setMinutes(setSeconds(setMilliseconds(cursor, 0), 0), 0);

  if (!isWeekend(cursor) && cursor.getHours() >= BUSINESS_START_HOUR) {
    cursor = setHours(addDays(cursor, 1), BUSINESS_START_HOUR);
  } else {
    cursor = setHours(cursor, BUSINESS_START_HOUR);
  }

  while (isWeekend(cursor)) {
    cursor = setHours(addDays(cursor, 1), BUSINESS_START_HOUR);
  }
  return fromZonedTime(cursor, TZ);
}
