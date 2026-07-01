import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../../shared/middleware/error-handler'

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
}))

vi.mock('./assistant.service', () => ({
  AssistantService: {
    chat: vi.fn(),
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
  })

  it('rejeita mensagem vazia com erro de validacao', async () => {
    await request(createTestApp())
      .post('/api/v1/assistant/chat')
      .send({ message: '' })
      .expect(422)

    expect(AssistantService.chat).not.toHaveBeenCalled()
  })

  it('usa o companyId definido pelo requireCompany', async () => {
    vi.mocked(AssistantService.chat).mockResolvedValue({
      kind: 'ANSWER',
      answer: 'Resposta consultiva',
      sources: [],
      data: {},
    })

    const response = await request(createTestApp())
      .post('/api/v1/assistant/chat')
      .send({ message: 'Tenho boletos vencidos?' })
      .expect(200)

    expect(response.body).toEqual({
      success: true,
      data: {
        kind: 'ANSWER',
        answer: 'Resposta consultiva',
        sources: [],
        data: {},
      },
    })
    expect(AssistantService.chat).toHaveBeenCalledWith('company-1', {
      message: 'Tenho boletos vencidos?',
    })
  })
})
