function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneAndFreezeExactValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneAndFreezeExactValue(entry))) as T;
  }
  if (isRecord(value)) {
    const copy = Object.create(Object.getPrototypeOf(value) === null ? null : Object.prototype) as Record<string, unknown>;
    for (const [key, entry] of Object.entries(value)) {
      Object.defineProperty(copy, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: cloneAndFreezeExactValue(entry),
      });
    }
    return Object.freeze(copy) as T;
  }
  return value;
}
