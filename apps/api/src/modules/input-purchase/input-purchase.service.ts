import type { Request } from 'express'
import type { Prisma, Supply } from '@agrofinance/database'
import { InputPurchaseStatus, InputStockMovementDirection, InputStockMovementType } from '@agrofinance/database'
import { AuditAction } from '@agrofinance/shared'
import { prisma } from '../../config/prisma'
import { AppError } from '../../shared/errors/AppError'
import { writeAuditLog } from '../../shared/middleware/audit-log'
import { getPaginationArgs, buildPaginatedResponse } from '../../shared/utils/pagination'
import type {
  CancelInputPurchaseDto,
  CreateInputPurchaseDto,
  InputPurchaseItemDto,
  ListInputPurchasesQuery,
} from './input-purchase.schemas'

const SUPPLY_FOR_PURCHASE_SELECT = {
  id: true,
  name: true,
  baseUnit: true,
  packageSizeBaseQuantity: true,
  packageSizeUnit: true,
} as const

const INPUT_PURCHASE_SELECT = {
  id: true,
  supplierId: true,
  supplier: { select: { id: true, name: true } },
  purchaseDate: true,
  documentNumber: true,
  totalAmount: true,
  status: true,
  canceledAt: true,
  canceledByUserId: true,
  cancelReason: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
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
      quantity: true,
      unit: true,
      quantityBase: true,
      unitCostBase: true,
      totalAmount: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} as const

const INPUT_PURCHASE_CANCEL_SELECT = {
  id: true,
  companyId: true,
  status: true,
  purchaseDate: true,
  documentNumber: true,
  items: {
    select: {
      id: true,
      supplyId: true,
      quantityBase: true,
      unitCostBase: true,
      totalAmount: true,
    },
  },
} as const

type SupplyForPurchase = Pick<
  Supply,
  'id' | 'name' | 'baseUnit' | 'packageSizeBaseQuantity' | 'packageSizeUnit'
>

function toNumber(value: unknown): number {
  return Number(value ?? 0)
}

function clampNearZero(value: number, decimals: number): number {
  const epsilon = decimals === 2 ? 0.005 : 0.0005
  return Math.abs(value) < epsilon ? 0 : value
}

function convertToBaseQuantity(supply: SupplyForPurchase, item: InputPurchaseItemDto): number {
  const quantity = item.quantity
  const unit = item.unit
  const baseUnit = supply.baseUnit

  if (unit === baseUnit) return quantity

  if (unit === 'BAG' || unit === 'BOX') {
    const packageSize = toNumber(supply.packageSizeBaseQuantity)
    if (!Number.isFinite(packageSize) || packageSize <= 0) {
      throw AppError.badRequest(
        `Nao foi possivel converter ${unit} para o insumo "${supply.name}". Configure o tamanho da embalagem no cadastro do insumo.`,
      )
    }
    return quantity * packageSize
  }

  if (baseUnit === 'KG' && unit === 'G') return quantity / 1000
  if (baseUnit === 'G' && unit === 'KG') return quantity * 1000
  if (baseUnit === 'L' && unit === 'ML') return quantity / 1000
  if (baseUnit === 'ML' && unit === 'L') return quantity * 1000

  throw AppError.badRequest(
    `Nao foi possivel converter ${unit} para ${baseUnit} no insumo "${supply.name}".`,
  )
}

async function validateSupplierId(companyId: string, supplierId: string): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId, deletedAt: null },
    select: { id: true },
  })

  if (!supplier) throw AppError.notFound('Fornecedor')
}

async function loadSupplies(companyId: string, items: InputPurchaseItemDto[]) {
  const supplyIds = Array.from(new Set(items.map((item) => item.supplyId)))
  const supplies = await prisma.supply.findMany({
    where: { id: { in: supplyIds }, companyId, deletedAt: null, active: true },
    select: SUPPLY_FOR_PURCHASE_SELECT,
  })

  if (supplies.length !== supplyIds.length) {
    throw AppError.notFound('Insumo')
  }

  return new Map(supplies.map((supply) => [supply.id, supply]))
}

