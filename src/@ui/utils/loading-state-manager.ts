/**
 * Loading State Manager
 * Manages and coordinates loading states across components with timeout handling
 * Requirements: 1.1, 1.4, 4.4
 */

import {
  getPerformanceMetricsCollector,
  ComponentLoadingStage,
} from '../../@core/performance/performance-metrics-collector';

export interface LoadingState {
  global: boolean;
  operations: Set<string>;
  startTime: number;
  timeoutReached: boolean;
  progress: number; // 0-100
  currentOperation: string;
  estimatedTimeRemaining: number;
  stage: 'initializing' | 'loading' | 'rendering' | 'complete' | 'error' | 'timeout';
}

export interface LoadingProgress {
  operation: string;
  progress: number;
  stage: string;
  message: string;
  estimatedTimeRemaining: number;
}

export interface LoadingTimeoutConfig {
  defaultTimeout: number;
  operationTimeouts: Record<string, number>;
  warningThreshold: number;
}

type LoadingCallback = (state: LoadingState) => void;
type TimeoutCallback = (operation: string, duration: number) => void;
type ProgressCallback = (progress: LoadingProgress) => void;

class LoadingStateManager {
  private state: LoadingState;
  private callbacks: Set<LoadingCallback> = new Set();
  private timeoutCallbacks: Set<TimeoutCallback> = new Set();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private timeouts: Map<string, number> = new Map();
  private operationStartTimes: Map<string, number> = new Map();
  private operationProgress: Map<string, LoadingProgress> = new Map();
  private config: LoadingTimeoutConfig;
  private performanceCollector = getPerformanceMetricsCollector();
  private componentStageMapping: Map<string, ComponentLoadingStage['stage']> = new Map();

  constructor(config?: Partial<LoadingTimeoutConfig>) {
    this.config = {
      defaultTimeout: 5000, // 5 seconds default
      operationTimeouts: {
        'popup-initialization': 3000,
        'options-initialization': 5000,
        'component-mount': 2000,
        'api-request': 10000,
        'file-load': 8000,
        ...config?.operationTimeouts,
      },
      warningThreshold: 0.8, // Warn at 80% of timeout
      ...config,
    };

    this.state = {
      global: false,
      operations: new Set(),
      startTime: 0,
      timeoutReached: false,
      progress: 0,
      currentOperation: '',
      estimatedTimeRemaining: 0,
      stage: 'initializing',
    };
  }

  /**
   * Set global loading state
   */
  setGlobalLoading(loading: boolean, operation?: string): void {
    this.state.global = loading;
    this.state.startTime = loading ? Date.now() : 0;
    this.state.timeoutReached = false;
    this.state.stage = loading ? 'loading' : 'complete';

    if (loading && operation) {
      this.state.currentOperation = operation;
      this.setOperationLoading(operation, true);
    } else if (!loading) {
      this.state.currentOperation = '';
      this.state.progress = 100;
      this.clearAllOperations();
    }

    // Log state change
    console.log(`🔄 Global loading: ${loading ? 'started' : 'stopped'}`, {
      operation,
      duration: loading ? 0 : Date.now() - this.state.startTime,
    });

    this.notifyCallbacks();
  }

