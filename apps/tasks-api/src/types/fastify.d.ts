import { type TaskQueue } from '@zest-tasks/task-worker';
import { type Logger } from '@zest-tasks/logger';

declare module 'fastify' {
  interface FastifyInstance {
    tasks: TaskQueue;
    logFile: Logger;
  }
}
