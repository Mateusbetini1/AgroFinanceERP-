import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateSupplierDto, UpdateSupplierDto, ListSuppliersQuery } from './supplier.schemas'

const SUPPLIER_SELECT = {
  id: true,
  name: true,
  document: true,
  email: true,
  phone: true,
  contactName: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

async function checkDocumentConflict(
  companyId: string,
  document: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.supplier.findFirst({
    where: {
      companyId,
      document,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (conflict) {
    throw AppError.conflict('Ja existe um fornecedor com este documento (CPF/CNPJ)')
  }
}

async function checkDependencies(companyId: string, id: string): Promise<void> {
  const [expenseCount, billCount] = await Promise.all([
    prisma.expense.count({ where: { companyId, supplierId: id, deletedAt: null } }),
    prisma.bill.count({ where: { companyId, supplierId: id, deletedAt: null } }),
  ])

  const deps: string[] = []
  if (expenseCount > 0) deps.push(expenseCount + ' despesa(s)')
  if (billCount > 0) deps.push(billCount + ' boleto(s)')

  if (deps.length > 0) {
    throw AppError.conflict(
      'Fornecedor nao pode ser removido pois esta vinculado a: ' + deps.join(' e '),
    )
  }
}

export const SupplierService = {
  async list(companyId: string, query: ListSuppliersQuery) {
    const { page, limit, search } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { document: { contains: search } },
              { contactName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        select: SUPPLIER_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      prisma.supplier.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, companyId, deletedAt: null },
      select: SUPPLIER_SELECT,
    })

    if (!supplier) throw AppError.notFound('Fornecedor')
    return supplier
  },

  async create(companyId: string, data: CreateSupplierDto, req: Request) {
    await checkDocumentConflict(companyId, data.document)

    const supplier = await prisma.supplier.create({
      data: { ...data, companyId },
      select: SUPPLIER_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Supplier',
      entityId: supplier.id,
      after: supplier,
    })

    return supplier
  },

  async update(companyId: string, id: string, data: UpdateSupplierDto, req: Request) {
    const existing = await SupplierService.findById(companyId, id)

    if (data.document !== undefined && data.document !== existing.document) {
      await checkDocumentConflict(companyId, data.document, id)
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data,
      select: SUPPLIER_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Supplier',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await SupplierService.findById(companyId, id)

    await checkDependencies(companyId, id)

    await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Supplier',
      entityId: id,
      before: existing,
    })
  },
}
