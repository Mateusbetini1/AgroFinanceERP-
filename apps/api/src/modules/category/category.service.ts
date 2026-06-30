import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateCategoryDto, UpdateCategoryDto, ListCategoriesQuery } from './category.schemas'

const CATEGORY_SELECT = {
  id: true,
  name: true,
  type: true,
  color: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const

async function checkNameConflict(
  companyId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.category.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: 'insensitive' },
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })
  if (conflict) {
    throw AppError.conflict(`Já existe uma categoria com o nome "${name}"`)
  }
}

// Bloqueia soft delete se houver produtos, despesas ou boletos ativos vinculados.
async function checkDependencies(companyId: string, id: string): Promise<void> {
  const [productCount, expenseCount, billCount] = await Promise.all([
    prisma.product.count({ where: { companyId, categoryId: id, deletedAt: null } }),
    prisma.expense.count({ where: { companyId, categoryId: id, deletedAt: null } }),
    prisma.bill.count({ where: { companyId, categoryId: id, deletedAt: null } }),
  ])

  const deps: string[] = []
  if (productCount > 0) deps.push(`${productCount} produto(s)`)
  if (expenseCount > 0) deps.push(`${expenseCount} despesa(s)`)
  if (billCount > 0) deps.push(`${billCount} boleto(s)`)

  if (deps.length > 0) {
    throw AppError.conflict(
      `Categoria não pode ser removida pois está vinculada a: ${deps.join(' e ')}`,
    )
  }
}

export const CategoryService = {
  async list(companyId: string, query: ListCategoriesQuery) {
    const { page, limit, search, active, type } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(active !== undefined ? { active } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.category.findMany({
        where,
        select: CATEGORY_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.category.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const category = await prisma.category.findFirst({
      where: { id, companyId, deletedAt: null },
      select: CATEGORY_SELECT,
    })
    if (!category) throw AppError.notFound('Categoria')
    return category
  },

  async create(companyId: string, data: CreateCategoryDto, req: Request) {
    await checkNameConflict(companyId, data.name)

    const category = await prisma.category.create({
      data: { ...data, companyId },
      select: CATEGORY_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Category',
      entityId: category.id,
      after: category,
    })

    return category
  },

  async update(companyId: string, id: string, data: UpdateCategoryDto, req: Request) {
    const existing = await CategoryService.findById(companyId, id)

    if (data.name !== undefined && data.name !== existing.name) {
      await checkNameConflict(companyId, data.name, id)
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
      select: CATEGORY_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Category',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await CategoryService.findById(companyId, id)

    await checkDependencies(companyId, id)

    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Category',
      entityId: id,
      before: existing,
    })
  },
}
