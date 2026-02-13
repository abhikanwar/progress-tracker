const TIMEZONE_KEY = "progress_tracker_timezone";

export const settingsStorage = {
  getTimezone: () => localStorage.getItem(TIMEZONE_KEY),
  setTimezone: (timezone: string) => localStorage.setItem(TIMEZONE_KEY, timezone),
  getResolvedTimezone: () =>
    localStorage.getItem(TIMEZONE_KEY) ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
};
