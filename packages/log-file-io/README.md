# @zest-tasks/log-file-io

File I/O utilities for persistent JSON log storage in the ZestTasks system.

## Overview

This library provides append-only JSON file operations optimized for logging. It handles automatic directory creation, safe file reading with fallback to empty arrays, and atomic JSON array appending.

## Features

- **Automatic Directory Creation** - Creates parent directories recursively if they don't exist
- **Append-Only Writes** - Safely appends new entries to existing JSON arrays
- **Safe Reading** - Returns empty array if file doesn't exist or is invalid JSON
- **Pretty Formatting** - Writes JSON with 2-space indentation for readability

## Installation

This package is part of the ZestTasks monorepo and uses raw TypeScript imports.

```typescript
import { writeToFile } from '@zest-tasks/log-file-io';
```

## API

### `writeToFile(filePath: string, data: string): Promise<void>`

Appends a JSON object to a file, creating the file and directories if needed.

**Parameters:**
- `filePath` - Absolute or relative path to the log file
- `data` - JSON string containing the object to append (will be parsed and added to array)

**Behavior:**
1. Reads existing file content (or starts with empty array)
2. Parses `data` and appends to array
3. Creates parent directories if they don't exist
4. Writes the updated JSON array back to file

**Example:**

```typescript
import { writeToFile } from '@zest-tasks/log-file-io';

// First call creates: logs/app.log with [{"message": "Started"}]
await writeToFile('logs/app.log', JSON.stringify({ message: 'Started' }));

// Second call appends: [{"message": "Started"}, {"message": "Processing"}]
await writeToFile('logs/app.log', JSON.stringify({ message: 'Processing' }));
```

**File Output:**
```json
[
  {
    "message": "Started"
  },
  {
    "message": "Processing"
  }
]
```

### `readFromFile(filePath: string): Promise<Record<string, unknown>[]>`

Reads a JSON array from a file, returning an empty array if the file doesn't exist or contains invalid JSON.

**Parameters:**
- `filePath` - Path to the JSON file

**Returns:** Promise resolving to array of objects

**Example:**

```typescript
import { readFromFile } from '@zest-tasks/log-file-io';

const logs = await readFromFile('logs/app.log');
console.log(logs.length); // Number of log entries
```

**Note:** This function is used internally by `writeToFile` and is not exported from the package index.

## Usage in ZestTasks

This library is primarily used by `@zest-tasks/logger` to persist task execution logs:

```typescript
import { writeToFile } from '@zest-tasks/log-file-io';

// Logger calls writeToFile with structured log entries
await writeToFile('logs/tasks-api.log', JSON.stringify({
  log: 'Task completed successfully',
  metadata: {
    taskId: 'abc-123',
    timestamp: new Date().toISOString()
  }
}));
```

## Implementation Notes

### Directory Creation
The library extracts the directory path using `substring(0, lastIndexOf('/'))` and creates it with `recursive: true`, ensuring all parent directories exist before writing.

### Error Handling
`readFromFile` silently handles missing files or invalid JSON by returning an empty array, making it safe to use without existence checks.

### Atomic Writes
While the library doesn't use atomic file operations, it's designed for append-only log scenarios where occasional data loss is acceptable. For production use in high-concurrency environments, consider adding file locking or using a database.

## Type Safety

All functions are fully typed with TypeScript strict mode:
- `writeToFile` expects JSON-parseable strings
- `readFromFile` returns typed arrays of `Record<string, unknown>[]`
- No runtime validation of JSON structure (assumes valid input)

## License

Part of the ZestTasks project - GNU General Public License v3.0
