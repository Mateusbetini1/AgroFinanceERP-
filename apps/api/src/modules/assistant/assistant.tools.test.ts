import { beforeEach, describe, expect, it } from 'vitest'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'
import { executeAssistantTool } from './assistant.tools'

describe('assistant tools', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('getSafras consulta safras cadastradas diretamente, incluindo safra sem movimento financeiro', async () => {
    prismaMock.safra.findMany.mockResolvedValue([
      {
        id: 'safra-1',
        name: 'Safra sem lançamentos',
        status: 'PLANNED',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        endDate: null,
        estimatedYield: null,
        active: true,
        product: { id: 'product-1', name: 'Pepino', unit: 'KG' },
        farmLocation: null,
      },
    ])

    const result = await executeAssistantTool('company-1', { tool: 'getSafras' })

    expect(prismaMock.safra.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          deletedAt: null,
        }),
      }),
    )
    expect(result.data).toEqual(
      expect.objectContaining({
        count: 1,
        data: [expect.objectContaining({ name: 'Safra sem lançamentos' })],
      }),
    )
    expect(prismaMock.revenue.findMany).not.toHaveBeenCalled()
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled()
    expect(prismaMock.bill.findMany).not.toHaveBeenCalled()
  })

  it('getPendingExpenses respeita companyId e retorna total de despesas pendentes', async () => {
    prismaMock.expense.count.mockResolvedValue(1)
    prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 620 } })
    prismaMock.expense.findMany.mockResolvedValue([
      {
        id: 'expense-1',
        description: 'Defensivos para manejo preventivo',
        amount: 620,
        date: new Date('2026-07-01T00:00:00.000Z'),
        dueDate: new Date('2026-07-09T00:00:00.000Z'),
        paidAt: null,
        status: 'PENDING',
        category: { name: 'Insumos' },
        supplier: null,
        account: null,
        safra: null,
      },
    ])

    const result = await executeAssistantTool('company-1', { tool: 'getPendingExpenses' })

    expect(prismaMock.expense.count).toHaveBeenCalledWith({
      where: { companyId: 'company-1', deletedAt: null, status: { in: ['PENDING'] } },
    })
    expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', deletedAt: null, status: 'PENDING' },
      }),
    )
    expect(result.data).toEqual(
      expect.objectContaining({
        count: 1,
        total: 620,
        expenses: [expect.objectContaining({ description: 'Defensivos para manejo preventivo', amount: 620 })],
      }),
    )
  })
})
