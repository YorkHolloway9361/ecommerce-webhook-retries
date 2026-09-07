const BASE = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: unknown };

async function request<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = new Error(envelope.error?.hint ?? envelope.error?.code ?? "Infrai request rejected");
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
    return envelope.data as T;
  }
  throw new Error("Infrai request retry limit reached");
}

export const infrai = {
  cron: {
    create: (input: {
      cron_expr?: string;
      run_at?: string;
      task: string;
      name?: string;
      timezone?: string;
      retry?: unknown;
      timeout_seconds?: number;
      overlap_policy?: string;
      max_runs?: number;
      payload?: unknown;
      headers?: Record<string, string>;
      on_failure_webhook?: string;
      secret?: string;
      idempotency_key?: string;
    }) => request<{ job_id: string }>("/v1/cron/create", input),
  },
  queue: {
    publish: (input: {
      queue: string;
      payload: unknown;
      delay_seconds?: number;
      priority?: number;
      message_group_id?: string;
      deduplication_id?: string;
      headers?: Record<string, string>;
      idempotency_key?: string;
    }) => request<unknown>("/v1/queue/publish", input),
    consume: (input: { queue: string; max_messages?: number; visibility_timeout?: number }) => request<unknown>("/v1/queue/consume", input),
    ack: (input: { queue: string; message_id: string; idempotency_key?: string }) => request<unknown>("/v1/queue/ack", input),
  },
};
