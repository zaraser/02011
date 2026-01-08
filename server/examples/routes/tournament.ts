import { FastifyInstance, FastifyPluginsAsync } from 'fastify'

const tournamentRoutes: FastifyPluginsAsync = async(fastify : FastifyInstance) => {
  const tournament = "You wanna fight ?"
  fastify.get('/tournament', async (request : any, reply : any) => {
    return tournament
  });
}

export default tournamentRoutes;