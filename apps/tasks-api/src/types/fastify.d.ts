import { type TaskQueue } from '@zest-tasks/task-worker';

declare module 'fastify' {
  interface FastifyInstance {
    tasks: TaskQueue;
  }
}
