import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

export default fp(async (app : any) => {
  const prisma = new PrismaClient();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async (server : any) => {
    await server.prisma.$disconnect();
  });
});

// Typage Fastify: expose app.prisma
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
