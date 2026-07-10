import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { SupplyCategory, SupplyUnit } from '@agrofinance/database'
import { InputPurchaseService } from './input-purchase.service'
import { createInputPurchaseSchema } from './input-purchase.schemas'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const purchaseDate = new Date('2026-07-10T00:00:00.000Z')

function mockRequest(): Request {
  return {} as Request
}

function supply(overrides: Record<string, unknown> = {}) {
  return {
    id: 'supply-1',
    name: 'Defensivo X',
    category: SupplyCategory.DEFENSIVE,
    baseUnit: SupplyUnit.KG,
    packageSizeBaseQuantity: null,
    packageSizeUnit: null,
    ...overrides,
  }
}

function purchase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'purchase-1',
    supplierId: null,
    supplier: null,
    purchaseDate,
    documentNumber: 'NF-123',
    totalAmount: 100,
    notes: null,
    createdAt: purchaseDate,
    updatedAt: purchaseDate,
    items: [],
    ...overrides,
  }
}

function mockPurchaseCreateResult() {
  prismaMock.inputPurchase.create.mockResolvedValue({ id: 'purchase-1' })
  prismaMock.inputPurchase.findFirst.mockResolvedValue(purchase())
}

describe('InputPurchaseService', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('cria compra com um item válido', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply()])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        documentNumber: 'NF-123',
        items: [{ supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: 100 }],
      },
      mockRequest(),
    )

    expect(prismaMock.inputPurchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId, totalAmount: 100 }),
      }),
    )
    expect(prismaMock.inputPurchaseLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantityBase: 10, unitCostBase: 10 }),
      }),
    )
  })

  it('cria compra com múltiplos itens', async () => {
    prismaMock.supply.findMany.mockResolvedValue([
      supply(),
      supply({ id: 'supply-2', name: 'Fertilizante Y', category: SupplyCategory.FERTILIZER }),
    ])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create
      .mockResolvedValueOnce({ id: 'line-1' })
      .mockResolvedValueOnce({ id: 'line-2' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [
          { supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: 100 },
          { supplyId: 'supply-2', quantity: 5, unit: SupplyUnit.KG, totalAmount: 80 },
        ],
      },
      mockRequest(),
    )

    expect(prismaMock.inputPurchaseLine.create).toHaveBeenCalledTimes(2)
    expect(prismaMock.inputStockMovement.create).toHaveBeenCalledTimes(2)
  })

  it('compra aumenta estoque na primeira compra e define custo médio', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply()])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: 100 }],
      },
      mockRequest(),
    )

    expect(prismaMock.inputStockBalance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantityBase: 10,
          averageCostBase: 10,
          totalValue: 100,
        }),
      }),
    )
  })

  it('segunda compra recalcula custo médio', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply()])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue({
      id: 'balance-1',
      quantityBase: 10,
      totalValue: 100,
    })

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: 300 }],
      },
      mockRequest(),
    )

    expect(prismaMock.inputStockBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantityBase: 20,
          averageCostBase: 20,
          totalValue: 400,
        }),
      }),
    )
  })

  it('cria movimento PURCHASE de entrada', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply()])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: 100 }],
      },
      mockRequest(),
    )

    expect(prismaMock.inputStockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'PURCHASE',
          direction: 'IN',
          quantityBase: 10,
          unitCostBase: 10,
          totalCost: 100,
          balanceQuantityAfter: 10,
          balanceValueAfter: 100,
        }),
      }),
    )
  })

  it('bloqueia compra sem itens', () => {
    expect(() =>
      createInputPurchaseSchema.parse({
        purchaseDate,
        items: [],
      }),
    ).toThrow('Informe ao menos um item da compra')
  })

  it('bloqueia quantidade zero ou negativa', () => {
    expect(() =>
      createInputPurchaseSchema.parse({
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 0, unit: SupplyUnit.KG, totalAmount: 100 }],
      }),
    ).toThrow('Quantidade deve ser maior que zero')
  })

  it('bloqueia valor zero ou negativo', () => {
    expect(() =>
      createInputPurchaseSchema.parse({
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: -1 }],
      }),
    ).toThrow('Valor total do item deve ser maior que zero')
  })

  it('bloqueia Supply de outra empresa', async () => {
    prismaMock.supply.findMany.mockResolvedValue([])

    await expect(
      InputPurchaseService.create(
        companyId,
        {
          purchaseDate,
          items: [{ supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: 100 }],
        },
        mockRequest(),
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' })
  })

  it('converte KG/G corretamente', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply()])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 500, unit: SupplyUnit.G, totalAmount: 5 }],
      },
      mockRequest(),
    )

    expect(prismaMock.inputPurchaseLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantityBase: 0.5, unitCostBase: 10 }),
      }),
    )
  })

  it('converte L/ML corretamente', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply({ baseUnit: SupplyUnit.L })])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 500, unit: SupplyUnit.ML, totalAmount: 20 }],
      },
      mockRequest(),
    )

    expect(prismaMock.inputPurchaseLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantityBase: 0.5, unitCostBase: 40 }),
      }),
    )
  })

  it('converte BAG com packageSizeBaseQuantity', async () => {
    prismaMock.supply.findMany.mockResolvedValue([
      supply({ packageSizeBaseQuantity: 25, packageSizeUnit: SupplyUnit.KG }),
    ])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 2, unit: SupplyUnit.BAG, totalAmount: 500 }],
      },
      mockRequest(),
    )

    expect(prismaMock.inputPurchaseLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantityBase: 50, unitCostBase: 10 }),
      }),
    )
  })

  it('retorna erro claro quando conversão BAG/BOX não é possível', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply()])

    await expect(
      InputPurchaseService.create(
        companyId,
        {
          purchaseDate,
          items: [{ supplyId: 'supply-1', quantity: 2, unit: SupplyUnit.BAG, totalAmount: 500 }],
        },
        mockRequest(),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Configure o tamanho da embalagem'),
    })
  })

  it('lista compras apenas da empresa', async () => {
    prismaMock.inputPurchase.findMany.mockResolvedValue([purchase()])
    prismaMock.inputPurchase.count.mockResolvedValue(1)

    await InputPurchaseService.list(companyId, { page: 1, limit: 10 })

    expect(prismaMock.inputPurchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId, deletedAt: null }),
      }),
    )
  })

  it('lançar compra não altera saldo financeiro de Account', async () => {
    prismaMock.supply.findMany.mockResolvedValue([supply()])
    mockPurchaseCreateResult()
    prismaMock.inputPurchaseLine.create.mockResolvedValue({ id: 'line-1' })
    prismaMock.inputStockBalance.findUnique.mockResolvedValue(null)

    await InputPurchaseService.create(
      companyId,
      {
        purchaseDate,
        items: [{ supplyId: 'supply-1', quantity: 10, unit: SupplyUnit.KG, totalAmount: 100 }],
      },
      mockRequest(),
    )

    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })
})
