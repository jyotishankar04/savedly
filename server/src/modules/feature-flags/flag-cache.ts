type Entry = { value: unknown; found: boolean; expiresAt: number };

/** Remembers flag values for a short time, so a request that checks several flags doesn't query for each. */
export class FlagCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly ttlMs: number) {}

  /** The remembered entry for `key`, or undefined when there is none or it has expired. */
  get(key: string): { value: unknown; found: boolean } | undefined {
    const entry = this.entries.get(key);
    return entry && entry.expiresAt > Date.now() ? entry : undefined;
  }

  set(key: string, value: unknown, found: boolean): void {
    this.entries.set(key, { value, found, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }
}
