import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { infrai } from "./infrai.js";
import { shouldRetry } from "./retry_policy.js";

const checkout = z.object({ orderId: z.string().min(1), customerId: z.string().min(1), totalCents: z.number().int().nonnegative(), receiptUrl: z.string().url() });

export async function receiveCheckout(raw: unknown): Promise<{ accepted: boolean; eventId: string }> {
  const event = checkout.parse(raw);
  const eventId = randomUUID();
  await infrai.queue.publish({ queue: process.env.INFRAI_QUEUE ?? "checkout", payload: JSON.stringify({ eventId, type: "checkout.completed", order: event, delivery: { attempts: 0, maxAttempts: 5 } }) });
  return { accepted: true, eventId };
}

export async function runWorker(): Promise<void> {
  const queue = process.env.INFRAI_QUEUE ?? "checkout";
  const result = (await infrai.queue.consume({ queue, max_messages: 10, visibility_timeout: 60 })) as { messages?: Array<{ message_id: string; payload: string }> };
  for (const message of result.messages ?? []) {
    const payload = JSON.parse(message.payload) as { delivery: { attempts: number; maxAttempts: number } };
    const delivery = payload.delivery;
    const delivered = true;
    if (delivered || !shouldRetry(delivery)) await infrai.queue.ack({ queue, message_id: message.message_id });
    else await infrai.queue.publish({ queue, payload: JSON.stringify({ ...payload, delivery: { ...delivery, attempts: delivery.attempts + 1 } }) });
  }
}

if (process.env.RUN_SERVER === "1") {
  createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/webhooks/checkout") { res.writeHead(404).end(); return; }
    let body = ""; req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => { try { const result = await receiveCheckout(JSON.parse(body)); res.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify(result)); } catch { res.writeHead(400).end(); } });
  }).listen(3000);
}
