/**
 * Typed REST client — the contract between the browser and the API routes.
 *
 * Client components import `api` from here. Server components should call the
 * repository (lib/db/repository.ts) directly instead. Every API route under
 * app/api/ implements exactly the method/URL/payload pairs used below.
 */

import type {
  AppSettings,
  BlockTemplate,
  BlockTemplateInput,
  Domain,
  DomainInput,
  Goal,
  GoalInput,
  GoalWithProgress,
  Habit,
  HabitInput,
  HabitLog,
  HabitLogInput,
  HabitStats,
  HabitWithStatus,
  Patch,
  Reminder,
  ReminderInput,
  TimeBlock,
  TimeBlockInput,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const api = {
  domains: {
    list: () => http<Domain[]>("GET", "/api/domains"),
    create: (input: DomainInput) => http<Domain>("POST", "/api/domains", input),
    update: (id: string, patch: Patch<Domain>) =>
      http<Domain>("PATCH", `/api/domains/${id}`, patch),
    remove: (id: string) => http<void>("DELETE", `/api/domains/${id}`),
  },

  goals: {
    list: (filter?: { level?: string; parentId?: string | null; status?: string }) =>
      http<Goal[]>("GET", `/api/goals${query({ ...filter })}`),
    tree: () => http<GoalWithProgress[]>("GET", "/api/goals/tree"),
    get: (id: string) => http<Goal>("GET", `/api/goals/${id}`),
    create: (input: GoalInput) => http<Goal>("POST", "/api/goals", input),
    update: (id: string, patch: Patch<Goal>) =>
      http<Goal>("PATCH", `/api/goals/${id}`, patch),
    remove: (id: string) => http<void>("DELETE", `/api/goals/${id}`),
  },

  habits: {
    list: (includeArchived = false) =>
      http<Habit[]>("GET", `/api/habits${query({ includeArchived })}`),
    get: (id: string) => http<Habit>("GET", `/api/habits/${id}`),
    create: (input: HabitInput) => http<Habit>("POST", "/api/habits", input),
    update: (id: string, patch: Patch<Habit>) =>
      http<Habit>("PATCH", `/api/habits/${id}`, patch),
    remove: (id: string) => http<void>("DELETE", `/api/habits/${id}`),
    status: (date: string) =>
      http<HabitWithStatus[]>("GET", `/api/habits/status${query({ date })}`),
    stats: (id: string, date: string) =>
      http<HabitStats>("GET", `/api/habits/${id}/stats${query({ date })}`),
  },

  habitLogs: {
    list: (filter?: { habitId?: string; from?: string; to?: string }) =>
      http<HabitLog[]>("GET", `/api/habit-logs${query({ ...filter })}`),
    upsert: (input: HabitLogInput) => http<HabitLog>("POST", "/api/habit-logs", input),
    remove: (id: string) => http<void>("DELETE", `/api/habit-logs/${id}`),
  },

  timeBlocks: {
    list: (date: string) =>
      http<TimeBlock[]>("GET", `/api/time-blocks${query({ date })}`),
    create: (input: TimeBlockInput) => http<TimeBlock>("POST", "/api/time-blocks", input),
    update: (id: string, patch: Patch<TimeBlock>) =>
      http<TimeBlock>("PATCH", `/api/time-blocks/${id}`, patch),
    remove: (id: string) => http<void>("DELETE", `/api/time-blocks/${id}`),
    applyTemplate: (templateId: string, date: string) =>
      http<TimeBlock[]>("POST", "/api/time-blocks/apply-template", { templateId, date }),
  },

  templates: {
    list: () => http<BlockTemplate[]>("GET", "/api/templates"),
    get: (id: string) => http<BlockTemplate>("GET", `/api/templates/${id}`),
    create: (input: BlockTemplateInput) =>
      http<BlockTemplate>("POST", "/api/templates", input),
    update: (id: string, patch: Patch<BlockTemplate>) =>
      http<BlockTemplate>("PATCH", `/api/templates/${id}`, patch),
    remove: (id: string) => http<void>("DELETE", `/api/templates/${id}`),
  },

  reminders: {
    list: (filter?: { from?: string; to?: string; unacknowledged?: boolean }) =>
      http<Reminder[]>("GET", `/api/reminders${query({ ...filter })}`),
    due: () => http<Reminder[]>("GET", "/api/reminders/due"),
    create: (input: ReminderInput) => http<Reminder>("POST", "/api/reminders", input),
    update: (id: string, patch: Patch<Reminder>) =>
      http<Reminder>("PATCH", `/api/reminders/${id}`, patch),
    remove: (id: string) => http<void>("DELETE", `/api/reminders/${id}`),
    snooze: (id: string, minutes: number) =>
      http<Reminder>("POST", `/api/reminders/${id}/snooze`, { minutes }),
    ack: (id: string) => http<Reminder>("POST", `/api/reminders/${id}/ack`),
  },

  settings: {
    get: () => http<AppSettings>("GET", "/api/settings"),
    update: (patch: Partial<AppSettings>) =>
      http<AppSettings>("PATCH", "/api/settings", patch),
  },

  push: {
    subscribe: (subscription: PushSubscriptionJSON, userAgent: string) =>
      http<{ ok: true }>("POST", "/api/push/subscribe", { subscription, userAgent }),
    unsubscribe: (endpoint: string) =>
      http<{ ok: true }>("POST", "/api/push/unsubscribe", { endpoint }),
    test: () => http<{ sent: number }>("POST", "/api/push/test"),
  },

  /** Kick the reminder dispatcher — fires due reminders as push + records them. */
  dispatch: () => http<{ dispatched: number }>("POST", "/api/dispatch"),
};
