import { describe, it, expect } from 'vitest'
import { createTestApp } from '../test/helpers'

describe('GET /health', () => {
  it('retorna 200 com status ok', async () => {
    const app = createTestApp()
    const res = await app.get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.env).toBe('test')
    expect(typeof res.body.timestamp).toBe('string')
  })

  it('retorna 404 para rota inexistente', async () => {
    const app = createTestApp()
    const res = await app.get('/rota-que-nao-existe')

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('NOT_FOUND')
  })
})