async function updateStockForLine(
  tx: Prisma.TransactionClient,
  params: {
    companyId: string
    supplyId: string
    purchaseLineId: string
    quantityBase: number
    unitCostBase: number
    totalAmount: number
    occurredAt: Date
    notes?: string | null
  },
) {
  const existingBalance = await tx.inputStockBalance.findUnique({
    where: {
      companyId_supplyId: {
        companyId: params.companyId,
        supplyId: params.supplyId,
      },
    },
  })

  const previousQuantity = toNumber(existingBalance?.quantityBase)
  const previousValue = toNumber(existingBalance?.totalValue)
  const newQuantity = previousQuantity + params.quantityBase
  const newValue = previousValue + params.totalAmount
  const newAverageCost = newValue / newQuantity

  if (existingBalance) {
    await tx.inputStockBalance.update({
      where: { id: existingBalance.id },
      data: {
        quantityBase: newQuantity,
        averageCostBase: newAverageCost,
        totalValue: newValue,
      },
    })
  } else {
    await tx.inputStockBalance.create({
      data: {
        companyId: params.companyId,
        supplyId: params.supplyId,
        quantityBase: newQuantity,
        averageCostBase: newAverageCost,
        totalValue: newValue,
      },
    })
  }

  await tx.inputStockMovement.create({
    data: {
      companyId: params.companyId,
      supplyId: params.supplyId,
      type: InputStockMovementType.PURCHASE,
      direction: InputStockMovementDirection.IN,
      quantityBase: params.quantityBase,
      unitCostBase: params.unitCostBase,
      totalCost: params.totalAmount,
      balanceQuantityAfter: newQuantity,
      balanceValueAfter: newValue,
      purchaseLineId: params.purchaseLineId,
      occurredAt: params.occurredAt,
      notes: params.notes,
    },
  })
}

