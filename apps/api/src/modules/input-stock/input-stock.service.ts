import { prisma } from '../../config/prisma'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import type { ListInputStockMovementsQuery, ListInputStockQuery } from './input-stock.schemas'

const INPUT_STOCK_BALANCE_SELECT = {
  id: true,
  supplyId: true,
  supply: {
    select: {
      id: true,
      name: true,
      category: true,
      baseUnit: true,
      active: true,
    },
  },
  quantityBase: true,
  averageCostBase: true,
  totalValue: true,
  createdAt: true,
  updatedAt: true,
} as const

const INPUT_STOCK_MOVEMENT_SELECT = {
  id: true,
  supplyId: true,
  supply: {
    select: {
      id: true,
      name: true,
      category: true,
      baseUnit: true,
    },
  },
  type: true,
  direction: true,
  quantityBase: true,
  unitCostBase: true,
  totalCost: true,
  balanceQuantityAfter: true,
  balanceValueAfter: true,
  purchaseLineId: true,
  occurredAt: true,
  notes: true,
  createdAt: true,
} as const

export const InputStockService = {
  async listBalances(companyId: string, query: ListInputStockQuery) {
    const { page, limit, search, supplyId } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      ...(supplyId ? { supplyId } : {}),
      ...(search
        ? {
            supply: {
              name: { contains: search, mode: 'insensitive' as const },
              deletedAt: null,
            },
          }
        : { supply: { deletedAt: null } }),
    }

    const [data, total] = await Promise.all([
      prisma.inputStockBalance.findMany({
        where,
        select: INPUT_STOCK_BALANCE_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.inputStockBalance.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async listMovements(companyId: string, query: ListInputStockMovementsQuery) {
    const { page, limit, supplyId, type, direction, dateFrom, dateTo } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      ...(supplyId ? { supplyId } : {}),
      ...(type ? { type } : {}),
      ...(direction ? { direction } : {}),
      ...(dateFrom || dateTo
        ? {
            occurredAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.inputStockMovement.findMany({
        where,
        select: INPUT_STOCK_MOVEMENT_SELECT,
        orderBy: { occurredAt: 'desc' },
        skip,
        take,
      }),
      prisma.inputStockMovement.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async listSupplyMovements(companyId: string, supplyId: string, query: ListInputStockMovementsQuery) {
    return InputStockService.listMovements(companyId, { ...query, supplyId })
  },
}
