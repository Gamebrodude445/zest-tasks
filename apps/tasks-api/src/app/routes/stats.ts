import { FastifyInstance } from 'fastify';

export default async (fastify: FastifyInstance) => {
  fastify.get(
    '/statistics',
    {
      schema: {
        description: 'Get task queue statistics',
        tags: ['statistics'],
        response: {
          200: {
            type: 'object',
            properties: {
              lifetimeTaskCounter: { type: 'number' },
              numberOfTaskTries: { type: 'number' },
              successToFailureRatio: { type: 'number' },
              averageProcessingTime: { type: 'number' },
              currentQueueLength: { type: 'number' },
              idleWorkers: { type: 'number' },
              hotWorkers: { type: 'number' },
            },
          },
        },
      },
    },
    (_request, reply) => {
      reply.send(fastify.tasks.getStatistics());
    }
  );
};
