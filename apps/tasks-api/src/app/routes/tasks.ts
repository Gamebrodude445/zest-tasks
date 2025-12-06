import { FastifyInstance } from 'fastify';
import { v4 } from 'uuid';

export default async (fastify: FastifyInstance) => {
  fastify.post<{ Body: { message: string } }>(
    '/tasks',
    {
      schema: {
        description: 'Create a new task',
        tags: ['tasks'],
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'Task message',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'Unique task identifier',
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const taskId = v4();
      fastify.tasks.addTask({ id: taskId, message: request.body.message });
      if (!fastify.tasks.isBusy()) {
        await fastify.tasks.process();
      }
      reply.send({ taskId });
    }
  );
};
