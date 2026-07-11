import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  InputStockMovementDirection,
  InputStockMovementType,
  SupplyCategory,
  SupplyUnit,
} from '@agrofinance/database'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'
import { createInputApplicationSchema } from './input-application.schemas'
import { InputApplicationService } from './input-application.service'

const companyId = 'company-1'
const applicationDate = new Date('2026-07-10T00:00:00.000Z')

function mockRequest(): Request {
  return { user: { id: 'user-1', email: 'user@example.com' } } as Request
}

function supply(overrides: Record<string, unknown> = {}) {
  return {
    id: 'supply-1',
    name: 'Defensivo X',
    category: SupplyCategory.DEFENSIVE,
    baseUnit: SupplyUnit.KG,
    ...overrides,
  }
}

function balance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'balance-1',
    quantityBase: 10,
    averageCostBase: 10,
    totalValue: 100,
    ...overrides,
  }
}

function application(overrides: Record<string, unknown> = {}) {
  return {
    id: 'application-1',
    supplyId: 'supply-1',
    supply: { id: 'supply-1', name: 'Defensivo X', category: SupplyCategory.DEFENSIVE, baseUnit: SupplyUnit.KG },
    applicationDate,
    quantityBase: 0.5,
    unit: SupplyUnit.G,
    originalQuantity: 500,
    unitCostBaseSnapshot: 10,
    totalCost: 5,
    notes: 'Aplicacao preventiva',
    createdAt: applicationDate,
    updatedAt: applicationDate,
    allocations: [
      {
        id: 'allocation-1',
        safraId: 'safra-1',
        safra: { id: 'safra-1', name: 'Pimentao Vermelho' },
        farmLocationId: null,
        farmLocation: null,
        quantityBase: 0.5,
        unitCostBaseSnapshot: 10,
        totalCost: 5,
        createdAt: applicationDate,
        updatedAt: applicationDate,
      },
    ],
    ...overrides,
  }
}

function mockValidRefs() {
  prismaMock.supply.findFirst.mockResolvedValue(supply())
  prismaMock.safra.findFirst.mockResolvedValue({ id: 'safra-1' })
  prismaMock.farmLocation.findFirst.mockResolvedValue({ id: 'location-1' })
}

function mockCreateResult(overrides: Record<string, unknown> = {}) {
  prismaMock.inputStockBalance.findUnique.mockResolvedValue(balance(overrides.balance as Record<string, unknown>))
  prismaMock.inputApplication.create.mockResolvedValue({ id: 'application-1' })
  prismaMock.inputApplicationAllocation.create.mockResolvedValue({ id: 'allocation-1' })
  prismaMock.inputApplication.findFirst.mockResolvedValue(application(overrides.application as Record<string, unknown>))
}

