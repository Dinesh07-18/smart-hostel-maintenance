const test = require("node:test");
const assert = require("node:assert/strict");
const rateLimit = require("../src/middleware/rate-limit.middleware");

function response() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("rate limiter permits requests up to configured maximum", () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 2 });
  let nextCount = 0;
  for (let i = 0; i < 2; i++) {
    const res = response();
    middleware({ baseUrl: "/api/test", path: "/route", ip: "198.51.100.10" }, res, () => nextCount++);
    assert.equal(res.statusCode, 200);
  }
  assert.equal(nextCount, 2);
});

test("rate limiter rejects requests above configured maximum", () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 1, message: "slow down" });
  const req = { baseUrl: "/api/test", path: "/limited", ip: "198.51.100.11" };
  const first = response();
  middleware(req, first, () => {});
  const second = response();
  let nextCalled = false;
  middleware(req, second, () => { nextCalled = true; });
  assert.equal(second.statusCode, 429);
  assert.equal(second.body.message, "slow down");
  assert.ok(second.headers["Retry-After"]);
  assert.equal(nextCalled, false);
});

test("rate limits are isolated by client IP", () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 1 });
  const one = response();
  const two = response();
  let nextCount = 0;
  middleware({ baseUrl: "/api/test", path: "/ip", ip: "198.51.100.12" }, one, () => nextCount++);
  middleware({ baseUrl: "/api/test", path: "/ip", ip: "198.51.100.13" }, two, () => nextCount++);
  assert.equal(nextCount, 2);
});