export const InputPurchaseService = {
  async list(companyId: string, query: ListInputPurchasesQuery) {
    const { page, limit, supplierId, supplyId, dateFrom, dateTo } = query
    const { skip, take } = getPaginationArgs({ page, limit })

    const where = {
      companyId,
      deletedAt: null,
      ...(supplierId ? { supplierId } : {}),
      ...(dateFrom || dateTo
        ? {
            purchaseDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(supplyId ? { items: { some: { supplyId, companyId } } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.inputPurchase.findMany({
        where,
        select: INPUT_PURCHASE_SELECT,
        orderBy: { purchaseDate: 'desc' },
        skip,
        take,
      }),
      prisma.inputPurchase.count({ where }),
    ])

    return buildPaginatedResponse(data, total, { page, limit })
  },

  async findById(companyId: string, id: string) {
    const purchase = await prisma.inputPurchase.findFirst({
      where: { id, companyId, deletedAt: null },
      select: INPUT_PURCHASE_SELECT,
    })

    if (!purchase) throw AppError.notFound('Compra de insumo')
    return purchase
  },

  async create(companyId: string, data: CreateInputPurchaseDto, req: Request) {
    if (data.supplierId) {
      await validateSupplierId(companyId, data.supplierId)
    }

    const suppliesById = await loadSupplies(companyId, data.items)
    const computedItems = data.items.map((item) => {
      const supply = suppliesById.get(item.supplyId)
      if (!supply) throw AppError.notFound('Insumo')

      const quantityBase = convertToBaseQuantity(supply, item)
      if (!Number.isFinite(quantityBase) || quantityBase <= 0) {
        throw AppError.badRequest('Quantidade convertida deve ser maior que zero')
      }

      return {
        ...item,
        quantityBase,
        unitCostBase: item.totalAmount / quantityBase,
      }
    })

    const totalAmount = computedItems.reduce((total, item) => total + item.totalAmount, 0)

    const purchase = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.inputPurchase.create({
        data: {
          companyId,
          supplierId: data.supplierId ?? null,
          purchaseDate: data.purchaseDate,
          documentNumber: data.documentNumber ?? null,
          totalAmount,
          notes: data.notes ?? null,
        },
        select: { id: true },
      })

      for (const item of computedItems) {
        const line = await tx.inputPurchaseLine.create({
          data: {
            companyId,
            purchaseId: createdPurchase.id,
            supplyId: item.supplyId,
            quantity: item.quantity,
            unit: item.unit,
            quantityBase: item.quantityBase,
            unitCostBase: item.unitCostBase,
            totalAmount: item.totalAmount,
          },
          select: { id: true },
        })

        await updateStockForLine(tx, {
          companyId,
          supplyId: item.supplyId,
          purchaseLineId: line.id,
          quantityBase: item.quantityBase,
          unitCostBase: item.unitCostBase,
          totalAmount: item.totalAmount,
          occurredAt: data.purchaseDate,
          notes: data.documentNumber ?? data.notes ?? null,
        })
      }

      const result = await tx.inputPurchase.findFirst({
        where: { id: createdPurchase.id, companyId },
        select: INPUT_PURCHASE_SELECT,
      })

      if (!result) throw AppError.notFound('Compra de insumo')
      return result
    })

    await writeAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'InputPurchase',
      entityId: purchase.id,
      after: purchase,
    })

    return purchase
  },

  async cancel(companyId: string, id: string, data: CancelInputPurchaseDto, req: Request) {
    const reason = data.reason?.trim() || null

    const canceled = await prisma.$transaction(async (tx) => {
      const existing = await tx.inputPurchase.findFirst({
        where: { id, companyId, deletedAt: null },
        select: INPUT_PURCHASE_CANCEL_SELECT,
      })

      if (!existing) throw AppError.notFound('Compra de insumo')

      if (existing.status === InputPurchaseStatus.CANCELED) {
        throw AppError.conflict('Compra de insumo ja cancelada')
      }

      for (const line of existing.items) {
        const originalMovement = await tx.inputStockMovement.findFirst({
          where: {
            companyId,
            purchaseLineId: line.id,
            type: InputStockMovementType.PURCHASE,
            direction: InputStockMovementDirection.IN,
          },
          select: { id: true },
        })

        if (!originalMovement) {
          throw AppError.conflict('Movimento original de compra nao encontrado para estorno')
        }

        const balance = await tx.inputStockBalance.findUnique({
          where: {
            companyId_supplyId: {
              companyId,
              supplyId: line.supplyId,
            },
          },
        })

        const currentQuantity = toNumber(balance?.quantityBase)
        const currentValue = toNumber(balance?.totalValue)
        const lineQuantity = toNumber(line.quantityBase)
        const lineTotal = toNumber(line.totalAmount)

        if (!balance || currentQuantity + 0.0005 < lineQuantity) {
          throw AppError.conflict(
            'Não é possível cancelar esta compra porque parte do estoque já foi consumida ou ajustada.',
          )
        }

        const nextQuantity = clampNearZero(currentQuantity - lineQuantity, 3)
        const nextValue = clampNearZero(currentValue - lineTotal, 2)

        if (nextQuantity < 0 || nextValue < 0) {
          throw AppError.conflict(
            'Não é possível cancelar esta compra porque parte do estoque já foi consumida ou ajustada.',
          )
        }

        const nextAverageCost = nextQuantity > 0 ? nextValue / nextQuantity : 0

        await tx.inputStockBalance.update({
          where: { id: balance.id },
          data: {
            quantityBase: nextQuantity,
            totalValue: nextQuantity > 0 ? nextValue : 0,
            averageCostBase: nextAverageCost,
          },
        })

        await tx.inputStockMovement.create({
          data: {
            companyId,
            supplyId: line.supplyId,
            type: InputStockMovementType.PURCHASE_CANCEL,
            direction: InputStockMovementDirection.OUT,
            quantityBase: lineQuantity,
            unitCostBase: toNumber(line.unitCostBase),
            totalCost: lineTotal,
            balanceQuantityAfter: nextQuantity,
            balanceValueAfter: nextQuantity > 0 ? nextValue : 0,
            purchaseLineId: line.id,
            occurredAt: new Date(),
            notes: reason ? `Cancelamento da compra: ${reason}` : 'Cancelamento da compra',
          },
        })
      }

      await tx.inputPurchase.update({
        where: { id },
        data: {
          status: InputPurchaseStatus.CANCELED,
          canceledAt: new Date(),
          canceledByUserId: req.user?.id,
          cancelReason: reason,
        },
      })

      const result = await tx.inputPurchase.findFirst({
        where: { id, companyId },
        select: INPUT_PURCHASE_SELECT,
      })

      if (!result) throw AppError.notFound('Compra de insumo')
      return result
    })

    await writeAuditLog(req, {
      action: AuditAction.UPDATE,
      entityType: 'InputPurchase',
      entityId: id,
      after: canceled,
    })

    return canceled
  },
}
