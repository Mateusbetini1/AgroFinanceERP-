import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { RevenueService } from './revenue.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const req = {} as Request
const date = new Date('2026-01-10T00:00:00.000Z')

function revenue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'revenue-1',
    productId: 'product-1',
    product: { id: 'product-1', name: 'Soja' },
    accountId: 'account-1',
    account: { id: 'account-1', name: 'Conta', type: 'BANK' },
    safraId: null,
    date,
    receivedAt: null,
    quantity: 2,
    unitPrice: 50,
    totalAmount: 100,
    client: null,
    notes: null,
    status: 'PENDING',
    createdAt: date,
    updatedAt: date,
    ...overrides,
  }
}

function mockProduct() {
  prismaMock.product.findFirst.mockResolvedValue({ id: 'product-1' })
}

function mockAccount(id = 'account-1') {
  prismaMock.account.findFirst.mockResolvedValue({ id })
}

describe('RevenueService balance rules', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('create RECEIVED com account incrementa Account.currentBalance', async () => {
    mockProduct()
    mockAccount()
    prismaMock.revenue.create.mockResolvedValue(revenue({ status: 'RECEIVED' }))

    await RevenueService.create(
      companyId,
      { productId: 'product-1', accountId: 'account-1', date, quantity: 2, unitPrice: 50, status: 'RECEIVED' },
      req,
    )

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('create PENDING nao altera saldo', async () => {
    mockProduct()
    mockAccount()
    prismaMock.revenue.create.mockResolvedValue(revenue())

    await RevenueService.create(
      companyId,
      { productId: 'product-1', accountId: 'account-1', date, quantity: 2, unitPrice: 50, status: 'PENDING' },
      req,
    )

    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('update PENDING para RECEIVED incrementa saldo', async () => {
    prismaMock.revenue.findFirst.mockResolvedValue(revenue())
    prismaMock.revenue.update.mockResolvedValue(revenue({ status: 'RECEIVED' }))

    await RevenueService.update(companyId, 'revenue-1', { status: 'RECEIVED' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('update RECEIVED para PENDING reverte saldo', async () => {
    prismaMock.revenue.findFirst.mockResolvedValue(revenue({ status: 'RECEIVED' }))
    prismaMock.revenue.update.mockResolvedValue(revenue({ status: 'PENDING' }))

    await RevenueService.update(companyId, 'revenue-1', { status: 'PENDING' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('update RECEIVED com mudanca de amount aplica diferenca', async () => {
    prismaMock.revenue.findFirst.mockResolvedValue(revenue({ status: 'RECEIVED' }))
    prismaMock.revenue.update.mockResolvedValue(revenue({ status: 'RECEIVED', quantity: 3, totalAmount: 150 }))

    await RevenueService.update(companyId, 'revenue-1', { quantity: 3 }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { increment: 50 } },
      }),
    )
  })

  it('update RECEIVED com troca de account reverte antiga e aplica nova', async () => {
    prismaMock.revenue.findFirst.mockResolvedValue(revenue({ status: 'RECEIVED', accountId: 'account-old' }))
    prismaMock.account.findFirst.mockResolvedValue({ id: 'account-new' })
    prismaMock.revenue.update.mockResolvedValue(revenue({ status: 'RECEIVED', accountId: 'account-new' }))

    await RevenueService.update(companyId, 'revenue-1', { accountId: 'account-new' }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-old' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-new' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('delete RECEIVED reverte saldo e faz soft delete', async () => {
    prismaMock.revenue.findFirst.mockResolvedValue(revenue({ status: 'RECEIVED' }))
    prismaMock.revenue.update.mockResolvedValue(revenue({ status: 'RECEIVED', deletedAt: new Date() }))

    await RevenueService.delete(companyId, 'revenue-1', req)

    expect(prismaMock.revenue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'revenue-1' },
        data: { deletedAt: expect.any(Date) },
      }),
    )
    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-1' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
  })

  it('FK/cross-company invalida retorna not found', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null)

    await expect(
      RevenueService.create(
        companyId,
        { productId: 'other-company-product', accountId: 'account-1', date, quantity: 2, unitPrice: 50, status: 'RECEIVED' },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.revenue.create).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })
})

describe('RevenueService list filters', () => {
  beforeEach(() => {
    resetPrismaMock()
    prismaMock.revenue.findMany.mockResolvedValue([])
    prismaMock.revenue.count.mockResolvedValue(0)
  })

  it('filtra por status, safra e busca em cliente ou produto sem alterar saldo', async () => {
    await RevenueService.list(companyId, {
      page: 1,
      limit: 20,
      status: 'PENDING',
      safraId: 'safra-1',
      search: 'pimentao',
    })

    const where = prismaMock.revenue.findMany.mock.calls[0][0].where
    expect(where).toEqual(
      expect.objectContaining({
        companyId,
        deletedAt: null,
        status: 'PENDING',
        safraId: 'safra-1',
        OR: [
          { client: { contains: 'pimentao', mode: 'insensitive' } },
          { product: { name: { contains: 'pimentao', mode: 'insensitive' } } },
        ],
      }),
    )
    expect(prismaMock.revenue.count).toHaveBeenCalledWith({ where })
    expect(prismaMock.account.update).not.toHaveBeenCalled()
    expect(prismaMock.revenue.update).not.toHaveBeenCalled()
  })

  it('filtros vazios mantem comportamento atual e nao mistura empresas', async () => {
    await RevenueService.list(companyId, { page: 1, limit: 20 })

    expect(prismaMock.revenue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId, deletedAt: null },
      }),
    )
  })
})
