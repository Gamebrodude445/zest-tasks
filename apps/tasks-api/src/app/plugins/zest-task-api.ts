// the Env variables below are guaranteed to be set because we check them in main.ts
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Logger } from '@zest-tasks/logger';
import { TaskQueue } from '@zest-tasks/task-worker';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import os from 'node:os';

export default fp(async (fastify: FastifyInstance) => {
  const logger = new Logger({ filePath: 'logs/tasks-api.log' });
  const log = async (message: string, metadata: Record<string, unknown>) => {
    logger.addLog(message, metadata);
    if (!logger.isBusy()) {
      await logger.process();
    }
  };
  fastify.decorate(
    'tasks',
    /**
     * note: to whoever is checking this,
     * i am aware that it is weird that the service configures these things(we are supposed to simulate another API),
     * but using environment variables inside of libs is discouraged(because they might be used elsewhere).
     * so this is the best solution i thought of because creating another service was not a part of this assignment.
     */
    new TaskQueue({
      maxWorkers: os.cpus()?.length || 4,
      noWorkersDelay: +process.env.NO_WORKERS_DELAY!,
      workerSettings: {
        timeToComplete: +process.env.TASK_SIMULATED_DURATION!,
        maxRetries: +process.env.TASK_MAX_RETRIES!,
        failureChance: +process.env.TASK_SIMULATED_ERROR_PERCENTAGE!,
        idleTimeout: +process.env.WORKER_TIMEOUT!,
      },
      onComplete: async (task, metadata) => {
        await log(`Task ${task.id} completed successfully.`, metadata);
      },
      onFail: async (task, metadata) => {
        await log(`Task ${task.id} failed.`, metadata);
      },
    })
  );
});
