# ZestTasks - GitHub Copilot Instructions

## Project Overview

ZestTasks is an **Nx monorepo** implementing a task processing system with a Fastify API and worker queue architecture. The project demonstrates asynchronous task execution with configurable failure rates and retry logic.

**Note**: This is a coding exercise/demonstration project, not production-ready software. It intentionally omits tests, metrics, authentication, database persistence, and other production concerns to focus on architecture and code clarity.

### Architecture

- **`apps/tasks-api`**: Fastify REST API with Swagger/OpenAPI docs at `/docs`
- **`packages/task-worker`**: Worker pool implementation (`TaskQueue` + `TaskWorker`) for concurrent task processing
- **`packages/tasks`**: Core task execution logic with simulated failures (no callbacks - pure promises)
- **`packages/logger`**: Queue-based structured logging system
- **`packages/log-file-io`**: File I/O operations for persistent JSON logs

**Data flow**: API → TaskQueue → TaskWorker pool → `createNewTask` (from `@zest-tasks/tasks`) → promise resolution

## Critical Conventions

### Nx Workspace Patterns

- **No TypeScript builds for packages**: `packages/tasks`, `packages/task-worker`, `packages/logger`, and `packages/log-file-io` use raw `.ts` imports (see `nx.json` plugins config with `exclude` for build targets)
- **Path aliases**: Use `@zest-tasks/*` imports (e.g., `@zest-tasks/tasks`, `@zest-tasks/task-worker`)
- **Package exports**: Packages expose only their `src/index.ts` - check `package.json` exports before importing internal modules
- **Project references**: Run `npx nx sync` after adding dependencies between packages

### Code Organization

- **Fastify plugins**: Auto-loaded from `apps/tasks-api/src/app/plugins/` and `apps/tasks-api/src/app/routes/`
- **Route files**: Export default async function accepting `FastifyInstance`
- **Type declarations**: Store route types in `.types.ts` files (e.g., `tasks.types.ts` alongside `tasks.ts`)
- **Fastify decorators**: Custom properties (like `tasks`, `logFile`) registered in plugins

### Task Processing System

- **TaskQueue** manages worker pool, NOT individual task execution
- **TaskWorker** handles retry logic (`maxRetries` option) and busy state tracking
- **Workers execute sequentially** via `await` in `processQueue()` - designed for controlled concurrency, not parallelism
- **Idle worker cleanup**: Workers auto-delete after `idleTimeout`, cleaned up on interval
- **No callbacks in `createNewTask`**: Pure promise-based (resolves on success, rejects with error message)
- **Error messages**: Rejections include descriptive strings like `"Task {id} failed due to simulated error."`

### Type System

- **No generics**: Generics are intentionally avoided throughout the codebase to improve readability and make the code easier to understand
- **Duck typing in `@zest-tasks/tasks`**: `CreateTaskParameters` requires only `{ id: string }` for maximum reusability
- **Dual Task types**: `Task` type exists in both `task-worker` (full: `{id, message}`) and `tasks` (minimal: `{id}`), leveraging TypeScript structural typing
- **Strict mode**: All code uses TypeScript strict mode - no implicit `any`, no unused locals

### Nx Library Isolation

- **Controlled exports**: Each package exposes only what's needed via `src/index.ts` - internal implementation details remain private
- **API boundaries**: Nx enforces library boundaries, creating a clear "API" between packages that prevents tight coupling
- **Import restrictions**: Can only import from package entry points (`@zest-tasks/tasks`), not internal paths (`@zest-tasks/tasks/lib/create-task`)
- **Dependency graph**: Use `npx nx graph` to visualize these boundaries and ensure clean architecture
- **Encapsulation**: This isolation mimics microservice boundaries within a monorepo, making it easier to extract packages if needed

### Logging & Metadata

- **Logger uses queues**: `addLog()` queues entries, `process()` writes them asynchronously
- **Metadata limitation**: Logger accepts metadata but only writes `log` string to file (known issue documented in README)
- **Log files**: JSON arrays stored in `logs/` directory, created automatically
- **Task metadata**: Includes `workerId`, `timeStamp`, `taskId`, `taskMessage` in callbacks

## Essential Commands

```bash
# Development
npx nx serve tasks-api                    # Run API in dev mode
npx nx build tasks-api                    # Build for production
node apps/tasks-api/dist/main.js          # Run production build

# Docker
npx nx docker:build tasks-api             # Build container
npx nx docker:run tasks-api -p 3000:3000  # Run container

# Testing & Quality
npx nx typecheck <project-name>           # Type check (no builds for packages)
npx nx lint <project-name>                # Lint
npx nx run-many --target=typecheck        # Check all projects

# Workspace
npx nx graph                              # Visualize dependencies
npx nx sync                               # Sync TypeScript project references
npx nx g @nx/node:library --directory=packages/<name> --buildable=false  # Generate library
```

## Development Workflow

### Adding New Routes

Create file in `apps/tasks-api/src/app/routes/`:

