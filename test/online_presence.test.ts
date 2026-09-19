import assert from "node:assert/strict";
import { shouldFollowUp } from "../src/online_presence.ts";

const soon = new Date(Date.now() + 60_000).toISOString();
assert.equal(shouldFollowUp(soon, []), true);
assert.equal(shouldFollowUp(soon, ["owner-7"]), false);
console.log("follow-up decision: empty presence triggers a reminder before the deadline");
