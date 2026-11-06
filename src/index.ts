export interface BloomOptions {
  bitCount?: number;
  hashCount?: number;
  seed?: number;
}
export interface BloomSnapshot {
  version: 1;
  bitCount: number;
  hashCount: number;
  seed: number;
  bytes: number[];
}
function dimensions(bitCount: number, hashCount: number, seed: number): void {
  if (
    !Number.isSafeInteger(bitCount) ||
    bitCount < 8 ||
    bitCount > 8388608 ||
    bitCount % 8 !== 0 ||
    !Number.isSafeInteger(hashCount) ||
    hashCount < 1 ||
    hashCount > 32 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw new RangeError('Invalid Bloom dimensions or seed');
}
export class BloomFilter {
  readonly bitCount: number;
  readonly hashCount: number;
  readonly seed: number;
  private readonly bits: Uint8Array;
  constructor(options: BloomOptions = {}) {
    this.bitCount = options.bitCount ?? 8192;
    this.hashCount = options.hashCount ?? 7;
    this.seed = options.seed ?? 0;
    dimensions(this.bitCount, this.hashCount, this.seed);
    this.bits = new Uint8Array(this.bitCount / 8);
  }
  private positions(value: string): number[] {
    if (typeof value !== 'string') throw new TypeError('Bloom keys must be strings');
    if (value.length > 1000000) throw new RangeError('Key length exceeds 1000000 UTF16 units');
    let first = (2166136261 ^ this.seed) >>> 0,
      second = (0x9e3779b9 ^ this.seed) >>> 0;
    for (let i = 0; i < value.length; i++) {
      const unit = value.charCodeAt(i);
      first = Math.imul(first ^ unit, 16777619) >>> 0;
      second = Math.imul(second ^ unit, 0x85ebca6b) >>> 0;
    }
    first = (first ^ (first >>> 16)) >>> 0;
    second = ((second ^ (second >>> 13)) | 1) >>> 0;
    return Array.from({ length: this.hashCount }, (_, i) => (first + i * second) % this.bitCount);
  }
  add(value: string): void {
    for (const bit of this.positions(value))
      this.bits[bit >>> 3] = this.bits[bit >>> 3]! | (1 << (bit & 7));
  }
  has(value: string): boolean {
    return this.positions(value).every((bit) => (this.bits[bit >>> 3]! & (1 << (bit & 7))) !== 0);
  }
  clear(): void {
    this.bits.fill(0);
  }
  get setBits(): number {
    let count = 0;
    for (const byte of this.bits) {
      let value = byte;
      while (value) {
        value &= value - 1;
        count++;
      }
    }
    return count;
  }
  merge(other: BloomFilter): void {
    if (!(other instanceof BloomFilter)) throw new TypeError('Expected BloomFilter');
    if (
      this.bitCount !== other.bitCount ||
      this.hashCount !== other.hashCount ||
      this.seed !== other.seed
    )
      throw new RangeError('Bloom dimensions and seed must match');
    for (let i = 0; i < this.bits.length; i++) this.bits[i] = this.bits[i]! | other.bits[i]!;
  }
  snapshot(): BloomSnapshot {
    return {
      version: 1,
      bitCount: this.bitCount,
      hashCount: this.hashCount,
      seed: this.seed,
      bytes: Array.from(this.bits),
    };
  }
  static fromSnapshot(snapshot: BloomSnapshot): BloomFilter {
    if (!snapshot || snapshot.version !== 1) throw new TypeError('Unsupported Bloom snapshot');
    dimensions(snapshot.bitCount, snapshot.hashCount, snapshot.seed);
    if (!Array.isArray(snapshot.bytes) || snapshot.bytes.length !== snapshot.bitCount / 8)
      throw new RangeError('Invalid snapshot byte length');
    for (const byte of snapshot.bytes)
      if (!Number.isInteger(byte) || byte < 0 || byte > 255)
        throw new RangeError('Invalid snapshot byte');
    const result = new BloomFilter(snapshot);
    result.bits.set(snapshot.bytes);
    return result;
  }
}
