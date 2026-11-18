// Fixed "today" so the static demo always looks the same.
export const TODAY = new Date(2026, 10, 17);
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const fmtDate = (s: string | Date) => {
  const d = typeof s === "string" ? parseISO(s) : s;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtShort = (s: string | Date) => {
  const d = typeof s === "string" ? parseISO(s) : s;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
export const daysBetween = (a: string, b: string) => Math.round((+parseISO(b) - +parseISO(a)) / 86400000) + 1;
export const fmtINR = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");
