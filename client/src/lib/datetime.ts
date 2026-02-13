type DateInput = Date | string | number;

const getDate = (value: DateInput) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateParts = (value: DateInput, timezone: string) => {
  const date = getDate(value);
  if (!date) return null;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return null;

  return {
    year: Number.parseInt(year, 10),
    month: Number.parseInt(month, 10),
    day: Number.parseInt(day, 10),
  };
};

const toDayIndex = (parts: { year: number; month: number; day: number }) =>
  Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / (1000 * 60 * 60 * 24));

export const formatDateInTimezone = (
  value: DateInput,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
) => {
  const date = getDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(options ?? {}),
  });
};

export const formatDateTimeInTimezone = (value: DateInput, timezone: string) => {
  const date = getDate(value);
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getDateKeyInTimezone = (value: DateInput, timezone: string) => {
  const parts = getDateParts(value, timezone);
  if (!parts) return null;
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
};

export const getDayDifferenceFromTodayInTimezone = (value: DateInput, timezone: string) => {
  const targetParts = getDateParts(value, timezone);
  if (!targetParts) return null;
  const todayParts = getDateParts(new Date(), timezone);
  if (!todayParts) return null;
  return toDayIndex(targetParts) - toDayIndex(todayParts);
};
