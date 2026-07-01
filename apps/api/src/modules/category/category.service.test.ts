import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { CategoryService } from './category.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const categoryId = 'category-1'

const category = {
  id: categoryId,
  name: 'Insumos',
  type: 'EXPENSE',
  color: null,
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function mockRequest(): Request {
  return {} as Request
}

describe('CategoryService.delete dependency checks', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('bloqueia com 409 se houver Bill ativo vinculado', async () => {
    prismaMock.category.findFirst.mockResolvedValue(category)
    prismaMock.product.count.mockResolvedValue(0)
    prismaMock.expense.count.mockResolvedValue(0)
    prismaMock.bill.count.mockResolvedValue(2)

    await expect(CategoryService.delete(companyId, categoryId, mockRequest())).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('2 boleto(s)'),
    })

    expect(prismaMock.category.update).not.toHaveBeenCalled()
  })
})
