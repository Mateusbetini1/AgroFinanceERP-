import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateSupplyDto, UpdateSupplyDto, ListSuppliesQuery } from './supply.schemas'

const SUPPLY_SELECT = {
  id: true,
  name: true,
  category: true,
  baseUnit: true,
  purchaseUnitDefault: true,
  packageSizeBaseQuantity: true,
  packageSizeUnit: true,
  active: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

async function checkNameConflict(
  companyId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.supply.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: 'insensitive' },
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (conflict) {
    throw AppError.conflict(`Já existe um insumo com o nome "${name}"`)
  }
}

export const SupplyService = {
  async list(companyId: string, query: ListSuppliesQuery) {
    const { page, limit, search, active, category, baseUnit } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(active !== undefined ? { active } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(baseUnit !== undefined ? { baseUnit } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.supply.findMany({
        where,
        select: SUPPLY_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.supply.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const supply = await prisma.supply.findFirst({
      where: { id, companyId, deletedAt: null },
      select: SUPPLY_SELECT,
    })

    if (!supply) throw AppError.notFound('Insumo')
    return supply
  },

  async create(companyId: string, data: CreateSupplyDto, req: Request) {
    await checkNameConflict(companyId, data.name)

    const supply = await prisma.supply.create({
      data: { ...data, companyId },
      select: SUPPLY_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Supply',
      entityId: supply.id,
      after: supply,
    })

    return supply
  },

  async update(companyId: string, id: string, data: UpdateSupplyDto, req: Request) {
    const existing = await SupplyService.findById(companyId, id)

    if (data.name !== undefined && data.name !== existing.name) {
      await checkNameConflict(companyId, data.name, id)
    }

    const updated = await prisma.supply.update({
      where: { id },
      data,
      select: SUPPLY_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Supply',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await SupplyService.findById(companyId, id)

    await prisma.supply.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Supply',
      entityId: id,
      before: existing,
    })
  },
}
