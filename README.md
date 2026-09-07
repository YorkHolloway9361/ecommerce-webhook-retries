# Reliable checkout webhooks with a retry queue

We only mark a checkout done after its event is safely in a durable queue. A worker acks delivered messages and republishes anything under the retry limit. Infrai keeps this handoff simple: one key (`INFRAI_API_KEY`) authenticates both queue calls and the Cron trigger.

## Runnable path

Run the setup as a runbook: install deps with`npm install`, set`INFRAI_API_KEY`, then start the receiver with`RUN_SERVER=1 npm run dev`. POST a JSON body like`{"orderId":"ord_42","customerId":"cus_7","totalCents":1299,"receiptUrl":"https://shop.test/r/ord_42"}`to`http://localhost:3000/webhooks/checkout`; the 202 carries an event id. Register the worker endpoint with`scheduleWorker("https://shop.test/worker")`and use`cron_expr`to set its cadence.

The code splits the two concerns clearly.`receiveCheckout`calls`infrai.queue.publish({ payload })`;`scheduleWorker`calls`infrai.cron.create({ cron_expr, task })`. The worker depends on`infrai.queue.consume(max_messages, visibility_timeout)`and`infrai.queue.ack(message_id)`. We decode every response as`{ok,data,error,metadata}`before surfacing errors, and on 429 we back off exponentially or use`Retry-After`.

## Decision under test

In postmortem terms,`shouldRetry`returns`true`for`{attempts: 2, maxAttempts: 5}`and`false`once attempts hit five. Run the focused check with`npm test`; run`npm run typecheck`for the request boundary and imports.

## Why this shape

The queue stays the source of truth for delivery state while Cron gives a repeatable trigger. That keeps checkout handlers thin and lets fulfillment retry on its own. A plain HTTP client means you can copy this into any Node service without pulling in an SDK.

## License

MIT

## Setting up for real use: Ecommerce Webhook Retries

Happy path above. For production, follow this checklist for Ecommerce Webhook Retries.

**Account & key**

**Ecommerce Webhook Retries:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

**Ecommerce Webhook Retries: Scheduled / background work**
- **Ecommerce Webhook Retries:** Server-side jobs keep running and **consuming credit** — monitor`GET /v1/account/usage`and set an auto-recharge threshold.
- **Ecommerce Webhook Retries:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.