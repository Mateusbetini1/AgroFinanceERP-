import type { Request } from 'express'
import type { Prisma, Supply } from '@agrofinance/database'
import { InputStockMovementDirection, InputStockMovementType } from '@agrofinance/database'
import { AuditAction } from '@agrofinance/shared'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { buildPaginatedResponse, getPaginationArgs } from '../../shared/utils/pagination'
import type { CreateInputApplicationDto, ListInputApplicationsQuery } from './input-application.schemas'

const SUPPLY_FOR_APPLICATION_SELECT = {
  id: true,
  name: true,
  baseUnit: true,
} as const

const INPUT_APPLICATION_SELECT = {
  id: true,
  supplyId: true,
  supply: { select: { id: true, name: true, category: true, baseUnit: true } },
  applicationDate: true,
  quantityBase: true,
  unit: true,
  originalQuantity: true,
  unitCostBaseSnapshot: true,
  totalCost: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  allocations: {
    select: {
      id: true,
      safraId: true,
      safra: { select: { id: true, name: true } },
      farmLocationId: true,
      farmLocation: { select: { id: true, name: true, type: true, active: true } },
      quantityBase: true,
      unitCostBaseSnapshot: true,
      totalCost: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} as const

type SupplyForApplication = Pick<Supply, 'id' | 'name' | 'baseUnit'>

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function convertToBaseQuantity(supply: SupplyForApplication, data: CreateInputApplicationDto): number {
  const quantity = data.quantity
  const unit = data.unit
  const baseUnit = supply.baseUnit

  if (unit === 'BAG' || unit === 'BOX') {
    throw AppError.badRequest('Aplicacao de insumo aceita apenas kg, g, L, ml ou unidade nesta fase.')
  }

  if (unit === baseUnit) return quantity
  if (baseUnit === 'KG' && unit === 'G') return quantity / 1000
  if (baseUnit === 'G' && unit === 'KG') return quantity * 1000
  if (baseUnit === 'L' && unit === 'ML') return quantity / 1000
  if (baseUnit === 'ML' && unit === 'L') return quantity * 1000

  throw AppError.badRequest(`Nao foi possivel converter ${unit} para ${baseUnit} no insumo "${supply.name}".`)
}

async function validateSafraId(companyId: string, safraId: string): Promise<void> {
  const safra = await prisma.safra.findFirst({
    where: { id: safraId, companyId, deletedAt: null, active: true },
    select: { id: true },
  })

  if (!safra) throw AppError.notFound('Safra')
}

async function validateFarmLocationId(companyId: string, farmLocationId: string): Promise<void> {
  const farmLocation = await prisma.farmLocation.findFirst({
    where: { id: farmLocationId, companyId, active: true },
    select: { id: true },
  })

  if (!farmLocation) throw AppError.notFound('Local de cultivo')
}

export const InputApplicationService = {
  async list(companyId: string, query: ListInputApplicationsQuery) {
    const { page, limit, supplyId, safraId, farmLocationId, dateFrom, dateTo } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(supplyId ? { supplyId } : {}),
      ...(dateFrom || dateTo
        ? {
            applicationDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(safraId || farmLocationId
        ? {
            allocations: {
              some: {
                ...(safraId ? { safraId } : {}),
                ...(farmLocationId ? { farmLocationId } : {}),
              },
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.inputApplication.findMany({
        where,
        select: INPUT_APPLICATION_SELECT,
        orderBy: { applicationDate: 'desc' },
        skip,
        take,
      }),
      prisma.inputApplication.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const application = await prisma.inputApplication.findFirst({
      where: { id, companyId, deletedAt: null },
      select: INPUT_APPLICATION_SELECT,
    })

    if (!application) throw AppError.notFound('Aplicacao de insumo')
    return application
  },

  async create(companyId: string, data: CreateInputApplicationDto, req: Request) {
    const supply = await prisma.supply.findFirst({
      where: { id: data.supplyId, companyId, deletedAt: null, active: true },
      select: SUPPLY_FOR_APPLICATION_SELECT,
    })

    if (!supply) throw AppError.notFound('Insumo')

    const validations: Promise<void>[] = [validateSafraId(companyId, data.safraId)]
    if (data.farmLocationId) validations.push(validateFarmLocationId(companyId, data.farmLocationId))
    await Promise.all(validations)

    const quantityBase = roundQuantity(convertToBaseQuantity(supply, data))
    if (!Number.isFinite(quantityBase) || quantityBase <= 0) {
      throw AppError.badRequest('Quantidade convertida deve ser maior que zero')
    }

    const application = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const balance = await tx.inputStockBalance.findUnique({
        where: { companyId_supplyId: { companyId, supplyId: data.supplyId } },
      })

      const currentQuantity = toNumber(balance?.quantityBase)
      const currentValue = toNumber(balance?.totalValue)
      const unitCostBaseSnapshot = toNumber(balance?.averageCostBase)

      if (!balance || currentQuantity + 0.0005 < quantityBase) {
        throw AppError.conflict('Estoque insuficiente para aplicar a quantidade informada.')
      }

      const totalCost = roundMoney(quantityBase * unitCostBaseSnapshot)
      const nextQuantity = roundQuantity(currentQuantity - quantityBase)
      const nextValue = nextQuantity > 0 ? roundMoney(currentValue - totalCost) : 0
      const nextAverageCost = nextQuantity > 0 ? unitCostBaseSnapshot : 0

      const createdApplication = await tx.inputApplication.create({
        data: {
          companyId,
          supplyId: data.supplyId,
          applicationDate: data.applicationDate,
          quantityBase,
          unit: data.unit,
          originalQuantity: data.quantity,
          unitCostBaseSnapshot,
          totalCost,
          notes: data.notes ?? null,
        },
        select: { id: true },
      })

      const allocation = await tx.inputApplicationAllocation.create({
        data: {
          companyId,
          applicationId: createdApplication.id,
          safraId: data.safraId,
          farmLocationId: data.farmLocationId ?? null,
          quantityBase,
          unitCostBaseSnapshot,
          totalCost,
        },
        select: { id: true },
      })

      await tx.inputStockBalance.update({
        where: { id: balance.id },
        data: {
          quantityBase: nextQuantity,
          totalValue: nextValue,
          averageCostBase: nextAverageCost,
        },
      })

      await tx.inputStockMovement.create({
        data: {
          companyId,
          supplyId: data.supplyId,
          type: InputStockMovementType.APPLICATION,
          direction: InputStockMovementDirection.OUT,
          quantityBase,
          unitCostBase: unitCostBaseSnapshot,
          totalCost,
          balanceQuantityAfter: nextQuantity,
          balanceValueAfter: nextValue,
          applicationAllocationId: allocation.id,
          occurredAt: data.applicationDate,
          notes: data.notes ?? null,
        },
      })

      const result = await tx.inputApplication.findFirst({
        where: { id: createdApplication.id, companyId },
        select: INPUT_APPLICATION_SELECT,
      })

      if (!result) throw AppError.notFound('Aplicacao de insumo')
      return result
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'InputApplication',
      entityId: application.id,
      after: application,
    })

    return application
  },
}
