const test = require("node:test");
const assert = require("node:assert/strict");
const {
  agentIdFromKey,
  extractTokens,
  findSessionRow,
  computeThreshold
} = require("./session-state");

test("agentIdFromKey parses agent:<id>:... and returns empty for non-agent keys", () => {
  assert.equal(agentIdFromKey("agent:main:home:dm:za:sess1"), "main");
  assert.equal(agentIdFromKey("agent:work:main"), "work");
  assert.equal(agentIdFromKey(""), "");
  assert.equal(agentIdFromKey("weird:key"), "");
});

test("extractTokens reads totalTokens / currentTokenCount / tokens, else undefined", () => {
  assert.equal(extractTokens({ totalTokens: 42 }), 42);
  assert.equal(extractTokens({ currentTokenCount: 7 }), 7);
  assert.equal(extractTokens({ tokens: 9 }), 9);
  assert.equal(extractTokens({}), undefined);
  assert.equal(extractTokens({ totalTokens: "nope" }), undefined);
  assert.equal(extractTokens(null), undefined);
});

test("findSessionRow matches by key or sessionKey", () => {
  const list = { sessions: [{ key: "a" }, { sessionKey: "b" }] };
  assert.deepEqual(findSessionRow(list, "a"), { key: "a" });
  assert.deepEqual(findSessionRow(list, "b"), { sessionKey: "b" });
  assert.equal(findSessionRow(list, "c"), null);
  assert.equal(findSessionRow({}, "a"), null);
});

test("computeThreshold: no session key -> conservative skip", () => {
  const r = computeThreshold({ sessionKey: "", agentId: "", threshold: 100, listSessions: () => ({ sessions: [] }) });
  assert.equal(r.needCompact, false);
  assert.equal(r.reason, "no-session");
});

test("computeThreshold: tokens missing -> usage-unavailable (skip)", () => {
  const listSessions = () => ({ sessions: [{ key: "agent:main:x" }] });
  const r = computeThreshold({ sessionKey: "agent:main:x", agentId: "main", threshold: 100, listSessions });
  assert.equal(r.needCompact, false);
  assert.equal(r.reason, "usage-unavailable");
});

test("computeThreshold: tokens >= threshold -> needCompact true", () => {
  const listSessions = () => ({ sessions: [{ key: "agent:main:x", totalTokens: 150 }] });
  const r = computeThreshold({ sessionKey: "agent:main:x", agentId: "main", threshold: 100, listSessions });
  assert.equal(r.needCompact, true);
  assert.equal(r.tokens, 150);
});

test("computeThreshold: tokens < threshold -> needCompact false", () => {
  const listSessions = () => ({ sessions: [{ key: "agent:main:x", totalTokens: 50 }] });
  const r = computeThreshold({ sessionKey: "agent:main:x", agentId: "main", threshold: 100, listSessions });
  assert.equal(r.needCompact, false);
  assert.equal(r.reason, "under-threshold");
});

test("computeThreshold: list call throws -> list-failed (skip, no throw)", () => {
  const listSessions = () => { throw new Error("gateway down"); };
  const r = computeThreshold({ sessionKey: "agent:main:x", agentId: "main", threshold: 100, listSessions });
  assert.equal(r.needCompact, false);
  assert.equal(r.reason, "list-failed");
});