  /**
   * Set loading state for a specific operation
   */
  setOperationLoading(operation: string, loading: boolean): void {
    const wasLoading = this.state.operations.has(operation);

    if (loading && !wasLoading) {
      this.state.operations.add(operation);
      this.operationStartTimes.set(operation, Date.now());
      this.setupOperationTimeout(operation);

      // Start performance tracking for component operations
      if (this.isComponentOperation(operation)) {
        this.performanceCollector.startComponentTracking(operation);
        this.componentStageMapping.set(operation, 'html');
      }

      // Initialize progress tracking
      this.operationProgress.set(operation, {
        operation,
        progress: 0,
        stage: 'starting',
        message: `Loading ${operation}...`,
        estimatedTimeRemaining: this.getOperationTimeout(operation),
      });

      console.log(`⏳ Operation started: ${operation}`);
    } else if (!loading && wasLoading) {
      this.state.operations.delete(operation);
      const startTime = this.operationStartTimes.get(operation) || Date.now();
      this.operationStartTimes.delete(operation);
      this.operationProgress.delete(operation);
      this.clearOperationTimeout(operation);

      // Finish performance tracking for component operations
      if (this.isComponentOperation(operation)) {
        this.performanceCollector.finishComponentTracking(operation, true);
        this.componentStageMapping.delete(operation);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Operation completed: ${operation} (${duration}ms)`);
    }

    // Update global state
    const hasOperations = this.state.operations.size > 0;
    if (hasOperations !== this.state.global) {
      this.state.global = hasOperations;
      this.state.startTime = hasOperations ? Date.now() : 0;
      this.state.stage = hasOperations ? 'loading' : 'complete';
    }

    // Update current operation and progress
    this.updateCurrentOperation();
    this.updateGlobalProgress();

    this.notifyCallbacks();
  }

  /**
   * Update progress for a specific operation
   */
  updateOperationProgress(
    operation: string,
    progress: number,
    stage?: string,
    message?: string
  ): void {
    const existingProgress = this.operationProgress.get(operation);
    if (!existingProgress) return;

    const startTime = this.operationStartTimes.get(operation) || Date.now();
    const elapsed = Date.now() - startTime;

    // Calculate estimated time remaining
    let estimatedTimeRemaining = 0;
    if (progress > 0 && progress < 100) {
      const estimatedTotal = (elapsed / progress) * 100;
      estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
    }

    const updatedProgress: LoadingProgress = {
      ...existingProgress,
      progress: Math.max(0, Math.min(100, progress)),
      stage: stage || existingProgress.stage,
      message: message || existingProgress.message,
      estimatedTimeRemaining,
    };

    this.operationProgress.set(operation, updatedProgress);
    this.updateGlobalProgress();

    // Update performance tracking for component operations
    if (this.isComponentOperation(operation) && stage) {
      this.updateComponentStage(operation, stage);
    }

    // Notify progress callbacks
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(updatedProgress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });

    console.debug(`📊 Progress update: ${operation} - ${progress}%`, {
      stage,
      message,
      estimatedTimeRemaining,
    });
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return { ...this.state };
  }

  /**
   * Get progress for a specific operation
   */
  getOperationProgress(operation: string): LoadingProgress | null {
    return this.operationProgress.get(operation) || null;
  }

  /**
   * Get all current operations
   */
  getCurrentOperations(): string[] {
    return Array.from(this.state.operations);
  }

  /**
   * Check if a specific operation is loading
   */
  isOperationLoading(operation: string): boolean {
    return this.state.operations.has(operation);
  }

  /**
   * Register callback for loading state changes
   */
  onLoadingStateChange(callback: LoadingCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Register callback for loading timeouts
   */
  onLoadingTimeout(callback: TimeoutCallback): () => void {
    this.timeoutCallbacks.add(callback);
    return () => this.timeoutCallbacks.delete(callback);
  }

  /**
   * Register callback for progress updates
   */
  onProgressUpdate(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Force timeout for an operation (for testing)
   */
  forceTimeout(operation: string): void {
    this.handleOperationTimeout(operation);
  }

  /**
   * Clear all loading operations
   */
  clearAllOperations(): void {
    const operations = Array.from(this.state.operations);
    operations.forEach((operation) => {
      this.setOperationLoading(operation, false);
    });
  }

  /**
   * Reset loading state manager
   */
  reset(): void {
    this.clearAllOperations();
    this.state = {
      global: false,
      operations: new Set(),
      startTime: 0,
      timeoutReached: false,
      progress: 0,
      currentOperation: '',
      estimatedTimeRemaining: 0,
      stage: 'initializing',
    };
    this.notifyCallbacks();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoadingTimeoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Loading state manager config updated:', newConfig);
  }

  /**
   * Get loading statistics
   */
  getStatistics(): {
    totalOperations: number;
    activeOperations: number;
    averageLoadTime: number;
    timeoutCount: number;
  } {
    // This would be enhanced with persistent storage in a real implementation
    return {
      totalOperations: this.operationStartTimes.size,
      activeOperations: this.state.operations.size,
      averageLoadTime: 0, // Would calculate from historical data
      timeoutCount: 0, // Would track from persistent storage
    };
  }

  private setupOperationTimeout(operation: string): void {
    const timeout = this.getOperationTimeout(operation);
    const warningTime = timeout * this.config.warningThreshold;

    // Set warning timeout
    const warningTimeoutId = window.setTimeout(() => {
      console.warn(`⚠️ Operation taking longer than expected: ${operation} (${warningTime}ms)`);
      this.updateOperationProgress(operation, -1, 'warning', 'Taking longer than expected...');
    }, warningTime);

    // Set actual timeout
    const timeoutId = window.setTimeout(() => {
      this.handleOperationTimeout(operation);
    }, timeout);

    // Store both timeouts (we'll clear both when operation completes)
    this.timeouts.set(operation, timeoutId);
    this.timeouts.set(`${operation}-warning`, warningTimeoutId);
  }

  private clearOperationTimeout(operation: string): void {
    const timeoutId = this.timeouts.get(operation);
    const warningTimeoutId = this.timeouts.get(`${operation}-warning`);

    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(operation);
    }

    if (warningTimeoutId) {
      clearTimeout(warningTimeoutId);
      this.timeouts.delete(`${operation}-warning`);
    }
  }

  private handleOperationTimeout(operation: string): void {
    const startTime = this.operationStartTimes.get(operation);
    const duration = startTime ? Date.now() - startTime : 0;

    console.error(`⏰ Operation timeout: ${operation} (${duration}ms)`);

    // Record timeout error in performance collector
    if (this.isComponentOperation(operation)) {
      this.performanceCollector.recordComponentError(operation, `Timeout after ${duration}ms`);
      this.performanceCollector.finishComponentTracking(operation, false);
      this.componentStageMapping.delete(operation);
    }

    // Update state
    this.state.timeoutReached = true;
    this.state.stage = 'timeout';

    // Update operation progress
    this.updateOperationProgress(operation, -1, 'timeout', 'Operation timed out');

    // Remove from active operations
    this.state.operations.delete(operation);
    this.operationStartTimes.delete(operation);

    // Update global state
    this.updateCurrentOperation();
    this.updateGlobalProgress();

    // Notify timeout callbacks
    this.timeoutCallbacks.forEach((callback) => {
      try {
        callback(operation, duration);
      } catch (error) {
        console.error('Error in timeout callback:', error);
      }
    });

    this.notifyCallbacks();
  }

  private getOperationTimeout(operation: string): number {
    return this.config.operationTimeouts[operation] || this.config.defaultTimeout;
  }

  private updateCurrentOperation(): void {
    const operations = Array.from(this.state.operations);
    this.state.currentOperation = operations.length > 0 ? (operations[0] ?? '') : '';
  }

  private updateGlobalProgress(): void {
    if (this.state.operations.size === 0) {
      this.state.progress = 100;
      this.state.estimatedTimeRemaining = 0;
      return;
    }

    // Calculate average progress across all operations
    let totalProgress = 0;
    let totalEstimatedTime = 0;
    let validOperations = 0;

    this.operationProgress.forEach((progress) => {
      if (progress.progress >= 0) {
        // Ignore timeout/error states (-1)
        totalProgress += progress.progress;
        totalEstimatedTime += progress.estimatedTimeRemaining;
        validOperations++;
      }
    });

    if (validOperations > 0) {
      this.state.progress = totalProgress / validOperations;
      this.state.estimatedTimeRemaining = totalEstimatedTime / validOperations;
    } else {
      this.state.progress = 0;
      this.state.estimatedTimeRemaining = this.config.defaultTimeout;
    }
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Error in loading state callback:', error);
      }
    });
  }

  private isComponentOperation(operation: string): boolean {
    // Component operations are those that involve UI component loading
    const componentOperations = [
      'popup-initialization',
      'options-initialization',
      'component-mount',
      'react-initialization',
      'ui-rendering',
    ];

    return (
      componentOperations.some((compOp) => operation.includes(compOp)) ||
      operation.includes('component') ||
      operation.includes('popup') ||
      operation.includes('options')
    );
  }

  private updateComponentStage(operation: string, stage: string): void {
    // Map loading progress stages to performance collector stages
    const stageMapping: Record<string, ComponentLoadingStage['stage']> = {
      starting: 'html',
      loading: 'javascript',
      initializing: 'react',
      rendering: 'components',
      complete: 'ready',
      mounting: 'components',
      ready: 'ready',
    };

    const performanceStage = stageMapping[stage];
    if (performanceStage) {
      const currentStage = this.componentStageMapping.get(operation);

      // Only advance to new stages, don't go backwards
      const stageOrder: ComponentLoadingStage['stage'][] = [
        'html',
        'javascript',
        'react',
        'components',
        'ready',
      ];
      const currentIndex = currentStage ? stageOrder.indexOf(currentStage) : -1;
      const newIndex = stageOrder.indexOf(performanceStage);

      if (newIndex > currentIndex) {
        this.performanceCollector.startLoadingStage(operation, performanceStage);
        this.componentStageMapping.set(operation, performanceStage);
      }
    }
  }

  /**
   * Record an error for a specific operation
   */
  recordOperationError(operation: string, error: string): void {
    // Update operation progress to show error
    this.updateOperationProgress(operation, -1, 'error', `Error: ${error}`);

    // Record error in performance collector if it's a component operation
    if (this.isComponentOperation(operation)) {
      this.performanceCollector.recordComponentError(operation, error);
    }

    console.error(`❌ Operation error: ${operation} - ${error}`);
  }

  /**
   * Record a retry for a specific operation
   */
  recordOperationRetry(operation: string): void {
    // Record retry in performance collector if it's a component operation
    if (this.isComponentOperation(operation)) {
      this.performanceCollector.recordComponentRetry(operation);
    }

    console.log(`🔄 Operation retry: ${operation}`);
  }

  /**
   * Get performance metrics for all tracked components
   */
  getPerformanceMetrics(): unknown {
    return this.performanceCollector.exportMetrics();
  }
}

// Singleton instance
let loadingStateManager: LoadingStateManager | null = null;

export function getLoadingStateManager(): LoadingStateManager {
  if (!loadingStateManager) {
    loadingStateManager = new LoadingStateManager();
  }
  return loadingStateManager;
}

export function createLoadingStateManager(
  config?: Partial<LoadingTimeoutConfig>
): LoadingStateManager {
  return new LoadingStateManager(config);
}

// Export the class for direct instantiation if needed
export { LoadingStateManager };
