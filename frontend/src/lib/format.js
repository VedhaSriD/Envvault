export const ACTION_LABELS = {
  "team.create": "Team created",
  "member.add": "Member added",
  "member.remove": "Member removed",
  "secret.create": "Secret created",
  "secret.read": "Secret read",
  "secret.update": "Secret updated",
  "secret.delete": "Secret deleted",
  "secret.share": "Access granted",
  "secret.revoke": "Access revoked",
};

// The server stores naive UTC timestamps. Add "Z" so the browser shows local time correctly.
export function parseDate(value) {
  if (!value) return null;
  const trimmed = String(value).replace(/(\.\d{3})\d+/, "$1");
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const date = new Date(hasZone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}