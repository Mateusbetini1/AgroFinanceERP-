import { beforeEach, describe, expect, it } from 'vitest'
import { ReportService } from './report.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const startDate = new Date('2026-01-01T00:00:00.000Z')

function safra(overrides: Record<string, unknown> = {}) {
  return {
    id: 'safra-1',
    name: 'Safra Pepino',
    status: 'ACTIVE',
    startDate,
    endDate: null,
    estimatedYield: 100,
    product: { id: 'product-1', name: 'Pepino', unit: 'KG' },
    farmLocation: { id: 'location-1', name: 'Estufa A', type: 'GREENHOUSE' },
    ...overrides,
  }
}

describe('ReportService.safras', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('calcula realizado, previsto e metricas por unidade usando apenas receitas e despesas da safra', async () => {
    prismaMock.safra.findMany.mockResolvedValue([safra()])
    prismaMock.revenue.findMany.mockResolvedValue([
      { safraId: 'safra-1', status: 'RECEIVED', totalAmount: 1000 },
      { safraId: 'safra-1', status: 'PENDING', totalAmount: 500 },
      { safraId: null, status: 'RECEIVED', totalAmount: 9999 },
    ])
    prismaMock.expense.findMany.mockResolvedValue([
      { safraId: 'safra-1', status: 'PAID', amount: 300 },
      { safraId: 'safra-1', status: 'PENDING', amount: 200 },
      { safraId: 'safra-1', status: 'OVERDUE', amount: 100 },
      { safraId: null, status: 'PAID', amount: 9999 },
    ])

    const result = await ReportService.safras(companyId, {})

    expect(result.count).toBe(1)
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        safraId: 'safra-1',
        safraName: 'Safra Pepino',
        receivedRevenue: 1000,
        pendingRevenue: 500,
        totalRevenue: 1500,
        paidExpenses: 300,
        pendingExpenses: 300,
        totalExpenses: 600,
        realizedResult: 700,
        projectedResult: 900,
        costPerEstimatedUnit: 6,
        revenuePerEstimatedUnit: 15,
        resultPerEstimatedUnit: 9,
        revenueTotal: 1500,
        expenseTotal: 600,
        result: 900,
      }),
    )
    expect(prismaMock.bill.findMany).not.toHaveBeenCalled()
    expect(prismaMock.employeePayment.findMany).not.toHaveBeenCalled()
  })

  it('retorna metricas por unidade como null quando estimatedYield e null ou zero', async () => {
    prismaMock.safra.findMany.mockResolvedValue([
      safra({ id: 'safra-null', estimatedYield: null }),
      safra({ id: 'safra-zero', estimatedYield: 0 }),
    ])
    prismaMock.revenue.findMany.mockResolvedValue([])
    prismaMock.expense.findMany.mockResolvedValue([])

    const result = await ReportService.safras(companyId, {})

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        estimatedYield: null,
        costPerEstimatedUnit: null,
        revenuePerEstimatedUnit: null,
        resultPerEstimatedUnit: null,
      }),
    )
    expect(result.data[1]).toEqual(
      expect.objectContaining({
        estimatedYield: 0,
        costPerEstimatedUnit: null,
        revenuePerEstimatedUnit: null,
        resultPerEstimatedUnit: null,
      }),
    )
  })

  it('aplica filtros de empresa, deletedAt, safra, produto, local, status, periodo e busca na safra', async () => {
    const dateFrom = new Date('2026-01-01T00:00:00.000Z')
    const dateTo = new Date('2026-12-31T00:00:00.000Z')
    prismaMock.safra.findMany.mockResolvedValue([])

    await ReportService.safras(companyId, {
      safraId: 'safra-1',
      productId: 'product-1',
      farmLocationId: 'location-1',
      status: 'ACTIVE',
      dateFrom,
      dateTo,
      search: 'Pepino',
    })

    expect(prismaMock.safra.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId,
          deletedAt: null,
          id: 'safra-1',
          productId: 'product-1',
          farmLocationId: 'location-1',
          status: 'ACTIVE',
          name: { contains: 'Pepino', mode: 'insensitive' },
          startDate: { gte: dateFrom, lte: dateTo },
        }),
      }),
    )
    expect(prismaMock.revenue.findMany).not.toHaveBeenCalled()
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled()
  })
})

describe('ReportService.safraDetail', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('agrupa despesas por categoria, receitas por produto/cliente e retorna ultimos lancamentos sem duplicar', async () => {
    prismaMock.safra.findMany.mockResolvedValue([safra()])
    prismaMock.revenue.findMany
      .mockResolvedValueOnce([
        { safraId: 'safra-1', status: 'RECEIVED', totalAmount: 1000 },
        { safraId: 'safra-1', status: 'PENDING', totalAmount: 500 },
      ])
      .mockResolvedValueOnce([
        {
          id: 'revenue-1',
          date: new Date('2026-01-12T00:00:00.000Z'),
          receivedAt: new Date('2026-01-13T00:00:00.000Z'),
          totalAmount: 1000,
          status: 'RECEIVED',
          client: 'Cliente A',
          notes: null,
          product: { id: 'product-1', name: 'Pepino' },
        },
        {
          id: 'revenue-2',
          date: new Date('2026-01-10T00:00:00.000Z'),
          receivedAt: null,
          totalAmount: 500,
          status: 'PENDING',
          client: 'Cliente A',
          notes: null,
          product: { id: 'product-1', name: 'Pepino' },
        },
      ])
    prismaMock.expense.findMany
      .mockResolvedValueOnce([
        { safraId: 'safra-1', status: 'PAID', amount: 300 },
        { safraId: 'safra-1', status: 'OVERDUE', amount: 100 },
      ])
      .mockResolvedValueOnce([
        {
          id: 'expense-1',
          date: new Date('2026-01-11T00:00:00.000Z'),
          dueDate: null,
          paidAt: new Date('2026-01-14T00:00:00.000Z'),
          description: 'Insumos',
          amount: 300,
          status: 'PAID',
          category: { id: 'category-1', name: 'Insumos' },
        },
        {
          id: 'expense-2',
          date: new Date('2026-01-09T00:00:00.000Z'),
          dueDate: new Date('2026-01-15T00:00:00.000Z'),
          paidAt: null,
          description: 'Defensivos',
          amount: 100,
          status: 'OVERDUE',
          category: { id: 'category-1', name: 'Insumos' },
        },
      ])

    const result = await ReportService.safraDetail(companyId, 'safra-1')

    expect(result.summary).toEqual(expect.objectContaining({ safraId: 'safra-1', totalRevenue: 1500 }))
    expect(result.expensesByCategory).toEqual([
      {
        categoryId: 'category-1',
        categoryName: 'Insumos',
        paidAmount: 300,
        pendingAmount: 100,
        totalAmount: 400,
      },
    ])
    expect(result.revenuesByProductClient).toEqual([
      {
        productId: 'product-1',
        productName: 'Pepino',
        client: 'Cliente A',
        receivedAmount: 1000,
        pendingAmount: 500,
        totalAmount: 1500,
      },
    ])
    expect(result.recentMovements.map((item) => item.id)).toEqual([
      'expense-2',
      'expense-1',
      'revenue-1',
      'revenue-2',
    ])
  })
})
