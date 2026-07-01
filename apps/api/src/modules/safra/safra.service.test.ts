import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { SafraService } from './safra.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const safraId = 'safra-1'

const safra = {
  id: safraId,
  productId: 'product-1',
  product: { id: 'product-1', name: 'Café', active: true },
  farmLocationId: null,
  farmLocation: null,
  name: 'Safra Café 2026',
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: null,
  estimatedYield: null,
  status: 'ACTIVE',
  notes: null,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function mockRequest(): Request {
  return {} as Request
}

describe('SafraService.delete dependency checks', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('bloqueia com 409 se houver Bill ativo vinculado', async () => {
    prismaMock.safra.findFirst.mockResolvedValue(safra)
    prismaMock.revenue.count.mockResolvedValue(0)
    prismaMock.expense.count.mockResolvedValue(0)
    prismaMock.bill.count.mockResolvedValue(1)

    await expect(SafraService.delete(companyId, safraId, mockRequest())).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('1 boleto(s)'),
    })

    expect(prismaMock.safra.update).not.toHaveBeenCalled()
  })
})
