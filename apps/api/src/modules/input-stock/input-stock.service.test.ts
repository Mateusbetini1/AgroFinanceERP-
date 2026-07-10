import { beforeEach, describe, expect, it } from 'vitest'
import { SupplyCategory, SupplyUnit } from '@agrofinance/database'
import { InputStockService } from './input-stock.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'

const stockBalance = {
  id: 'balance-1',
  supplyId: 'supply-1',
  supply: {
    id: 'supply-1',
    name: 'Defensivo X',
    category: SupplyCategory.DEFENSIVE,
    baseUnit: SupplyUnit.KG,
    active: true,
  },
  quantityBase: 10,
  averageCostBase: 10,
  totalValue: 100,
  createdAt: new Date('2026-07-10T00:00:00.000Z'),
  updatedAt: new Date('2026-07-10T00:00:00.000Z'),
}

describe('InputStockService', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('lista estoque apenas da empresa', async () => {
    prismaMock.inputStockBalance.findMany.mockResolvedValue([stockBalance])
    prismaMock.inputStockBalance.count.mockResolvedValue(1)

    await InputStockService.listBalances(companyId, { page: 1, limit: 10 })

    expect(prismaMock.inputStockBalance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId }),
      }),
    )
    expect(prismaMock.inputStockBalance.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ companyId }),
    })
  })

  it('lista movimentações apenas da empresa', async () => {
    prismaMock.inputStockMovement.findMany.mockResolvedValue([])
    prismaMock.inputStockMovement.count.mockResolvedValue(0)

    await InputStockService.listMovements(companyId, { page: 1, limit: 10 })

    expect(prismaMock.inputStockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId }),
      }),
    )
  })
})
