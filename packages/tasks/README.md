# @zest-tasks/tasks

Core task execution library with simulated async processing and configurable failure rates for testing resilience.

## Overview

This library provides a minimal, generic task execution function that simulates asynchronous work with controllable failure scenarios. It's designed to be used by worker pools and testing frameworks to validate retry logic, error handling, and timeout behavior.

## Features

- **Promise-Based Execution** - Async task processing with promises
- **Configurable Failure Rate** - Simulate failures for testing resilience
- **Adjustable Duration** - Control how long tasks take to complete
- **Minimal Type Requirements** - Uses duck typing for maximum reusability
- **Simple API** - Clean promise-based interface

## Installation

This package is part of the ZestTasks monorepo and uses raw TypeScript imports.

```typescript
import { createNewTask } from '@zest-tasks/tasks';
```

## Usage

### Basic Example

```typescript
import { createNewTask } from '@zest-tasks/tasks';

const task = { id: 'task-123' };

try {
  await createNewTask(
    task,
    1000,  // 1 second duration
    20     // 20% failure chance
  );
  console.log('Task succeeded');
} catch (error) {
  console.error('Task failed:', error); // error will be the task id
}
```

### Integration with Worker Pool

```typescript
import { createNewTask } from '@zest-tasks/tasks';

class TaskWorker {
  async execute(task, onComplete, onFail, maxRetries) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        await createNewTask(
          task,
          250,   // 250ms task duration
          20     // 20% failure rate
        );
        onComplete({ attempts: attempts + 1 });
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          onFail({ attempts, taskId: error });
        }
      }
    }
  }
}
```

### Testing Retry Logic

```typescript
import { createNewTask } from '@zest-tasks/tasks';

// Test with 100% failure rate
test('should retry failed tasks', async () => {
  let retries = 0;
  const task = { id: 'test-task' };
  
  const attemptTask = async () => {
    try {
      await createNewTask(task, 10, 100); // Always fails
    } catch {
      retries++;
      if (retries < 3) {
        await attemptTask(); // Retry
      }
    }
  };
  
  await attemptTask();
  expect(retries).toBe(3);
});
```

## API

### `createNewTask(task, timeToComplete, failureChance)`

Simulates asynchronous task execution with configurable duration and failure rate.

**Parameters:**

- `task: CreateTaskParameters` - Task object with at least an `id` property
  - Type: `{ id: string }` (duck-typed - can have additional properties)
- `timeToComplete: number` - Task duration in milliseconds
- `failureChance: number` - Failure probability (0-100)
  - `0` = never fails
  - `50` = 50% chance of failure
  - `100` = always fails

**Returns:** `Promise<void>`
- Resolves when task succeeds
- Rejects with error message: `"Task {id} failed due to simulated error."` when task fails

**Example:**

```typescript
await createNewTask(
  { id: 'order-123', orderId: 456 }, // Can have extra properties
  500,   // Takes 500ms
  10     // 10% chance of failure
);
console.log('Order processed');
```

## Implementation Details

### How It Works

The function uses `setTimeout` to simulate async work:

```typescript
return new Promise<void>((resolve, reject) => {
  setTimeout(() => {
    if (Math.random() * 100 <= failureChance) {
      reject(`Task ${Task.id} failed due to simulated error.`);
    } else {
      resolve();
    }
  }, timeToComplete);
});
```

1. Waits `timeToComplete` milliseconds
2. Generates random number (0-100)
3. If random ≤ `failureChance`, rejects with error message including task ID
4. Otherwise, resolves

### Duck Typing Design

The `CreateTaskParameters` type intentionally requires only `id`:

```typescript
export type CreateTaskParameters = {
  id: string;
};
```

This allows callers to pass objects with additional properties:

```typescript
// All valid - only 'id' is required
createNewTask({ id: '1' }, ...);
createNewTask({ id: '2', message: 'Process order' }, ...);
createNewTask({ id: '3', userId: 123, data: {...} }, ...);
```

This design maximizes reusability across different task types while maintaining type safety.

### Error Messages

When a task fails, the promise rejects with a descriptive error message:

```typescript
`Task ${Task.id} failed due to simulated error.`
```

This provides context about which task failed, making debugging easier.

## Usage in ZestTasks

In the ZestTasks system, this library is consumed by `@zest-tasks/task-worker`:

```typescript
import { createNewTask } from '@zest-tasks/tasks';

// TaskWorker executes tasks with retry logic
await createNewTask(
  task,
  this._timeToComplete,     // From worker config
  this._failureChance       // From worker config
);
// Call completion callback after success
onComplete({ attempts, processingTime });
```

The worker pool wraps this function with:
- Retry logic (catches rejections and retries)
- Performance tracking (measures processing time)
- Metadata collection (tracks attempts, worker ID, timestamps)

## Type Safety

While the library accepts minimal type requirements, it's fully typed:

```typescript
type CreateTaskParameters = {
  id: string;
}

function createNewTask(
  task: CreateTaskParameters,
  timeToComplete: number,
  failureChance: number
): Promise<void>
```

TypeScript's structural typing ensures any object with an `id: string` property will work.

## Testing Scenarios

### Always Succeed (0% Failure)

```typescript
await createNewTask(task, 100, 0);
```

### Always Fail (100% Failure)

```typescript
try {
  await createNewTask(task, 100, 100);
} catch (id) {
  console.log('Failed as expected:', id);
}
```

### Realistic Failure Rate (20%)

```typescript
// Good for testing retry logic
await createNewTask(task, 250, 20);
```

### Instant Execution (0ms Duration)

```typescript
// Useful for fast unit tests
await createNewTask(task, 0, 0);
```

## Production Considerations

This library is designed for **simulation and testing**, not production task execution:

- Uses `Math.random()` for failure simulation (not cryptographically secure)
- No actual work is performed - just a timer
- Error messages are generic simulation strings

For production use:
- Replace with actual business logic
- Add detailed error objects with stack traces
- Implement proper logging and monitoring
- Pass meaningful data to callbacks

## License

Part of the ZestTasks project - GNU General Public License v3.0
