import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../../shared/middleware/error-handler'

const mocks = vi.hoisted(() => ({
  financialAccess: vi.fn((_req: express.Request, _res: express.Response, next: express.NextFunction) => next()),
}))

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
  financialAccess: mocks.financialAccess,
}))

vi.mock('./assistant.service', () => ({
  AssistantService: {
    chat: vi.fn(),
    confirmDraft: vi.fn(),
  },
}))

import { assistantRouter } from './assistant.router'
import { AssistantService } from './assistant.service'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/v1/assistant', assistantRouter)
  app.use(errorHandler)
  return app
}

describe('assistantRouter', () => {
  beforeEach(() => {
    vi.mocked(AssistantService.chat).mockReset()
    vi.mocked(AssistantService.confirmDraft).mockReset()
    mocks.financialAccess.mockClear()
  })

  it('rejeita mensagem vazia com erro de validacao', async () => {
    await request(createTestApp()).post('/api/v1/assistant/chat').send({ message: '' }).expect(422)

    expect(AssistantService.chat).not.toHaveBeenCalled()
  })

  it('usa o companyId definido pelo requireCompany no chat', async () => {
    vi.mocked(AssistantService.chat).mockResolvedValue({
      kind: 'ANSWER',
      answer: 'Resposta consultiva',
      sources: [],
      data: {},
    })

    await request(createTestApp())
      .post('/api/v1/assistant/chat')
      .send({ message: 'Tenho boletos vencidos?' })
      .expect(200)

    expect(AssistantService.chat).toHaveBeenCalledWith('company-1', {
      message: 'Tenho boletos vencidos?',
    })
  })

  it('confirmacao exige financialAccess e usa companyId do requireCompany', async () => {
    vi.mocked(AssistantService.confirmDraft).mockResolvedValue({
      draftType: 'CREATE_BILL',
      created: { id: 'bill-1' },
    })

    const body = {
      draft: {
        draftType: 'CREATE_BILL',
        payload: {
          description: 'Boleto',
          amount: 1200,
          dueDate: '2026-07-10T00:00:00.000Z',
          status: 'PENDING',
        },
        missingFields: [],
        confirmationRequired: true,
      },
    }

    await request(createTestApp()).post('/api/v1/assistant/drafts/confirm').send(body).expect(201)

    expect(mocks.financialAccess).toHaveBeenCalled()
    expect(AssistantService.confirmDraft).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        draft: expect.objectContaining({
          draftType: 'CREATE_BILL',
          payload: expect.objectContaining({ description: 'Boleto', amount: 1200, status: 'PENDING' }),
          missingFields: [],
        }),
      }),
      expect.anything(),
    )
  })

  it('bloqueia payload invalido de confirmacao', async () => {
    await request(createTestApp())
      .post('/api/v1/assistant/drafts/confirm')
      .send({ draft: { draftType: 'UNKNOWN', payload: {}, missingFields: [], confirmationRequired: true } })
      .expect(422)

    expect(AssistantService.confirmDraft).not.toHaveBeenCalled()
  })
})