describe('InputApplicationService', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('cria aplicacao valida', async () => {
    mockValidRefs()
    mockCreateResult()

    const result = await InputApplicationService.create(
      companyId,
      {
        supplyId: 'supply-1',
        applicationDate,
        quantity: 500,
        unit: SupplyUnit.G,
        safraId: 'safra-1',
        notes: 'Aplicacao preventiva',
      },
      mockRequest(),
    )

    expect(result.id).toBe('application-1')
    expect(prismaMock.inputApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          supplyId: 'supply-1',
          quantityBase: 0.5,
          unitCostBaseSnapshot: 10,
          totalCost: 5,
        }),
      }),
    )
  })

  it('aplicacao baixa estoque', async () => {
    mockValidRefs()
    mockCreateResult()

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 500, unit: SupplyUnit.G, safraId: 'safra-1' },
      mockRequest(),
    )

    expect(prismaMock.inputStockBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantityBase: 9.5,
          totalValue: 95,
          averageCostBase: 10,
        }),
      }),
    )
  })

  it('aplicacao cria movimento APPLICATION OUT', async () => {
    mockValidRefs()
    mockCreateResult()

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 500, unit: SupplyUnit.G, safraId: 'safra-1' },
      mockRequest(),
    )

    expect(prismaMock.inputStockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: InputStockMovementType.APPLICATION,
          direction: InputStockMovementDirection.OUT,
          quantityBase: 0.5,
          unitCostBase: 10,
          totalCost: 5,
          balanceQuantityAfter: 9.5,
          balanceValueAfter: 95,
          applicationAllocationId: 'allocation-1',
        }),
      }),
    )
  })

  it('calcula custo com averageCostBase e grava snapshot', async () => {
    mockValidRefs()
    mockCreateResult({ balance: { averageCostBase: 12, totalValue: 120 } })

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 2, unit: SupplyUnit.KG, safraId: 'safra-1' },
      mockRequest(),
    )

    expect(prismaMock.inputApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unitCostBaseSnapshot: 12,
          totalCost: 24,
        }),
      }),
    )
    expect(prismaMock.inputApplicationAllocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unitCostBaseSnapshot: 12,
          totalCost: 24,
        }),
      }),
    )
  })

  it('aplicacao nao altera Account', async () => {
    mockValidRefs()
    mockCreateResult()

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 1, unit: SupplyUnit.KG, safraId: 'safra-1' },
      mockRequest(),
    )

    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
    expect(prismaMock.expense.create).not.toHaveBeenCalled()
    expect(prismaMock.bill.create).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.create).not.toHaveBeenCalled()
  })

  it('bloqueia quantidade maior que estoque', async () => {
    mockValidRefs()
    mockCreateResult({ balance: { quantityBase: 0.4, totalValue: 4 } })

    await expect(
      InputApplicationService.create(
        companyId,
        { supplyId: 'supply-1', applicationDate, quantity: 500, unit: SupplyUnit.G, safraId: 'safra-1' },
        mockRequest(),
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('bloqueia quantidade zero ou negativa', () => {
    expect(() =>
      createInputApplicationSchema.parse({
        supplyId: 'supply-1',
        applicationDate,
        quantity: 0,
        unit: SupplyUnit.KG,
        safraId: 'safra-1',
      }),
    ).toThrow('Quantidade deve ser maior que zero')
  })

  it('bloqueia Supply de outra empresa', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(null)

    await expect(
      InputApplicationService.create(
        companyId,
        { supplyId: 'supply-1', applicationDate, quantity: 1, unit: SupplyUnit.KG, safraId: 'safra-1' },
        mockRequest(),
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' })
  })

  it('bloqueia Safra de outra empresa', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(supply())
    prismaMock.safra.findFirst.mockResolvedValue(null)

    await expect(
      InputApplicationService.create(
        companyId,
        { supplyId: 'supply-1', applicationDate, quantity: 1, unit: SupplyUnit.KG, safraId: 'safra-1' },
        mockRequest(),
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' })
  })

  it('bloqueia FarmLocation de outra empresa', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(supply())
    prismaMock.safra.findFirst.mockResolvedValue({ id: 'safra-1' })
    prismaMock.farmLocation.findFirst.mockResolvedValue(null)

    await expect(
      InputApplicationService.create(
        companyId,
        {
          supplyId: 'supply-1',
          applicationDate,
          quantity: 1,
          unit: SupplyUnit.KG,
          safraId: 'safra-1',
          farmLocationId: 'location-1',
        },
        mockRequest(),
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' })
  })

  it('converte G para KG', async () => {
    mockValidRefs()
    mockCreateResult()

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 500, unit: SupplyUnit.G, safraId: 'safra-1' },
      mockRequest(),
    )

    expect(prismaMock.inputApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantityBase: 0.5 }) }),
    )
  })

  it('converte ML para L', async () => {
    prismaMock.supply.findFirst.mockResolvedValue(supply({ baseUnit: SupplyUnit.L }))
    prismaMock.safra.findFirst.mockResolvedValue({ id: 'safra-1' })
    mockCreateResult({ balance: { quantityBase: 10, averageCostBase: 20, totalValue: 200 } })

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 500, unit: SupplyUnit.ML, safraId: 'safra-1' },
      mockRequest(),
    )

    expect(prismaMock.inputApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantityBase: 0.5, totalCost: 10 }) }),
    )
  })

  it('lista aplicacoes apenas da empresa', async () => {
    prismaMock.inputApplication.findMany.mockResolvedValue([application()])
    prismaMock.inputApplication.count.mockResolvedValue(1)

    await InputApplicationService.list(companyId, { page: 1, limit: 10 })

    expect(prismaMock.inputApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId, deletedAt: null }),
      }),
    )
  })

  it('aplicacao nao altera compras antigas', async () => {
    mockValidRefs()
    mockCreateResult()

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 1, unit: SupplyUnit.KG, safraId: 'safra-1' },
      mockRequest(),
    )

    expect(prismaMock.inputPurchase.update).not.toHaveBeenCalled()
    expect(prismaMock.inputPurchaseLine.update).not.toHaveBeenCalled()
  })

  it('preserva custo mesmo apos compra futura alterar custo medio', async () => {
    mockValidRefs()
    mockCreateResult({ balance: { averageCostBase: 10 } })

    await InputApplicationService.create(
      companyId,
      { supplyId: 'supply-1', applicationDate, quantity: 1, unit: SupplyUnit.KG, safraId: 'safra-1' },
      mockRequest(),
    )

    prismaMock.inputStockBalance.findUnique.mockResolvedValue(balance({ averageCostBase: 30, totalValue: 270 }))

    expect(prismaMock.inputApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitCostBaseSnapshot: 10, totalCost: 10 }),
      }),
    )
  })
})
