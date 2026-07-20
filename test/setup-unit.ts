import { afterEach } from 'vitest';
import { DomainEvents } from '@/core/events/domain-events';

// Subscribers register handlers on a process-global static registry. A spec that
// wires one up would otherwise leak it into every later spec in the same worker,
// so wipe the registry between tests.
afterEach(() => {
  DomainEvents.clearHandlers();
  DomainEvents.clearMarkedAggregates();
});
