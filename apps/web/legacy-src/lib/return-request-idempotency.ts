const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReturnKeyStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const fallbackKeys = new Map<string, string>();
const fallbackStorage: ReturnKeyStorage = {
  getItem: (key) => fallbackKeys.get(key) ?? null,
  setItem: (key, value) => {
    fallbackKeys.set(key, value);
  },
  removeItem: (key) => {
    fallbackKeys.delete(key);
  },
};

export function returnRequestStorage(): ReturnKeyStorage {
  try {
    return typeof window === "undefined" ? fallbackStorage : window.sessionStorage;
  } catch {
    return fallbackStorage;
  }
}

function reasonFingerprint(reason: string): string {
  let hash = 2166136261;
  for (const character of reason.trim()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function storageKey(orderId: string): string {
  return `babas:return-request:${orderId}`;
}

export function stableReturnRequestKey(
  orderId: string,
  reason: string,
  storage: ReturnKeyStorage,
  generate: () => string = () => crypto.randomUUID(),
): string {
  const fingerprint = reasonFingerprint(reason);
  const keyName = storageKey(orderId);
  try {
    const existing = JSON.parse(
      storage.getItem(keyName) ?? fallbackKeys.get(keyName) ?? "null",
    ) as { fingerprint?: unknown; key?: unknown } | null;
    if (
      existing?.fingerprint === fingerprint &&
      typeof existing.key === "string" &&
      UUID_PATTERN.test(existing.key)
    ) {
      return existing.key.toLowerCase();
    }
  } catch {
    // Replace malformed or inaccessible state with a fresh request identity.
  }

  const key = generate().toLowerCase();
  if (!UUID_PATTERN.test(key)) {
    throw new Error("Unable to create a valid return request identity.");
  }
  const serialized = JSON.stringify({ fingerprint, key });
  fallbackKeys.set(keyName, serialized);
  try {
    storage.setItem(keyName, serialized);
  } catch {
    // The in-memory value still keeps SPA retries stable when storage is blocked.
  }
  return key;
}

export function clearReturnRequestKey(
  orderId: string,
  storage: ReturnKeyStorage,
): void {
  const keyName = storageKey(orderId);
  fallbackKeys.delete(keyName);
  try {
    storage.removeItem(keyName);
  } catch {
    // Nothing else is required once the in-memory request identity is cleared.
  }
}
