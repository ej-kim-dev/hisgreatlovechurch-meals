import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { appOrigin, assertSameOrigin, configured, isDemo, readDemoSession, secureEqual, signDemoSession } from "../lib/auth.ts";

const initialEnv = { ...process.env };
beforeEach(() => {
  process.env.APP_MODE = "demo";
  Object.assign(process.env, { NODE_ENV: "test", APP_URL: "http://localhost:3000" });
  delete process.env.K_SERVICE;
});
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in initialEnv)) delete process.env[key];
  Object.assign(process.env, initialEnv);
});

test("demo sessions accept only signed, unexpired allowlisted identities", () => {
  const now = 1_000_000;
  const token = signDemoSession("demo-member", now);
  assert.equal(readDemoSession(token, now), "demo-member");
  assert.equal(readDemoSession(token.replace("demo-member", "demo-admin"), now), null);
  assert.equal(readDemoSession(`${token}tampered`, now), null);
  assert.equal(readDemoSession("demo-admin", now), null);
  assert.equal(readDemoSession(token, now + 5 * 24 * 60 * 60 * 1000), null);
  assert.throws(() => signDemoSession("some-user", now));
});

test("demo mode never enables in production or Cloud Run", () => {
  const token = signDemoSession("demo-admin");
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.equal(isDemo(), false);
  assert.equal(readDemoSession(token), null);
  assert.throws(() => signDemoSession("demo-admin"));
  Object.assign(process.env, { NODE_ENV: "test", K_SERVICE: "sunday-lunch" });
  assert.equal(isDemo(), false);
  assert.equal(readDemoSession(token), null);
});

test("state comparison rejects missing, mismatched, and unequal-length states", () => {
  assert.equal(secureEqual("", ""), false);
  assert.equal(secureEqual("abc", "abcd"), false);
  assert.equal(secureEqual("abc", "abd"), false);
  assert.equal(secureEqual("abc", "abc"), true);
});

test("mutations require the configured origin including its port", () => {
  assert.doesNotThrow(() => assertSameOrigin(new Request("http://localhost:3000/api/state", { headers: { origin: "http://localhost:3000" } })));
  for (const origin of ["https://attacker.example", "http://localhost:3001", "null"]) {
    assert.throws(() => assertSameOrigin(new Request("http://localhost:3000/api/state", { headers: { origin } })));
  }
  assert.throws(() => assertSameOrigin(new Request("http://localhost:3000/api/state")));
});

test("production origin must be HTTPS and configuration fails closed", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.throws(() => appOrigin());
  process.env.APP_URL = "https://lunch.example";
  assert.equal(appOrigin(), "https://lunch.example");
  process.env.APP_URL = "https://lunch.example/path";
  assert.throws(() => appOrigin());
  delete process.env.KAKAO_CLIENT_SECRET;
  assert.equal(configured(), false);
});
