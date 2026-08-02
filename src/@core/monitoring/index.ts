/**
 * Monitoring module exports
 * Implements task 8.2: Monitoring and error reporting system
 */

export { MonitoringService, createMonitoringService } from './monitoring-service';
export { RuntimeBugTracker, createRuntimeBugTracker } from './runtime-bug-tracker';

export type {
  RuntimeBugEvent,
  HealthMetrics,
  AlertConfig,
  UserFeedback,
} from './monitoring-service';
