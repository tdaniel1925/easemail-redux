// Event system exports - Layer 4
// Append-only event log for all state changes

export { emitEvent, emitEvents } from './emit';
export type { EmitEventParams } from './emit';

export {
  queryEvents,
  getEntityEvents,
  getActorEvents,
  getOrganizationEvents,
  getEventsByType,
  getActivityFeed,
} from './query';
