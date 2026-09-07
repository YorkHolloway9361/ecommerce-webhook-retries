import { infrai } from "./infrai.js";

export async function scheduleWorker(taskUrl: string): Promise<string> {
  const job = await infrai.cron.create({ cron_expr: "*/1 * * * *", task: taskUrl });
  return job.job_id;
}
