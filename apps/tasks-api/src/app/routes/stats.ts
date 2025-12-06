import { FastifyInstance } from 'fastify';
import { v4 } from 'uuid';

export default async (fastify: FastifyInstance) => {
  fastify.get('/statistics', (request, reply) => {
    reply.send({
      hello: 'world',
    });
  });
};
