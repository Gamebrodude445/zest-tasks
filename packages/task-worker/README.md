# @zest-tasks/task-worker

Dynamic worker pool and task queue system with automatic scaling, retry logic, and lifecycle management.

## Overview

This library provides a production-ready task queue implementation with a self-managing worker pool. It handles concurrent task execution, automatic worker scaling based on demand, idle worker cleanup, and comprehensive statistics tracking.

## Features

- **Dynamic Worker Pool** - Auto-scales from 0 to configurable max workers based on demand
- **Automatic Retry Logic** - Configurable retry attempts with failure callbacks
- **Idle Worker Cleanup** - Workers automatically deleted after timeout to free resources
- **Lifecycle Management** - Workers track busy state and can be gracefully deleted
- **Statistics Tracking** - Real-time metrics on queue length, success/failure ratios, and processing times
- **Sequential Processing** - Tasks executed in order to maintain queue integrity
- **Performance Metrics** - Tracks attempts, processing time, and worker utilization

## Installation

This package is part of the ZestTasks monorepo and uses raw TypeScript imports.

```typescript
import { TaskQueue, type Task, type TaskResultMetadata } from '@zest-tasks/task-worker';
```

## Usage

### Basic Example

```typescript
import { TaskQueue } from '@zest-tasks/task-worker';

// Create a task queue with configuration
const queue = new TaskQueue({
  maxWorkers: 4,
  noWorkersDelay: 100,
  workerCleanupInterval: 5000,
  workerSettings: {
    timeToComplete: 250,
    failureChance: 20,
    maxRetries: 3,
    idleTimeout: 5000
  },
  onComplete: (task, metadata) => {
    console.log(`Task ${task.id} completed!`, metadata);
  },
  onFail: (task, metadata) => {
    console.error(`Task ${task.id} failed after retries`, metadata);
  }
});

// Add tasks to the queue
queue.addTask({ id: '1', message: 'Process order #1234' });
queue.addTask({ id: '2', message: 'Send notification' });
queue.addTask({ id: '3', message: 'Update database' });

// Process the queue
await queue.process();

// Get statistics
const stats = queue.getStatistics();
console.log(stats);
// {
//   lifetimeTaskCounter: 3,
//   numberOfTaskTries: 5,
//   successToFailureRatio: 2.0,
//   averageProcessingTime: 245.3,
//   currentQueueLength: 0,
//   idleWorkers: 3,
//   hotWorkers: 0
// }
```

### Integration with Fastify (Tasks API Example)

```typescript
import { TaskQueue } from '@zest-tasks/task-worker';
import { Logger } from '@zest-tasks/logger';
import os from 'node:os';

const logFile = new Logger({ filePath: 'logs/tasks-api.log' });

const taskQueue = new TaskQueue({
  maxWorkers: os.cpus()?.length || 4,
  noWorkersDelay: +process.env.NO_WORKERS_DELAY!,
  workerCleanupInterval: +process.env.WORKER_CLEANUP_INTERVAL!,
  workerSettings: {
    timeToComplete: +process.env.TASK_SIMULATED_DURATION!,
    maxRetries: +process.env.TASK_MAX_RETRIES!,
    failureChance: +process.env.TASK_SIMULATED_ERROR_PERCENTAGE!,
    idleTimeout: +process.env.WORKER_TIMEOUT!
  },
  onComplete: async (task, metadata) => {
    await logFile.addLog(`Task ${task.id} completed successfully.`, metadata);
  },
  onFail: async (task, metadata) => {
    await logFile.addLog(`Task ${task.id} failed.`, metadata);
  }
});

// In route handler
fastify.post('/tasks', async (request, reply) => {
  const taskId = v4();
  taskQueue.addTask({ id: taskId, message: request.body.message });
  
  if (!taskQueue.isBusy()) {
    taskQueue.process();
  }
  
  reply.send({ taskId });
});
```

## API

### TaskQueue

#### Constructor

```typescript
new TaskQueue(options: TaskQueueOptions)
```

**Options:**
- `maxWorkers: number` - Maximum number of concurrent workers
- `workerSettings: TaskWorkerOptions` - Configuration passed to each worker
- `onComplete: (task: Task, metadata: Record<string, unknown>) => void` - Callback when task succeeds
- `onFail: (task: Task, metadata: Record<string, unknown>) => void` - Callback when task fails after all retries
- `noWorkersDelay: number` - Milliseconds to wait when no workers are available
- `workerCleanupInterval: number` - Milliseconds between cleanup checks for deleted workers

#### Methods

##### `addTask(task: Task): void`

Adds a task to the queue. Non-blocking operation.

**Parameters:**
- `task: Task` - Object with `id` and `message` properties

