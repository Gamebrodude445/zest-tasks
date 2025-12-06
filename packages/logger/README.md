# @zest-tasks/logger

Queue-based structured logging system with asynchronous batch processing for the ZestTasks project.

## Overview

The Logger provides a non-blocking, queue-based approach to writing structured logs with metadata. It batches log entries and processes them asynchronously to avoid blocking the main application flow during I/O operations.

## Features

- **Queue-Based Processing** - Logs are queued and written in batches
- **Non-Blocking** - Async processing prevents I/O from blocking application
- **Structured Metadata** - Each log entry supports arbitrary metadata objects
- **Busy State Management** - Prevents concurrent processing of the same queue
- **JSON Output** - All logs written as structured JSON via `@zest-tasks/log-file-io`

## Installation

This package is part of the ZestTasks monorepo and uses raw TypeScript imports.

```typescript
import { Logger } from '@zest-tasks/logger';
```

## Usage

### Basic Example

```typescript
import { Logger } from '@zest-tasks/logger';

// Create a logger instance pointing to a log file
const logger = new Logger({ filePath: 'logs/app.log' });

// Add logs to the queue (non-blocking)
logger.addLog('Application started', { 
  version: '1.0.0',
  environment: 'production' 
});

logger.addLog('User logged in', { 
  userId: '12345',
  timestamp: new Date().toISOString() 
});

// Process the queue when ready (async)
await logger.process();
```

### Integration Pattern (Tasks API Example)

```typescript
import { Logger } from '@zest-tasks/logger';

const logFile = new Logger({ filePath: 'logs/tasks-api.log' });

// Helper function to add and process logs
const log = async (message: string, metadata: Record<string, unknown>) => {
  logFile.addLog(message, metadata);
  if (!logFile.isBusy()) {
    await logFile.process();
  }
};

// Use in your application
await log('Task completed successfully', {
  taskId: 'abc-123',
  workerId: 'worker-uuid',
  processingTime: 245.3
});
```

## API

### Constructor

```typescript
new Logger(options: LoggerOptions)
```

**Options:**
- `filePath: string` - Path to the log file (relative or absolute)

**Example:**
```typescript
const logger = new Logger({ filePath: 'logs/tasks-api.log' });
```

### Methods

#### `addLog(log: string, metadata: Record<string, unknown>): void`

Adds a log entry to the queue. This operation is synchronous and non-blocking.

**Parameters:**
- `log` - The log message string
- `metadata` - Additional structured data to include with the log

**Example:**
```typescript
logger.addLog('Task failed', {
  taskId: 'xyz-789',
  error: 'Timeout exceeded',
  retryCount: 3
});
```

#### `process(): Promise<void>`

Processes all queued log entries, writing them to the file. This is an async operation that:
1. Sets busy state to `true`
2. Processes each queued entry sequentially
3. Writes to file via `@zest-tasks/log-file-io`
4. Sets busy state to `false` when complete

**Example:**
```typescript
// Queue some logs
logger.addLog('Event 1', { data: 'value1' });
logger.addLog('Event 2', { data: 'value2' });

// Process them all at once
await logger.process();
```

#### `isBusy(): boolean`

Returns whether the logger is currently processing the queue.

**Returns:** `true` if processing, `false` otherwise

**Example:**
```typescript
if (!logger.isBusy()) {
  await logger.process();
}
```

## Output Format

Logs are written to the file as a JSON array, with each entry containing the log message:

```json
[
  {
    "log": "Application started"
  },
  {
    "log": "Task completed successfully"
  },
  {
    "log": "Task failed"
  }
]
```

## Type Safety

Fully typed with TypeScript strict mode:
- `LoggerOptions` for constructor
- `LogEntry` for internal queue structure
- `Record<string, unknown>` for flexible metadata

## License

Part of the ZestTasks project - GNU General Public License v3.0
