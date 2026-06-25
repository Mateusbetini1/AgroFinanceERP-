import { vi } from 'vitest'

// Silencia o Prisma durante testes: nenhuma query real deve escapar.
vi.mock('@agrofinance/database', async (importOriginal) => {
  const original = await importOriginal<typeof import('@agrofinance/database')>()
  const { prismaMock } = await import('./prisma-mock')

  return {
    ...original,
    prisma: prismaMock,
  }
})
