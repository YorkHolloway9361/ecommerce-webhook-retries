export type Delivery = { attempts: number; maxAttempts: number };

export function shouldRetry(delivery: Delivery): boolean {
  return delivery.attempts < delivery.maxAttempts;
}
