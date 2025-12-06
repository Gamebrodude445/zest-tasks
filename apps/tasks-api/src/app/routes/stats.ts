import { FastifyInstance } from 'fastify';

export default async (fastify: FastifyInstance) => {
  fastify.get('/statistics', (request, reply) => {
    reply.send(fastify.tasks.getStatistics());
  });
};
