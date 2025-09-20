// Simple deterministic RNG (Linear Congruential Generator) for fuzz tests
// Not cryptographically secure. Constants from Numerical Recipes.

export class SeededRng {
  private state: number;
  constructor(seed: number | string) {
    if (typeof seed === 'string') {
      // hash string seed to 32-bit
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      this.state = h >>> 0;
    } else {
      this.state = (seed >>> 0) || 1;
    }
  }
  // next float in [0,1)
  next(): number {
    // LCG: X_{n+1} = (aX + c) mod m
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }
  // integer in [0, n)
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)];
  }
  bool(p = 0.5): boolean { return this.next() < p; }
}

export function rng(seed: number | string) { return new SeededRng(seed); }
