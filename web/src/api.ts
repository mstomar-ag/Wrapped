export type AuthInfo = {
  authenticated: boolean;
  email?: string;
  name?: string;
  picture?: string;
};

export type Member = {
  id: string;
  name: string;
  role?: string;
  joinDate?: string;
  socials: {
    slack?: { userId?: string; handle?: string };
    github?: { username: string };
    linkedin?: { handle: string };
    x?: { handle: string };
    notion?: { userId?: string };
    linear?: { userId?: string; email?: string };
    email?: string;
  };
};

export type ArchiveEntry = {
  id: string;
  kind: "member" | "channel";
  subject: string;
  subjectName: string;
  windowFrom: string;
  windowTo: string;
  windowLabel?: string;
  createdAt: string;
  status: "queued" | "rendering" | "ready" | "failed";
  progress?: number;
  phase?: string;
  progressMessage?: string;
  filePath?: string;
  hasVideo?: boolean;
  error?: string;
};

export type ScheduleConfig = {
  enabled: boolean;
  cron: string;
  postTo: "dm" | "channel";
  channelId?: string;
  window: string;
  timezone?: string;
};

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) throw new Error((await res.text()) || `${res.status}`);
  return res.json() as Promise<T>;
};

export const api = {
  health: () => fetch("/api/health").then((r) => json<{ ok: boolean }>(r)),

  me: () => fetch("/api/auth/me").then((r) => json<AuthInfo>(r)),
  logout: () => fetch("/api/auth/logout", { method: "POST" }).then((r) => json<{ ok: boolean }>(r)),

  resolveChannel: (name: string) =>
    fetch(`/api/channels/resolve/${encodeURIComponent(name)}`).then((r) =>
      json<{ id: string; name: string }>(r),
    ),

  channelWrap: (body: {
    channel: string;
    window?: string;
    from?: string;
    to?: string;
    since?: string;
    quality?: "standard" | "high";
  }) =>
    fetch("/api/channels/wrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<{ id: string; windowLabel?: string }>(r)),

  listMembers: () => fetch("/api/members").then((r) => json<{ members: Member[] }>(r)),
  getMember: (id: string) => fetch(`/api/members/${id}`).then((r) => json<Member>(r)),
  upsertMember: (m: Partial<Member>) =>
    fetch("/api/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(m) }).then((r) => json<Member>(r)),
  patchMember: (id: string, socials: Member["socials"]) =>
    fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ socials }),
    }).then((r) => json<Member>(r)),
  deleteMember: (id: string) => fetch(`/api/members/${id}`, { method: "DELETE" }).then((r) => json<{ ok: boolean }>(r)),

  listProviders: (id: string) => fetch(`/api/members/${id}/links`).then((r) => json<{ providers: string[] }>(r)),
  unlinkProvider: (id: string, provider: string) =>
    fetch(`/api/members/${id}/links/${provider}`, { method: "DELETE" }).then((r) => json<{ ok: boolean }>(r)),

  previewWindow: (body: { window?: string; from?: string; to?: string; since?: string; joinDate?: string }) =>
    fetch("/api/window/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<{ label: string; from: string; to: string; preset: string | null }>(r)),

  generate: (body: {
    member: string;
    from?: string;
    to?: string;
    window?: string;
    quality?: "standard" | "high";
  }) =>
    fetch("/api/wrapped/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<{ id: string; windowLabel?: string }>(r)),

  groupWrap: (channelId: string, body: { from?: string; to?: string; window?: string }) =>
    fetch(`/api/channels/${channelId}/wrap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<{ id: string }>(r)),

  listArchive: (filters: { subject?: string; kind?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (filters.subject) q.set("subject", filters.subject);
    if (filters.kind) q.set("kind", filters.kind);
    if (filters.limit != null) q.set("limit", String(filters.limit));
    const qs = q.toString();
    return fetch(`/api/archive${qs ? `?${qs}` : ""}`).then((r) => json<{ entries: ArchiveEntry[] }>(r));
  },
  getArchiveEntry: (id: string) => fetch(`/api/archive/${id}`).then((r) => json<ArchiveEntry>(r)),
  videoUrl: (id: string) => `/api/archive/${id}/video`,
  deleteArchive: (id: string) => fetch(`/api/archive/${id}`, { method: "DELETE" }).then((r) => json<{ ok: boolean }>(r)),

  getSchedule: () => fetch("/api/schedule").then((r) => json<ScheduleConfig>(r)),
  updateSchedule: (cfg: Partial<ScheduleConfig>) =>
    fetch("/api/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cfg),
    }).then((r) => json<ScheduleConfig>(r)),
  runNow: () => fetch("/api/schedule/run-now", { method: "POST" }).then((r) => json<{ ok: boolean }>(r)),
};
