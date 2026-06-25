import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateProductDto, UpdateProductDto, ListProductsQuery } from './product.schemas'

const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  unit: true,
  active: true,
  categoryId: true,
  category: {
    select: { id: true, name: true, type: true },
  },
  createdAt: true,
  updatedAt: true,
} as const

async function checkNameConflict(
  companyId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.product.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: 'insensitive' },
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })
  if (conflict) {
    throw AppError.conflict(`Já existe um produto com o nome "${name}"`)
  }
}

async function checkDependencies(companyId: string, id: string): Promise<void> {
  const [revenueCount, safraCount] = await Promise.all([
    prisma.revenue.count({ where: { companyId, productId: id, deletedAt: null } }),
    prisma.safra.count({ where: { companyId, productId: id, deletedAt: null } }),
  ])

  const deps: string[] = []
  if (revenueCount > 0) deps.push(`${revenueCount} receita(s)`)
  if (safraCount > 0) deps.push(`${safraCount} safra(s)`)

  if (deps.length > 0) {
    throw AppError.conflict(
      `Produto não pode ser removido pois está vinculado a: ${deps.join(' e ')}`,
    )
  }
}

// Garante que o categoryId informado pertence à mesma empresa e está ativo.
async function validateCategoryId(companyId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!category) throw AppError.notFound('Categoria')
}

export const ProductService = {
  async list(companyId: string, query: ListProductsQuery) {
    const { page, limit, search, active, unit, categoryId } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(active !== undefined ? { active } : {}),
      ...(unit !== undefined ? { unit } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      select: PRODUCT_SELECT,
    })
    if (!product) throw AppError.notFound('Produto')
    return product
  },

  async create(companyId: string, data: CreateProductDto, req: Request) {
    await checkNameConflict(companyId, data.name)

    if (data.categoryId) {
      await validateCategoryId(companyId, data.categoryId)
    }

    const product = await prisma.product.create({
      data: { ...data, companyId },
      select: PRODUCT_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Product',
      entityId: product.id,
      after: product,
    })

    return product
  },

  async update(companyId: string, id: string, data: UpdateProductDto, req: Request) {
    const existing = await ProductService.findById(companyId, id)

    if (data.name !== undefined && data.name !== existing.name) {
      await checkNameConflict(companyId, data.name, id)
    }

    if (data.categoryId) {
      await validateCategoryId(companyId, data.categoryId)
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      select: PRODUCT_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Product',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await ProductService.findById(companyId, id)

    await checkDependencies(companyId, id)

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Product',
      entityId: id,
      before: existing,
    })
  },
}
