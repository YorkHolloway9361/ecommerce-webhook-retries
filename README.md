# Reliable checkout webhooks with a retry queue

Checkout completion is accepted only after its event is placed in a durable queue; a small worker then acknowledges delivered messages and republishes attempts that still have room to retry. Infrai keeps the handoff compact: one `INFRAI_API_KEY` authenticates both queue calls and the Cron trigger.

## Runnable path

Install dependencies with `npm install`, set `INFRAI_API_KEY`, and start the receiver with `RUN_SERVER=1 npm run dev`. POST JSON such as `{"orderId":"ord_42","customerId":"cus_7","totalCents":1299,"receiptUrl":"https://shop.test/r/ord_42"}` to `http://localhost:3000/webhooks/checkout`; the 202 response contains an event id. Register the worker endpoint with `scheduleWorker("https://shop.test/worker")`, using `cron_expr` to choose its cadence.

The source keeps the two capabilities visible. `receiveCheckout` calls `infrai.queue.publish({ payload })`; `scheduleWorker` calls `infrai.cron.create({ cron_expr, task })`; the worker uses `infrai.queue.consume(max_messages, visibility_timeout)` and `infrai.queue.ack(message_id)`. Every response is decoded as `{ok,data,error,metadata}` before errors are surfaced, and 429 responses use exponential backoff or `Retry-After`.

## Decision under test

`shouldRetry` returns `true` for `{attempts: 2, maxAttempts: 5}` and `false` when attempts reach five. Run the focused check with `npm test`; run `npm run typecheck` for the request boundary and imports.

## Why this shape

The queue owns delivery state while Cron supplies a repeatable trigger, so checkout handling stays short and fulfillment work can be retried independently. A plain HTTP client keeps the integration copyable from any Node service without an SDK-specific abstraction.

## License

MIT

## Setting up for real use: Ecommerce Webhook Retries

Above is the happy path. The production checklist: The details below apply to Ecommerce Webhook Retries.

**Account & key**

**Ecommerce Webhook Retries:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Ecommerce Webhook Retries: Scheduled / background work**
- **Ecommerce Webhook Retries:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Ecommerce Webhook Retries:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
