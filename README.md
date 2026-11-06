# @lp-labs/bloom-filter

Bounded serializable string Bloom filters with deterministic noncryptographic hashing. Zero runtime and peer dependencies. MIT. Node.js 18+; ES2022-compatible browser runtimes with BigInt where used. No browser globals accessed at import.

## Install

```sh
npm install @lp-labs/bloom-filter
```

## Quick start

```js
import { BloomFilter } from '@lp-labs/bloom-filter';
const filter = new BloomFilter({ bitCount: 8192, hashCount: 7 });
filter.add('document:42');
const restored = BloomFilter.fromSnapshot(JSON.parse(JSON.stringify(filter.snapshot())));
console.log(restored.has('document:42')); // true; false positives are possible
```

ES modules use named imports above. CommonJS uses `const { BloomFilter } = require('@lp-labs/bloom-filter');`. Both formats ship declarations.

## Public API and customization

- `BloomOptions`: `bitCount?` default 8192, multiple of 8 in [8,8388608]; `hashCount?` default 7, in [1,32]; `seed?` uint32 default 0.
- `BloomSnapshot`: `version: 1`, `bitCount`, `hashCount`, `seed`, `bytes: number[]`.
- `BloomFilter(options?)`: read-only dimensions/seed, `add(value: string): void`, `has(value: string): boolean`, `clear(): void`, `setBits: number`, `merge(other): void` (in-place union, matching dimensions/seed), `snapshot(): BloomSnapshot`, static `fromSnapshot(snapshot): BloomFilter`.
- Snapshots are JSON-safe copies; restore validates dimensions, version, byte count and byte values. Version 1 hashes UTF16 code units with two seeded 32-bit multiply/xor hashes and double-hash positions; no Unicode normalization.

All runtime exports and public declaration types are listed above. Options are per call/instance; no global configuration.

## Errors, ownership and limits

Membership has no false negatives for added keys unless cleared or snapshot externally corrupted; positives are probabilistic, not proof of membership. False-positive rate depends on load/hash quality; no theoretical ideal-hash rate guaranteed. No removal or insert count. Max key length 1,000,000 UTF16 units. RangeError for bad dimensions/seed/bytes/length or incompatible merges; TypeError for nonstrings, wrong merge operands or snapshot version. Add/has O(key length+k), merge/snapshot/restore/setBits O(m/8), storage O(m/8), snapshot JSON uses more memory. Hashes are deterministic noncryptographic, unsuitable for secrets, adversarial denial prevention or authenticity.

Algorithms are synchronous and CPU/memory bounded by the stated limits, not cancellable or real-time. Validation does not sandbox hostile getters, proxies, callbacks or infinite iterables. TypeScript signatures are the supported input contract. No I/O, network, persistence or cryptographic guarantees.

## Development

```sh
npm ci --offline
npm run build
npm run typecheck
npm test
npm run format:check
```

Strict TypeScript, ESM/CommonJS, bare installed-package consumers with negative type assertions, and deterministic reference-oracle tests are included. Only TypeScript and Prettier are development dependencies.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
