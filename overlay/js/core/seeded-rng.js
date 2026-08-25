const MAX_SEED = 2147483647;

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeSeed(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const normalized = Math.abs(Math.trunc(numeric)) % MAX_SEED;
    return normalized || 1;
  }
  return (hashString(String(value)) % MAX_SEED) || 1;
}

export class SeededRng {
  constructor(seed) {
    this.seed = normalizeSeed(seed);
    this.state = this.seed >>> 0;
  }

  nextUint32() {
    let value = this.state || 0x6d2b79f5;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  next() {
    return this.nextUint32() / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, maxInclusive) {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  bool() {
    return this.next() >= 0.5;
  }

  pick(values) {
    return values[this.int(0, values.length - 1)];
  }

  shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = this.int(0, index);
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  fork(label) {
    return new SeededRng(hashString(`${this.seed}:${label}`));
  }
}
