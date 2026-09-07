import assert from "node:assert/strict";
import { shouldRetry } from "./retry_policy.js";

assert.equal(shouldRetry({ attempts: 2, maxAttempts: 5 }), true);
assert.equal(shouldRetry({ attempts: 5, maxAttempts: 5 }), false);
console.log("retry decision test passed");
