import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type {
  CreateFarmLocationDto,
  UpdateFarmLocationDto,
  ListFarmLocationsQuery,
} from './farm-location.schemas'

const FARM_LOCATION_SELECT = {
  id: true,
  name: true,
  type: true,
  area: true,
  notes: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const

async function checkNameConflict(
  companyId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.farmLocation.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: 'insensitive' },
      active: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })
  if (conflict) {
    throw AppError.conflict(`Já existe um local de cultivo com o nome "${name}"`)
  }
}

// Bloqueia desativação se houver safras ativas vinculadas.
async function checkDependencies(companyId: string, id: string): Promise<void> {
  const safraCount = await prisma.safra.count({
    where: { companyId, farmLocationId: id, deletedAt: null },
  })
  if (safraCount > 0) {
    throw AppError.conflict(
      `Local de cultivo não pode ser desativado pois está vinculado a ${safraCount} safra(s)`,
    )
  }
}

export const FarmLocationService = {
  async list(companyId: string, query: ListFarmLocationsQuery) {
    const { page, limit, search, type, active } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      // Sem deletedAt: default mostra apenas locais ativos para não poluir listagens
      active: active !== undefined ? active : true,
      ...(type ? { type } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.farmLocation.findMany({
        where,
        select: FARM_LOCATION_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.farmLocation.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const location = await prisma.farmLocation.findFirst({
      where: { id, companyId },
      select: FARM_LOCATION_SELECT,
    })
    if (!location) throw AppError.notFound('Local de cultivo')
    return location
  },

  async create(companyId: string, data: CreateFarmLocationDto, req: Request) {
    await checkNameConflict(companyId, data.name)

    const location = await prisma.farmLocation.create({
      data: { ...data, companyId },
      select: FARM_LOCATION_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'FarmLocation',
      entityId: location.id,
      after: location,
    })

    return location
  },

  async update(companyId: string, id: string, data: UpdateFarmLocationDto, req: Request) {
    const existing = await FarmLocationService.findById(companyId, id)

    if (data.name !== undefined && data.name !== existing.name) {
      await checkNameConflict(companyId, data.name, id)
    }

    const updated = await prisma.farmLocation.update({
      where: { id },
      data,
      select: FARM_LOCATION_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'FarmLocation',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await FarmLocationService.findById(companyId, id)

    await checkDependencies(companyId, id)

    await prisma.farmLocation.update({
      where: { id },
      data: { active: false },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'FarmLocation',
      entityId: id,
      before: existing,
    })
  },
}
