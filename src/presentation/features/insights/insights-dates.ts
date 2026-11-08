const lima = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });
const day = 86_400_000;
export const dateMs = (value: string) => Date.parse(`${value}T00:00:00-05:00`);
export function defaultRange() {
  const today = Date.now();
  return { from: lima.format(new Date(today - 6 * day)), to: lima.format(new Date(today)) };
}
export const auditStart = (value: string) => new Date(dateMs(value)).toISOString();
export const auditEnd = (value: string) => new Date(dateMs(value) + day).toISOString();
export const limaDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
