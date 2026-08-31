/**
 * Typed in-process event bus for admin domain events.
 *
 * Design rules:
 * - Emitters publish after their transaction commits; handlers must be
 *   idempotent because a retry replays the event.
 * - A failing handler is logged and isolated: it can never fail the request
 *   that emitted the event, and it does not prevent sibling handlers.
 * - `emit` awaits every handler so side effects (outbox inserts, cache
 *   revalidation) complete before the response is returned.
 */

export interface DomainEventMeta {
  readonly type: string;
  readonly occurredAt: string;
  readonly actorId?: string | undefined;
}

export type DomainEventHandler<E> = (event: E) => Promise<void> | void;

export interface EventBus<TEventMap extends object> {
  on<K extends keyof TEventMap & string>(
    type: K,
    handler: DomainEventHandler<TEventMap[K]>,
  ): () => void;
  emit<K extends keyof TEventMap & string>(event: TEventMap[K]): Promise<void>;
}

export function createEventBus<TEventMap extends object>(): EventBus<TEventMap> {
  const handlers = new Map<string, Set<DomainEventHandler<unknown>>>();

  return {
    on(type, handler) {
      const existing = handlers.get(type) ?? new Set();
      existing.add(handler as DomainEventHandler<unknown>);
      handlers.set(type, existing);
      return () => {
        existing.delete(handler as DomainEventHandler<unknown>);
      };
    },
    async emit(event) {
      const subscribers = handlers.get((event as DomainEventMeta).type);
      if (!subscribers?.size) return;
      for (const handler of subscribers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Event handler failed for "${(event as DomainEventMeta).type}".`, { error });
        }
      }
    },
  };
}
