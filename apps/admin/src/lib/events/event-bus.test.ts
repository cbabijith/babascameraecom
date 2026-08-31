import { describe, expect, mock, test } from "bun:test";

import { createEventBus, type DomainEventMeta } from "./event-bus";

interface TestEvents {
  "thing.changed": DomainEventMeta & { readonly thingId: string };
  "thing.removed": DomainEventMeta & { readonly thingId: string };
}

describe("createEventBus", () => {
  test("delivers events only to handlers subscribed to that type", async () => {
    const bus = createEventBus<TestEvents>();
    const changed = mock(() => undefined);
    const removed = mock(() => undefined);
    bus.on("thing.changed", changed);
    bus.on("thing.removed", removed);

    await bus.emit({ type: "thing.changed", occurredAt: "now", thingId: "t1" });

    expect(changed).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
  });

  test("isolates handler failures from emitters and sibling handlers", async () => {
    const bus = createEventBus<TestEvents>();
    const sibling = mock(() => undefined);
    bus.on("thing.changed", () => {
      throw new Error("handler exploded");
    });
    bus.on("thing.changed", sibling);

    await bus.emit({ type: "thing.changed", occurredAt: "now", thingId: "t2" });

    expect(sibling).toHaveBeenCalledTimes(1);
  });

  test("supports unsubscribing", async () => {
    const bus = createEventBus<TestEvents>();
    const handler = mock(() => undefined);
    const unsubscribe = bus.on("thing.changed", handler);
    unsubscribe();

    await bus.emit({ type: "thing.changed", occurredAt: "now", thingId: "t3" });

    expect(handler).not.toHaveBeenCalled();
  });

  test("awaits async handlers", async () => {
    const bus = createEventBus<TestEvents>();
    let settled = false;
    bus.on("thing.changed", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      settled = true;
    });

    await bus.emit({ type: "thing.changed", occurredAt: "now", thingId: "t4" });

    expect(settled).toBeTrue();
  });
});
