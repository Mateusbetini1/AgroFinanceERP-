import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/middleware/authenticate', () => ({
  authenticate: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('../../shared/middleware/require-company', () => ({
  requireCompany: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.company = { id: 'company-1' } as typeof req.company
    next()
  },
}))

vi.mock('../../shared/middleware/authorize', () => ({
  anyMember: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  financialAccess: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}))

vi.mock('./bill.service', () => ({
  BillService: {
    list: vi.fn(),
    create: vi.fn(),
    createInstallments: vi.fn(),
    createRecurringBills: vi.fn(),
    listGroups: vi.fn(),
    findGroupById: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { billRouter } from './bill.router'
import { BillService } from './bill.service'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/bills', billRouter)
  return app
}

describe('billRouter special routes', () => {
  beforeEach(() => {
    vi.mocked(BillService.listGroups).mockReset()
    vi.mocked(BillService.findGroupById).mockReset()
    vi.mocked(BillService.createInstallments).mockReset()
    vi.mocked(BillService.createRecurringBills).mockReset()
    vi.mocked(BillService.findById).mockReset()
  })

  it('GET /groups usa listGroups e nao /:id', async () => {
    vi.mocked(BillService.listGroups).mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })

    await request(createTestApp()).get('/api/v1/bills/groups').expect(200)

    expect(BillService.listGroups).toHaveBeenCalled()
    expect(BillService.findById).not.toHaveBeenCalled()
  })

  it('GET /groups/:id usa findGroupById e nao /:id', async () => {
    const groupId = '11111111-1111-4111-8111-111111111111'
    vi.mocked(BillService.findGroupById).mockResolvedValue({ summary: { id: groupId }, installments: [] })

    await request(createTestApp()).get(`/api/v1/bills/groups/${groupId}`).expect(200)

    expect(BillService.findGroupById).toHaveBeenCalledWith('company-1', groupId)
    expect(BillService.findById).not.toHaveBeenCalled()
  })

  it('POST /installments usa createInstallments e nao /:id', async () => {
    vi.mocked(BillService.createInstallments).mockResolvedValue({ group: { id: 'group-1' }, bills: [] })

    await request(createTestApp())
      .post('/api/v1/bills/installments')
      .send({
        description: 'Compra parcelada',
        totalAmount: 1200,
        installmentCount: 3,
        firstDueDate: '2026-07-10T12:00:00.000Z',
      })
      .expect(201)

    expect(BillService.createInstallments).toHaveBeenCalled()
    expect(BillService.findById).not.toHaveBeenCalled()
  })

  it('POST /recurring-generate usa createRecurringBills e nao /:id', async () => {
    vi.mocked(BillService.createRecurringBills).mockResolvedValue({
      created: [],
      skipped: [],
      countCreated: 0,
      countSkipped: 0,
    })

    await request(createTestApp())
      .post('/api/v1/bills/recurring-generate')
      .send({
        description: 'Energia',
        amount: 700,
        firstDueDate: '2026-07-15T12:00:00.000Z',
        months: 12,
        skipExisting: true,
      })
      .expect(201)

    expect(BillService.createRecurringBills).toHaveBeenCalled()
    expect(BillService.findById).not.toHaveBeenCalled()
  })
})
