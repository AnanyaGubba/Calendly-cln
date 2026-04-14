export function cn(...values) {
  return values.filter(Boolean).join(" ");
}

export function formatDate(value, options = {}) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatTime(value) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(value) {
  return `${formatDate(value, { weekday: "short" })}, ${formatTime(value)}`;
}

export function toInputDate(date) {
  const local = typeof date === "string" ? new Date(date) : date;
  return local.toISOString().slice(0, 10);
}

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCalendarDays(anchorDate) {
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const grid = [];
  const firstWeekday = start.getDay();

  for (let i = 0; i < firstWeekday; i += 1) {
    grid.push(null);
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    grid.push(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), day));
  }

  return grid;
}

export const WEEKDAYS = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];