```typescript
queue.addTask({ id: 'task-123', message: 'Process payment' });
```

##### `process(): Promise<void>`

Processes all queued tasks using available workers. Automatically creates new workers up to `maxWorkers` limit.

**Behavior:**
- Runs sequentially (awaits each task completion)
- Creates workers on demand
- Waits `noWorkersDelay` ms when all workers are busy
- Cleans up deleted workers during processing

```typescript
await queue.process();
```

##### `isBusy(): boolean`

Returns whether the queue is currently processing tasks.

```typescript
if (!queue.isBusy()) {
  await queue.process();
}
```

##### `getStatistics(): object`

Returns real-time statistics about queue and worker performance.

**Returns:**
```typescript
{
  lifetimeTaskCounter: number;        // Total tasks processed
  numberOfTaskTries: number;          // Total attempts (including retries)
  successToFailureRatio: number;      // Success count / failure count
  averageProcessingTime: number;      // Average task duration (ms)
  currentQueueLength: number;         // Tasks waiting in queue
  idleWorkers: number;                // Workers not processing
  hotWorkers: number;                 // Workers currently processing
}
```

##### `clearDeletedWorkers(): void`

Removes workers marked as deleted from the pool. Called automatically during processing and on cleanup interval.

##### `cleanup(): void`

Stops the worker cleanup interval. Should be called when shutting down to prevent memory leaks (though ECMAScript doesn't have destructors).

### TaskWorker

The `TaskWorker` class is used internally by `TaskQueue` and is not typically instantiated directly.

#### Constructor

```typescript
new TaskWorker(options: TaskWorkerOptions)
```

**Options:**
- `timeToComplete: number` - Simulated task duration in milliseconds
- `failureChance: number` - Failure percentage (0-100)
- `maxRetries: number` - Maximum retry attempts before giving up
- `idleTimeout: number` - Milliseconds of idle time before worker marks itself as deleted

#### Methods

##### `execute(task: Task, onComplete: callback, onFail: callback): Promise<void>`

Executes a task with retry logic and tracks performance metrics.

**Behavior:**
- Retries up to `maxRetries` times on failure
- Tracks attempts and processing time
- Calls `onComplete` with metadata on success
- Calls `onFail` with metadata after exhausting retries
- Starts idle timer after completion

##### `isBusy(): boolean`

Returns whether the worker is currently executing a task.

##### `isDeleted(): boolean`

Returns whether the worker has been marked for deletion (idle timeout expired).

##### `delete(): void`

Marks the worker as deleted and clears idle timer.

## Types

### Task

```typescript
type Task = {
  id: string;
  message: string;
}
```

### TaskResultMetadata

```typescript
type TaskResultMetadata = {
  attempts: number;
  processingTime: number;
}
```

## Architecture Details

### Worker Lifecycle

1. **Creation** - Workers created on-demand when tasks arrive and pool is not at max capacity
2. **Execution** - Worker processes task with retry logic, tracking attempts and timing
3. **Idle Timer** - After completing a task, worker starts idle timer
4. **Deletion** - After `idleTimeout` ms of inactivity, worker marks itself as deleted
5. **Cleanup** - Deleted workers removed from pool during processing or cleanup interval

### Sequential Processing

Tasks are processed **sequentially** (not in parallel) using `await` in the process loop:

```typescript
await availableWorker.execute(task, onComplete, onFail);
```

This design ensures:
- Tasks execute in FIFO order
- Controlled resource consumption
- Predictable task ordering

### Worker Scaling

The queue auto-scales workers based on demand:
- Starts with 0 workers
- Creates new workers when tasks arrive and all workers are busy
- Never exceeds `maxWorkers` limit
- Automatically cleans up idle workers to free resources

### Metadata Flow

Each task execution includes metadata that flows through callbacks:

```typescript
{
  workerId: 'uuid-v4-string',
  timeStamp: '2025-12-06T10:30:00.000Z',
  taskId: 'task-123',
  taskMessage: 'Process payment'
}
```

Plus execution metadata from the worker:
```typescript
{
  attempts: 2,
  processingTime: 487.5
}
```

## Usage in ZestTasks

In the Tasks API, the queue is registered as a Fastify decorator:

```typescript
fastify.decorate('tasks', new TaskQueue({ /* config */ }));

// Routes use it directly
fastify.post('/tasks', async (request, reply) => {
  fastify.tasks.addTask({ id: taskId, message: request.body.message });
  if (!fastify.tasks.isBusy()) {
    fastify.tasks.process();
  }
  reply.send({ taskId });
});

fastify.get('/statistics', (request, reply) => {
  reply.send(fastify.tasks.getStatistics());
});
```

## License

Part of the ZestTasks project - GNU General Public License v3.0

