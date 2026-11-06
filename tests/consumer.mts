import { BloomFilter, type BloomOptions, type BloomSnapshot } from '@lp-labs/bloom-filter';
export type PublicTypes = [BloomOptions, BloomSnapshot];
void BloomFilter;
const filter = new BloomFilter({ bitCount: 1024, hashCount: 4 });
filter.add('hello');
const snapshot: BloomSnapshot = filter.snapshot();
const restored: BloomFilter = BloomFilter.fromSnapshot(snapshot);
void restored;
// @ts-expect-error string membership keys only
filter.has(1);
