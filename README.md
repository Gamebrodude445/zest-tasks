# ZestTasks

A task processing system built with Fastify and Nx, demonstrating asynchronous task execution with worker pools, configurable failure simulation, and structured logging.

## Architecture Overview

ZestTasks is an **Nx monorepo** implementing a task queue system with the following components:

### Apps

- **`tasks-api`** - Fastify REST API for task submission and monitoring
  - OpenAPI/Swagger documentation at `/docs`
  - Task submission endpoint (`POST /tasks`)
  - Statistics endpoint (`GET /statistics`)
  - Health check endpoint (`GET /health`)

### Packages

- **`@zest-tasks/task-worker`** - Worker pool implementation
  - `TaskQueue` - Manages worker pool and task distribution
  - `TaskWorker` - Handles individual task execution with retry logic
  - Auto-scaling worker pool based on CPU cores
  - Idle worker cleanup with configurable timeout

- **`@zest-tasks/tasks`** - Core task execution logic
  - Simulated async task processing
  - Configurable failure rates for testing resilience
  - Promise-based execution with callbacks

- **`@zest-tasks/logger`** - Structured logging system
  - Queue-based log processing
  - JSON log output with metadata

- **`@zest-tasks/log-file-io`** - File I/O operations for logs
  - Persistent JSON log storage

## Key Features

- **Dynamic Worker Pools** - Automatically scales workers up to CPU core count
- **Retry Mechanism** - Configurable retry attempts for failed tasks
- **Worker Lifecycle Management** - Idle workers automatically deleted after timeout
- **Statistics Tracking** - Real-time metrics on queue length, success/failure ratios, and processing times
- **Structured Logging** - All task completions and failures logged with metadata
- **Type-Safe APIs** - Full TypeScript support with strict mode enabled

## Quick Start

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Configure the API using environment variables in `apps/tasks-api/.env`:

```env
NO_WORKERS_DELAY=100              # Delay when no workers available (ms)
SERVER_PORT=3000                  # API server port
TASK_SIMULATED_DURATION=250       # Simulated task duration (ms)
TASK_SIMULATED_ERROR_PERCENTAGE=20 # Failure rate (0-100)
TASK_ERROR_RETRY_DELAY=250        # Delay between retries (ms)
WORKER_TIMEOUT=5000               # Idle worker timeout (ms)
WORKER_CLEANUP_INTERVAL=5000      # Worker cleanup check interval (ms)
TASK_MAX_RETRIES=3                # Maximum retry attempts per task
```

### Running the API

```bash
# Development mode
npx nx serve tasks-api

# Production build
npx nx build tasks-api
node apps/tasks-api/dist/main.js
```

The API will be available at `http://localhost:3000` with Swagger docs at `http://localhost:3000/docs`.

## API Endpoints

### POST /tasks
Submit a new task to the queue.

**Request Body:**
```json
{
  "message": "Process this task"
}
```

**Response:**
```json
{
  "taskId": "uuid-v4-string"
}
```

### GET /statistics
Retrieve queue and worker statistics.

**Response:**
```json
{
  "lifetimeTaskCounter": 150,
  "numberOfTaskTries": 175,
  "successToFailureRatio": 9.0,
  "averageProcessingTime": 245.3,
  "currentQueueLength": 5,
  "idleWorkers": 2,
  "hotWorkers": 4
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "message": "Server is running",
  "status": "ok",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

## Development

### Project Structure

```
zest-tasks/
├── apps/
│   └── tasks-api/          # Fastify REST API
│       ├── src/
│       │   ├── app/
│       │   │   ├── plugins/    # Fastify plugins
│       │   │   └── routes/     # API routes (auto-loaded)
│       │   ├── types/          # Type declarations
│       │   └── main.ts
│       └── Dockerfile
├── packages/
│   ├── task-worker/        # Worker pool implementation
│   ├── tasks/              # Core task execution
│   ├── logger/             # Logging system
│   └── log-file-io/        # File I/O utilities
└── logs/                   # Generated log files
```

### Visualizing Dependencies

```bash
# Open interactive dependency graph
npx nx graph

# Focus on specific project
npx nx graph --focus=tasks-api
```

### Adding New Routes

Create a new file in `apps/tasks-api/src/app/routes/`:

```typescript
import { FastifyInstance } from 'fastify';

export default async (fastify: FastifyInstance) => {
  fastify.get('/your-route', {
    schema: {
      description: 'Route description',
      tags: ['your-tag'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async () => {
    return { message: 'Hello!' };
  });
};
```

Routes are auto-loaded via `@fastify/autoload` and appear in Swagger docs automatically.

### Generating New Libraries

```bash
npx nx g @nx/node:library --directory=packages/your-lib --buildable=false --name=your-lib
```

## Architecture Decisions

### Worker Pool Design
- Workers execute tasks **sequentially** (await in processQueue loop) to maintain task order and prevent resource exhaustion
- Worker pool auto-scales based on demand, up to CPU core count
- Idle workers are automatically cleaned up to free resources

### Type System
- Intentional use of **duck typing** for task types (`CreateTaskParameters` vs `Task`)
- Minimal type requirements in `@zest-tasks/tasks` for maximum reusability
- Full type safety maintained at API boundary using swagger

### Minimal Use of Generics
- Avoids complexity and readability issues associated with generics
- Clear and explicit type definitions enhance maintainability
- To avoid generics issues, Isolation using NX Libs allows for easy refactoring

### Environment-Driven Configuration
- All runtime behavior controlled via environment variables
- Fail-fast validation at startup ensures configuration correctness
- Prevents library contamination with environment-specific logic

## Logging

All task completions and failures are logged to `logs/tasks-api.log` with structured metadata:

```json
[
  {
    "log": "Task abc-123 completed successfully.",
    "metadata": {
      "workerId": "worker-uuid",
      "timeStamp": "2025-12-06T10:30:00.000Z",
      "taskId": "abc-123",
      "taskMessage": "Process this task"
    }
  }
]
```

## License

GNU General Public License v3.0 - See [LICENSE](LICENSE) for details.