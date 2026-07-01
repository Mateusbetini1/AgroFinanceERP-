import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { SupplierService } from './supplier.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const supplierId = 'supplier-1'

const supplier = {
  id: supplierId,
  name: 'Casa Agrícola',
  document: '12345678000199',
  email: null,
  phone: null,
  contactName: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function mockRequest(): Request {
  return {} as Request
}

describe('SupplierService.delete dependency checks', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('bloqueia com 409 se houver Bill ativo vinculado', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(supplier)
    prismaMock.expense.count.mockResolvedValue(0)
    prismaMock.bill.count.mockResolvedValue(3)

    await expect(SupplierService.delete(companyId, supplierId, mockRequest())).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('3 boleto(s)'),
    })

    expect(prismaMock.supplier.update).not.toHaveBeenCalled()
  })
})
