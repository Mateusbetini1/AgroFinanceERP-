import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './config/prisma'
import { logger } from './config/logger'

async function bootstrap(): Promise<void> {
  await prisma.$connect()
  logger.info('Banco de dados conectado')

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API iniciada')
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Encerrando servidor...')

    server.close(async () => {
      await prisma.$disconnect()
      logger.info('Servidor encerrado com sucesso')
      process.exit(0)
    })

    setTimeout(() => {
      logger.error('Forçando encerramento após timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection')
  })

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught Exception')
    process.exit(1)
  })
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Falha ao iniciar servidor')
  process.exit(1)
})
