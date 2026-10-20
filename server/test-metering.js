#!/usr/bin/env node

/**
 * Tests for the MeteringService (authoritative server-side metering)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { MeteringService } = require('./metering-service');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error.message}`);
    if (error.stack) {
      const lines = error.stack.split('\n').slice(1, 4);
      lines.forEach((l) => console.error(`    ${l}`));
    }
  }
}

// ---------------------------------------------------------------------------
// Sliding window tests
// ---------------------------------------------------------------------------

console.log('\n🧪 MeteringService -- sliding window enforcement');

test('allows usage below limit', () => {
  const now = () => 1_000;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 3, windowMs: 60_000, action: 'warn' } } }, { now });
  const r = svc.checkAndRecord('u1', 'chatMessages', 1);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.current, 1);
});

test('allows usage at exactly the limit', () => {
  const now = () => 1_000;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 2, windowMs: 60_000, action: 'reject' } } }, { now });
  svc.checkAndRecord('u1', 'chatMessages', 1);
  const r = svc.checkAndRecord('u1', 'chatMessages', 1);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.current, 2);
});

test('rejects usage above the limit', () => {
  const now = () => 1_000;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 2, windowMs: 60_000, action: 'reject' } } }, { now });
  svc.checkAndRecord('u1', 'chatMessages', 2);
  const r = svc.checkAndRecord('u1', 'chatMessages', 1);
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.current, 2);
  assert.strictEqual(r.action, 'reject');
});

test('does not record when limit is exceeded (non-authoritative count unchanged)', () => {
  const now = () => 1_000;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 1, windowMs: 60_000, action: 'reject' } } }, { now });
  svc.checkAndRecord('u1', 'chatMessages', 1);
  svc.checkAndRecord('u1', 'chatMessages', 1); // rejected, should NOT increment
  const state = svc.getState('u1');
  assert.strictEqual(state.usage.chatMessages.current, 1); // still 1, not 2
});

test('window rollover resets counters', () => {
  let t = 0;
  const now = () => t;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 1, windowMs: 100, action: 'reject' } } }, { now });
  svc.checkAndRecord('u1', 'chatMessages', 1);
  t += 100; // window expires
  const r = svc.checkAndRecord('u1', 'chatMessages', 1);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.current, 1);
});

test('per-user isolation', () => {
  const now = () => 1_000;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 1, windowMs: 60_000, action: 'reject' } } }, { now });
  svc.checkAndRecord('u1', 'chatMessages', 1);
  const r2 = svc.checkAndRecord('u2', 'chatMessages', 1);
  assert.strictEqual(r2.allowed, true);
});

test('windowMs 0 (concurrent gauge) via checkAndRecord', () => {
  const now = () => 1_000;
  const svc = new MeteringService({ dimensions: { connections: { enabled: true, limit: 2, windowMs: 0, action: 'reject' } } }, { now });
  // Gauge: current tracks existing connections, not timestamps
  const r1 = svc.checkAndRecord('u1', 'connections', 1);
  // The gauge count starts at 0; checkAndRecord with gauge doesn't actually acquire
  // Use acquireConnection for gauge dimensions
  assert.strictEqual(typeof r1.allowed, 'boolean');
});

// ---------------------------------------------------------------------------
// Connection (gauge) tests
// ---------------------------------------------------------------------------

console.log('\n🧪 MeteringService -- connection gauge');

test('acquireConnection adds a slot', () => {
  const svc = new MeteringService({});
  const r = svc.acquireConnection('u1', 'token-1');
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.current, 1);
  assert.strictEqual(r.limit, 5);
});

test('acquireConnection rejects over limit', () => {
  const svc = new MeteringService({ dimensions: { connections: { enabled: true, limit: 2, windowMs: 0, action: 'reject' } } });
  svc.acquireConnection('u1', 't1');
  svc.acquireConnection('u1', 't2');
  const r = svc.acquireConnection('u1', 't3');
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.current, 2);
});

test('releaseConnection frees a slot', () => {
  const svc = new MeteringService({ dimensions: { connections: { enabled: true, limit: 2, windowMs: 0, action: 'reject' } } });
  svc.acquireConnection('u1', 't1');
  svc.releaseConnection('u1', 't1');
  const r = svc.acquireConnection('u1', 't2');
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.current, 1);
});

test('releaseConnection is idempotent', () => {
  const svc = new MeteringService({});
  svc.acquireConnection('u1', 't1');
  svc.releaseConnection('u1', 't1');
  svc.releaseConnection('u1', 't1'); // no crash
  const r = svc.acquireConnection('u1', 't2');
  assert.strictEqual(r.current, 1);
});

test('connection lifecycle: acquire -> release -> re-acquire', () => {
  const svc = new MeteringService({ dimensions: { connections: { enabled: true, limit: 1, windowMs: 0, action: 'reject' } } });
  const a = svc.acquireConnection('u1', 't1');
  assert.strictEqual(a.allowed, true);
  assert.strictEqual(a.current, 1);

  // Second connection while first is active -> rejected
  const b = svc.acquireConnection('u1', 't2');
  assert.strictEqual(b.allowed, false);
  assert.strictEqual(b.current, 1);

  // Release then re-acquire
  svc.releaseConnection('u1', 't1');
  const c = svc.acquireConnection('u1', 't3');
  assert.strictEqual(c.allowed, true);
  assert.strictEqual(c.current, 1);
});

test('connections are isolated per user', () => {
  const svc = new MeteringService({ dimensions: { connections: { enabled: true, limit: 1, windowMs: 0, action: 'reject' } } });
  svc.acquireConnection('u1', 't1');
  const r = svc.acquireConnection('u2', 't2');
  assert.strictEqual(r.allowed, true);
});

// ---------------------------------------------------------------------------
// Config validation & normalisation
// ---------------------------------------------------------------------------

console.log('\n🧪 MeteringService -- config normalisation');

test('uses defaults for missing config', () => {
  const svc = new MeteringService(null);
  const cfg = svc.getConfig();
  assert.strictEqual(cfg.enabled, true);
  assert.strictEqual(typeof cfg.dimensions.chatMessages.limit, 'number');
});

test('uses defaults for unknown dimensions', () => {
  const svc = new MeteringService({ dimensions: { unknown: { enabled: true } } });
  const cfg = svc.getConfig();
  assert.strictEqual(typeof cfg.dimensions.chatMessages.limit, 'number');
});

test('accepts custom config', () => {
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 5, windowMs: 30_000, action: 'reject' } } });
  assert.strictEqual(svc.getConfig().dimensions.chatMessages.limit, 5);
});

// ---------------------------------------------------------------------------
// Disabled metering
// ---------------------------------------------------------------------------

console.log('\n🧪 MeteringService -- disabled mode');

test('all checks pass when disabled', () => {
  const svc = new MeteringService({ enabled: false });
  const r = svc.checkAndRecord('u1', 'chatMessages', 999);
  assert.strictEqual(r.allowed, true);
});

test('acceptConnection passes when disabled', () => {
  const svc = new MeteringService({ enabled: false });
  const r = svc.acquireConnection('u1', 't1');
  assert.strictEqual(r.allowed, true);
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

console.log('\n🧪 MeteringService -- state reporting');

test('getState returns authoritative state', () => {
  const now = () => 5_000;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 10, windowMs: 60_000, action: 'warn' } } }, { now });
  svc.checkAndRecord('u1', 'chatMessages', 3);
  const state = svc.getState('u1');
  assert.strictEqual(state.source, 'server');
  assert.strictEqual(state.usage.chatMessages.current, 3);
  assert.strictEqual(state.usage.chatMessages.authoritative, true);
});

test('getState omits disabled dimensions', () => {
  const svc = new MeteringService({
    enabled: true,
    dimensions: {
      chatMessages: { enabled: false, limit: 10, windowMs: 60_000, action: 'warn' },
      reactions: { enabled: true, limit: 10, windowMs: 60_000, action: 'warn' },
    },
  });
  const state = svc.getState('u1');
  assert.ok(!state.usage.chatMessages);
  assert.ok(state.usage.reactions);
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

console.log('\n🧪 MeteringService -- persistence');

test('saves and loads state from disk', () => {
  const tmpFile = path.join(__dirname, 'test-metering-state.json');
  try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

  let t = 1000;
  const now = () => t;
  const svc1 = new MeteringService(
    { dimensions: { chatMessages: { enabled: true, limit: 10, windowMs: 60_000, action: 'warn' } } },
    { now, stateFile: tmpFile }
  );
  svc1.checkAndRecord('u1', 'chatMessages', 3);
  svc1.saveState();

  const svc2 = new MeteringService(
    { dimensions: { chatMessages: { enabled: true, limit: 10, windowMs: 60_000, action: 'warn' } } },
    { now, stateFile: tmpFile }
  );
  const state = svc2.getState('u1');
  assert.strictEqual(state.usage.chatMessages.current, 3);

  try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
});

test('handles corrupt state file gracefully', () => {
  const tmpFile = path.join(__dirname, 'test-metering-corrupt.json');
  fs.writeFileSync(tmpFile, 'NOT JSON {{{');
  try {
    const svc = new MeteringService({}, { stateFile: tmpFile });
    const cfg = svc.getConfig();
    assert.strictEqual(cfg.enabled, true); // defaults used
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
});

// ---------------------------------------------------------------------------
// Prune
// ---------------------------------------------------------------------------

console.log('\n🧪 MeteringService -- prune');

test('prune clears expired windows', () => {
  let t = 0;
  const now = () => t;
  const svc = new MeteringService({ dimensions: { chatMessages: { enabled: true, limit: 10, windowMs: 100, action: 'warn' } } }, { now });
  svc.checkAndRecord('u1', 'chatMessages', 5);
  t = 200;
  svc.prune();
  const state = svc.getState('u1');
  assert.strictEqual(state.usage.chatMessages.current, 0);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
