/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Logger } from '@zest-tasks/log-writer-reader';
import { TaskQueue } from '@zest-tasks/task-worker';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import os from 'node:os';

export default fp(async (fastify: FastifyInstance) => {
  const logger = new Logger({ filePath: 'logs/tasks-api.log' });
  const log = async (message: string) => {
    logger.addLog(message);
    if (!logger.isBusy()) {
      await logger.process();
    }
  };
  fastify.decorate(
    'tasks',
    new TaskQueue({
      maxWorkers: os.cpus()?.length || 4,
      noWorkersDelay: 500,
      workerSettings: {
        timeToComplete: +process.env.TASK_SIMULATED_DURATION!,
        maxRetries: +process.env.TASK_MAX_RETRIES!,
        failureChance: +process.env.TASK_SIMULATED_ERROR_PERCENTAGE!,
        idleTimeout: +process.env.WORKER_TIMEOUT!,
      },
      onComplete: async (task) => {
        await log(`Task ${task.id} completed successfully.`);
      },
      onFail: async (task) => {
        await log(`Task ${task.id} failed.`);
      },
    })
  );
});
