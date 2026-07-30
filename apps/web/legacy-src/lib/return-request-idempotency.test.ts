import { describe, expect, it } from "vitest";
import {
  clearReturnRequestKey,
  stableReturnRequestKey,
  type ReturnKeyStorage,
} from "./return-request-idempotency";

function memoryStorage(): ReturnKeyStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("return request idempotency", () => {
  it("reuses a key for a replay of the same order and reason", () => {
    const storage = memoryStorage();
    const first = stableReturnRequestKey(
      "order-1",
      "Wrong item",
      storage,
      () => "00000000-0000-4000-8000-000000000001",
    );
    const replay = stableReturnRequestKey(
      "order-1",
      "Wrong item",
      storage,
      () => "00000000-0000-4000-8000-000000000002",
    );
    expect(replay).toBe(first);
  });

  it("uses a new key for a different request or after success", () => {
    const storage = memoryStorage();
    const first = stableReturnRequestKey(
      "order-2",
      "Wrong item",
      storage,
      () => "00000000-0000-4000-8000-000000000001",
    );
    const changed = stableReturnRequestKey(
      "order-2",
      "Damaged item",
      storage,
      () => "00000000-0000-4000-8000-000000000002",
    );
    clearReturnRequestKey("order-2", storage);
    const afterSuccess = stableReturnRequestKey(
      "order-2",
      "Damaged item",
      storage,
      () => "00000000-0000-4000-8000-000000000003",
    );
    expect(changed).not.toBe(first);
    expect(afterSuccess).not.toBe(changed);
  });
});
