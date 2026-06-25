import type { Request } from 'express'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { AuditAction } from '@agrofinance/shared'
import type { CreateInvoiceDto, UpdateInvoiceDto, ListInvoicesQuery } from './invoice.schemas'

const INVOICE_SELECT = {
  id: true,
  number: true,
  amount: true,
  issuedAt: true,
  fileUrl: true,
  fileType: true,
  revenueId: true,
  revenue: { select: { id: true, client: true, totalAmount: true, status: true } },
  expenseId: true,
  expense: { select: { id: true, description: true, amount: true, status: true } },
  billId: true,
  bill: { select: { id: true, description: true, amount: true, status: true } },
  ocrStatus: true,
  ocrData: true,
  createdAt: true,
  updatedAt: true,
} as const

type InvoiceLink = {
  revenueId?: string | null
  expenseId?: string | null
  billId?: string | null
}

function assertExactlyOneLink(link: InvoiceLink): void {
  const count = [link.revenueId, link.expenseId, link.billId].filter(Boolean).length
  if (count !== 1) {
    throw AppError.badRequest('Informe exatamente um vinculo: revenueId, expenseId ou billId')
  }
}

async function validateRevenueId(companyId: string, revenueId: string): Promise<void> {
  const exists = await prisma.revenue.findFirst({
    where: { id: revenueId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Receita')
}

async function validateExpenseId(companyId: string, expenseId: string): Promise<void> {
  const exists = await prisma.expense.findFirst({
    where: { id: expenseId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Despesa')
}

async function validateBillId(companyId: string, billId: string): Promise<void> {
  const exists = await prisma.bill.findFirst({
    where: { id: billId, companyId, deletedAt: null },
    select: { id: true },
  })
  if (!exists) throw AppError.notFound('Boleto')
}

async function validateLinks(companyId: string, link: InvoiceLink): Promise<void> {
  assertExactlyOneLink(link)

  const validations: Promise<void>[] = []
  if (link.revenueId) validations.push(validateRevenueId(companyId, link.revenueId))
  if (link.expenseId) validations.push(validateExpenseId(companyId, link.expenseId))
  if (link.billId) validations.push(validateBillId(companyId, link.billId))
  await Promise.all(validations)
}

export const InvoiceService = {
  async list(companyId: string, query: ListInvoicesQuery) {
    const { page, limit, search, fileType, ocrStatus, revenueId, expenseId, billId, dateFrom, dateTo } =
      query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(fileType ? { fileType } : {}),
      ...(ocrStatus ? { ocrStatus } : {}),
      ...(revenueId ? { revenueId } : {}),
      ...(expenseId ? { expenseId } : {}),
      ...(billId ? { billId } : {}),
      ...(search ? { number: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(dateFrom || dateTo
        ? {
            issuedAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        select: INVOICE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.invoice.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId, deletedAt: null },
      select: INVOICE_SELECT,
    })

    if (!invoice) throw AppError.notFound('Nota fiscal')
    return invoice
  },

  async create(companyId: string, data: CreateInvoiceDto, req: Request) {
    await validateLinks(companyId, data)

    const invoice = await prisma.invoice.create({
      data: { ...data, companyId },
      select: INVOICE_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'Invoice',
      entityId: invoice.id,
      after: invoice,
    })

    return invoice
  },

  async update(companyId: string, id: string, data: UpdateInvoiceDto, req: Request) {
    const existing = await InvoiceService.findById(companyId, id)

    const effectiveLink = {
      revenueId: data.revenueId !== undefined ? data.revenueId : existing.revenueId,
      expenseId: data.expenseId !== undefined ? data.expenseId : existing.expenseId,
      billId: data.billId !== undefined ? data.billId : existing.billId,
    }

    await validateLinks(companyId, effectiveLink)

    const updated = await prisma.invoice.update({
      where: { id },
      data,
      select: INVOICE_SELECT,
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'Invoice',
      entityId: id,
      before: existing,
      after: updated,
    })

    return updated
  },

  async delete(companyId: string, id: string, req: Request) {
    const existing = await InvoiceService.findById(companyId, id)

    await prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog(req, {
      action: AuditAction.DELETE,
      entityType: 'Invoice',
      entityId: id,
      before: existing,
    })
  },
}
