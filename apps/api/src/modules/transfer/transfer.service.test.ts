import type { Request } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { TransferService } from './transfer.service'
import { prismaMock, resetPrismaMock } from '../../test/prisma-mock'

const companyId = 'company-1'
const req = {} as Request
const date = new Date('2026-01-10T00:00:00.000Z')

function transfer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'transfer-1',
    fromAccountId: 'account-from',
    fromAccount: { id: 'account-from', name: 'Origem', type: 'BANK' },
    toAccountId: 'account-to',
    toAccount: { id: 'account-to', name: 'Destino', type: 'BANK' },
    amount: 100,
    description: null,
    date,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  }
}

function mockTransferAccounts(fromId = 'account-from', toId = 'account-to', fromBalance = 500) {
  prismaMock.account.findFirst
    .mockResolvedValueOnce({ id: fromId, currentBalance: fromBalance })
    .mockResolvedValueOnce({ id: toId, currentBalance: 0 })
}

describe('TransferService balance rules', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  it('create debita conta origem e credita conta destino', async () => {
    mockTransferAccounts()
    prismaMock.transfer.create.mockResolvedValue(transfer())

    await TransferService.createTransfer(
      companyId,
      { fromAccountId: 'account-from', toAccountId: 'account-to', amount: 100, date },
      req,
    )

    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-from' },
        data: { currentBalance: { decrement: 100 } },
      }),
    )
    expect(prismaMock.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'account-to' },
        data: { currentBalance: { increment: 100 } },
      }),
    )
  })

  it('update aplica reversao da transferencia antiga e aplica nova', async () => {
    prismaMock.transfer.findFirst.mockResolvedValue(transfer({ amount: 100 }))
    mockTransferAccounts('account-from', 'account-to', 500)
    prismaMock.transfer.update.mockResolvedValue(transfer({ amount: 150 }))

    await TransferService.updateTransfer(companyId, 'transfer-1', { amount: 150 }, req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-from' }, data: { currentBalance: { increment: 100 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-to' }, data: { currentBalance: { decrement: 100 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-from' }, data: { currentBalance: { decrement: 150 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-to' }, data: { currentBalance: { increment: 150 } } }))
  })

  it('update com troca de contas funciona corretamente', async () => {
    prismaMock.transfer.findFirst.mockResolvedValue(transfer({ fromAccountId: 'old-from', toAccountId: 'old-to', amount: 100 }))
    mockTransferAccounts('new-from', 'new-to', 500)
    prismaMock.transfer.update.mockResolvedValue(transfer({ fromAccountId: 'new-from', toAccountId: 'new-to', amount: 200 }))

    await TransferService.updateTransfer(
      companyId,
      'transfer-1',
      { fromAccountId: 'new-from', toAccountId: 'new-to', amount: 200 },
      req,
    )

    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'old-from' }, data: { currentBalance: { increment: 100 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'old-to' }, data: { currentBalance: { decrement: 100 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'new-from' }, data: { currentBalance: { decrement: 200 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'new-to' }, data: { currentBalance: { increment: 200 } } }))
  })

  it('delete faz soft delete e reverte saldos', async () => {
    prismaMock.transfer.findFirst.mockResolvedValue(transfer())
    prismaMock.transfer.update.mockResolvedValue(transfer({ deletedAt: new Date() }))

    await TransferService.deleteTransfer(companyId, 'transfer-1', req)

    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-from' }, data: { currentBalance: { increment: 100 } } }))
    expect(prismaMock.account.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'account-to' }, data: { currentBalance: { decrement: 100 } } }))
    expect(prismaMock.transfer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'transfer-1' },
        data: { deletedAt: expect.any(Date) },
      }),
    )
  })

  it('account cross-company/inexistente retorna not found', async () => {
    prismaMock.account.findFirst.mockResolvedValueOnce(null)

    await expect(
      TransferService.createTransfer(
        companyId,
        { fromAccountId: 'other-company-account', toAccountId: 'account-to', amount: 100, date },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(prismaMock.transfer.create).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('fromAccountId igual toAccountId retorna erro', async () => {
    await expect(
      TransferService.createTransfer(
        companyId,
        { fromAccountId: 'same-account', toAccountId: 'same-account', amount: 100, date },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })

  it('saldo insuficiente retorna 409', async () => {
    mockTransferAccounts('account-from', 'account-to', 50)

    await expect(
      TransferService.createTransfer(
        companyId,
        { fromAccountId: 'account-from', toAccountId: 'account-to', amount: 100, date },
        req,
      ),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(prismaMock.transfer.create).not.toHaveBeenCalled()
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })
})