```typescript
import { FastifyInstance } from 'fastify';

export default async (fastify: FastifyInstance) => {
  fastify.get(
    '/endpoint',
    {
      schema: {
        description: 'Endpoint description',
        tags: ['tag-name'],
        response: {
          200: {
            type: 'object',
            properties: {
              result: { type: 'string' },
            },
          },
        },
      },
    },
    async () => {
      return { result: 'value' };
    }
  );
};
```

Routes auto-register via `@fastify/autoload` and appear in Swagger docs.

### Creating Type Declarations

Store route types separately:

```typescript
// routes/tasks.types.ts
export type CreateTaskBody = {
  message: string;
};

// routes/tasks.ts
import { CreateTaskBody } from './tasks.types';

fastify.post<{ Body: CreateTaskBody }>('/tasks', ...);
```

### Working with Task Queue

```typescript
// Add tasks
fastify.tasks.addTask({ id: taskId, message: 'Process this' });

// Process queue if not busy
if (!fastify.tasks.isBusy()) {
  fastify.tasks.process();
}

// Get statistics
const stats = fastify.tasks.getStatistics();
```

### Environment Variables

All runtime config via `.env` in `apps/tasks-api/`:

- `SERVER_PORT`, `HOST`
- `TASK_SIMULATED_DURATION`, `TASK_SIMULATED_ERROR_PERCENTAGE`, `TASK_MAX_RETRIES`
- `WORKER_TIMEOUT`, `WORKER_CLEANUP_INTERVAL`, `NO_WORKERS_DELAY`

Validated at startup in `main.ts` - fails fast if missing or wrong type.

## Code Style & Patterns

### Imports

```typescript
// Package imports - use path aliases
import { TaskQueue } from '@zest-tasks/task-worker';
import { createNewTask } from '@zest-tasks/tasks';
import { Logger } from '@zest-tasks/logger';

// No relative imports across packages
// ❌ import { ... } from '../../../packages/tasks/...'
// ✅ import { ... } from '@zest-tasks/tasks'
```

### Async/Await

```typescript
// Task execution - pure promise (no callback parameter)
try {
  await createNewTask(task, timeToComplete, failureChance);
  onComplete(metadata); // Call after promise resolves
} catch (error) {
  onFail(metadata);
}
```

### Error Handling

```typescript
// createNewTask rejects with descriptive error
catch (error) {
  // error is a string: "Task {id} failed due to simulated error."
  console.error(error);
}
```

### Private Members

Use `_` prefix for private class members:

```typescript
private _workers: TaskWorker[] = [];
private _isBusy = false;
```

## Watch Out For

- **Module resolution**: Using `"module": "nodenext"` - extensions matter in ESM contexts
- **esbuild bundling**: API uses `"bundle": false"` - dependencies installed at runtime (see Dockerfile `npm install`)
- **Worker busy state**: `_isBusy` flag prevents race conditions - don't bypass with direct task assignment
- **Async queue processing**: `processQueue()` must `await` worker execution to maintain queue order
- **Logger metadata**: Currently not persisted to file (only `log` string written)
- **Statistics calculation**: Average processing time has potential bug in calculation
- **Cleanup intervals**: Call `cleanup()` on TaskQueue when shutting down to prevent timer leaks

## Common Tasks

### Add a new package

```bash
npx nx g @nx/node:library --directory=packages/my-lib --buildable=false --name=my-lib
```

Then update `nx.json` to exclude from build if using raw TS imports.

### Add package dependency

Update `package.json` imports, then:

```bash
npx nx sync  # Update TypeScript project references
```

### Access Fastify decorators

```typescript
// Define types first
declare module 'fastify' {
  interface FastifyInstance {
    myService: MyService;
  }
}

// Register in plugin
fastify.decorate('myService', new MyService());
```

### Debug with VS Code

Use the included launch configuration:

- Press F5 or use Debug panel
- Runs `npx nx serve tasks-api` with inspector on port 9229
- Breakpoints work in TypeScript source files

## API Endpoints

- `POST /tasks` - Submit task with `{ message: string }` body, returns `{ taskId: string }`
- `GET /statistics` - Retrieve queue statistics
- `GET /health` - Health check endpoint
- `GET /docs` - Swagger/OpenAPI documentation

## Testing Patterns

### Simulated Task Execution

```typescript
// Always succeed (0% failure)
await createNewTask(task, 100, 0);

// Always fail (100% failure)
try {
  await createNewTask(task, 100, 100);
} catch (error) {
  // Handle expected failure
}

// Realistic failure rate for retry testing
await createNewTask(task, 250, 20); // 20% failure
```

## Architecture Decisions

### Why Sequential Processing?

Workers execute tasks sequentially (await in loop) to:

- Maintain FIFO task ordering
- Control resource consumption
- Provide predictable execution patterns

For true parallelism, would need to remove `await` and use `Promise.all()`.

### Why No Builds for Packages?

Raw TypeScript imports improve developer experience:

- Faster iteration (no build step)
- Simpler debugging (source files directly)
- Still get full type checking via `nx typecheck`

### Why Duck Typing for Tasks?

Minimal `{ id: string }` requirement allows:

- Maximum reusability across different task types
- Callers can pass objects with additional properties
- Type safety maintained via structural typing

## License

GNU General Public License v3.0
