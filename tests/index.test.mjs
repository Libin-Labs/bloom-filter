import test from 'node:test';
import assert from 'node:assert/strict';
import * as lib from '../dist/esm/index.js';
function random(seed = 123456789) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test('membership and empty state', () => {
  const f = new lib.BloomFilter();
  assert.equal(f.has('abc'), false);
  f.add('abc');
  f.add('😀');
  f.add('');
  for (const s of ['abc', '😀', '']) assert.equal(f.has(s), true);
  assert.ok(f.setBits > 0);
});
test('serialization round trip and owned data', () => {
  const f = new lib.BloomFilter({ bitCount: 128, hashCount: 3, seed: 42 });
  f.add('item');
  const s = f.snapshot(),
    g = lib.BloomFilter.fromSnapshot(JSON.parse(JSON.stringify(s)));
  assert.equal(g.has('item'), true);
  s.bytes.fill(0);
  assert.equal(g.has('item'), true);
  assert.equal(f.has('item'), true);
});
test('merge compatible filters retains membership', () => {
  const a = new lib.BloomFilter(),
    b = new lib.BloomFilter();
  a.add('left');
  b.add('right');
  a.merge(b);
  assert.equal(a.has('left'), true);
  assert.equal(a.has('right'), true);
  assert.equal(b.has('right'), true);
  a.merge(a);
  assert.throws(() => a.merge(new lib.BloomFilter({ seed: 1 })), RangeError);
});
test('dimension snapshot and key validation', () => {
  for (const options of [{ bitCount: 7 }, { bitCount: 9 }, { hashCount: 0 }, { seed: -1 }])
    assert.throws(() => new lib.BloomFilter(options), RangeError);
  const f = new lib.BloomFilter({ bitCount: 8 });
  assert.throws(() => lib.BloomFilter.fromSnapshot({ ...f.snapshot(), bytes: [256] }), RangeError);
  assert.throws(() => lib.BloomFilter.fromSnapshot({ ...f.snapshot(), version: 2 }), TypeError);
  assert.throws(() => f.add(1), TypeError);
});
test('deterministic known hash layout and clear', () => {
  const f = new lib.BloomFilter({ bitCount: 64, hashCount: 2 });
  f.add('a');
  const first = Math.imul(2166136261 ^ 97, 16777619) >>> 0,
    second = Math.imul(0x9e3779b9 ^ 97, 0x85ebca6b) >>> 0,
    h1 = (first ^ (first >>> 16)) >>> 0,
    h2 = ((second ^ (second >>> 13)) | 1) >>> 0,
    bytes = Array(8).fill(0);
  for (let i = 0; i < 2; i++) {
    const bit = (h1 + i * h2) % 64;
    bytes[bit >>> 3] |= 1 << (bit & 7);
  }
  assert.deepEqual(f.snapshot().bytes, bytes);
  f.clear();
  assert.equal(f.setBits, 0);
  assert.equal(f.has('a'), false);
});
test('seeded exact bitset oracle no false negatives after merges', () => {
  const rng = random();
  for (let t = 0; t < 30; t++) {
    const options = { bitCount: 512, hashCount: 5, seed: Math.floor(rng() * 2 ** 32) },
      a = new lib.BloomFilter(options),
      b = new lib.BloomFilter(options),
      keys = Array.from({ length: 80 }, () => String(Math.floor(rng() * 1e9)) + '😀');
    keys.forEach((s, i) => (i % 2 ? a : b).add(s));
    const aa = a.snapshot().bytes,
      bb = b.snapshot().bytes;
    a.merge(b);
    assert.deepEqual(
      a.snapshot().bytes,
      aa.map((x, i) => x | bb[i]),
    );
    const restored = lib.BloomFilter.fromSnapshot(a.snapshot());
    for (const key of keys) {
      assert.equal(a.has(key), true);
      assert.equal(restored.has(key), true);
    }
    assert.equal(
      a.setBits,
      a
        .snapshot()
        .bytes.reduce((sum, byte) => sum + byte.toString(2).replaceAll('0', '').length, 0),
    );
  }
});
