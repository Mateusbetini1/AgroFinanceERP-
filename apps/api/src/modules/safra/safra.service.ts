import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateSafraDto, UpdateSafraDto, ListSafrasQuery } from './safra.schemas'

const SAFRA_SELECT = {
  id: true,
  productId: true,
  product: { select: { id: true, name: true, active: true } },
  farmLocationId: true,
  farmLocation: { select: { id: true, name: true, type: true, active: true } },
  name: true,
  startDate: true,
  endDate: true,
  estimatedYield: true,
  status: true,
  notes: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const

async function validateProductId(companyId: string, productId: string): Promise<void> {
  const exists = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null, active: true },
    select: { id: true },
  })

  if (!exists) throw AppError.notFound('Produto')
}

async function validateFarmLocationId(companyId: string, farmLocationId: string): Promise<void> {
  const exists = await prisma.farmLocation.findFirst({
    where: { id: farmLocationId, companyId, active: true },
    select: { id: true },
  })

  if (!exists) throw AppError.notFound('Local de cultivo')
}

async function checkDependencies(companyId: string, id: string): Promise<void> {
  const [revenueCount, expenseCount, billCount] = await Promise.all([
    prisma.revenue.count({ where: { companyId, safraId: id, deletedAt: null } }),
    prisma.expense.count({ where: { companyId, safraId: id, deletedAt: null } }),
    prisma.bill.count({ where: { companyId, safraId: id, deletedAt: null } }),
  ])

  const deps: string[] = []
  if (revenueCount > 0) deps.push(revenueCount + ' receita(s)')
  if (expenseCount > 0) deps.push(expenseCount + ' despesa(s)')
  if (billCount > 0) deps.push(billCount + ' boleto(s)')

  if (deps.length > 0) {
    throw AppError.conflict(
      'Safra nao pode ser removida pois esta vinculada a: ' + deps.join(' e '),
    )
  }
}

function validateDateRange(startDate: Date, endDate: Date | null): void {
  if (endDate && endDate <= startDate) {
    throw AppError.badRequest('Data de encerramento deve ser posterior a data de inicio')
  }
}

export const SafraService = {
  async list(companyId: string, query: ListSafrasQuery) {
    const { page, limit, search, status, productId, farmLocationId, active, dateFrom, dateTo } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(productId ? { productId } : {}),
      ...(farmLocationId ? { farmLocationId } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(dateFrom || dateTo
        ? {
            startDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.safra.findMany({
        where,
        select: SAFRA_SELECT,
        orderBy: { startDate: 'desc' },
        skip,
        take,
      }),
      prisma.safra.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const safra = await prisma.safra.findFirst({
      where: { id, companyId, deletedAt: null },
      select: SAFRA_SELECT,
    })

    if (!safra) throw AppError.notFound('Safra')
    return safra
  },

  async create(companyId: string, data: CreateSafraDto, req: Request) {
    validateDateRange(data.startDate, data.endDate ?? null)

    const validations: Promise<void>[] = [validateProductId(companyId, data.productId)]
    if (data.farmLocationId) {
      validations.push(validateFarmLocationId(companyId, data.farmLocationId))
    }
    await Promise.all(validations)

    const safra = await prisma.safra.create({
      data: { ...data, companyId },
      select: SAFRA_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Safra',
      entityId: safra.id,
      after: safra,
    })

    return safra
  },

  async update(companyId: string, id: string, data: UpdateSafraDto, req: Request) {
    const existing = await SafraService.findById(companyId, id)

    const effectiveStart = data.startDate ?? existing.startDate
    const effectiveEnd = data.endDate !== undefined ? data.endDate : existing.endDate
    validateDateRange(effectiveStart, effectiveEnd)

    const validations: Promise<void>[] = []
    if (data.productId !== undefined && data.productId !== existing.productId) {
      validations.push(validateProductId(companyId, data.productId))
    }
    if (data.farmLocationId != null && data.farmLocationId !== existing.farmLocationId) {
      validations.push(validateFarmLocationId(companyId, data.farmLocationId))
    }
    await Promise.all(validations)

    const updated = await prisma.safra.update({
      where: { id },
      data,
      select: SAFRA_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Safra',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await SafraService.findById(companyId, id)

    await checkDependencies(companyId, id)

    await prisma.safra.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Safra',
      entityId: id,
      before: existing,
    })
  },
}
