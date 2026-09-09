import { createHmac } from 'node:crypto'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app'
import { env } from '../../config/env'
import { logger } from '../../config/logger'
import { enqueueWhatsAppMessages } from './whatsapp.service'

vi.mock('./whatsapp.service', () => ({ enqueueWhatsAppMessages: vi.fn() }))

describe('WhatsApp webhook', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => {
    Object.assign(env, { WHATSAPP_ENABLED: true, WHATSAPP_ACCESS_TOKEN: 'token', WHATSAPP_APP_SECRET: 'secret',
      WHATSAPP_VERIFY_TOKEN: 'verify', WHATSAPP_PHONE_NUMBER_ID: '12345', WHATSAPP_GRAPH_VERSION: 'v25.0',
      WHATSAPP_ALLOWED_PHONE: '5511999999999', WHATSAPP_USER_EMAIL: 'owner@example.com' })
    vi.mocked(enqueueWhatsAppMessages).mockReset().mockResolvedValue(undefined)
  })
  const payload = (from = '5511999999999', phoneId = '12345') => ({
    object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: phoneId }, messages: [{ id: 'wamid.1', from,
        timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Quanto tenho a pagar?' } }],
    } }] }],
  })
  const signature = (body: string) => `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`
  const post = (body: string, sig = signature(body)) => request(createApp())
    .post('/api/v1/webhooks/whatsapp').set('Content-Type', 'application/json')
    .set('x-hub-signature-256', sig).send(body)

  it('responde ao desafio apenas com token correto', async () => {
    await request(createApp()).get('/api/v1/webhooks/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify', 'hub.challenge': '123' }).expect(200, '123')
    await request(createApp()).get('/api/v1/webhooks/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '123' }).expect(403)
  })
  it('valida assinatura nos bytes originais antes de aceitar', async () => {
    const body = JSON.stringify(payload(), null, 2)
    await post(body).expect(200)
    expect(enqueueWhatsAppMessages).toHaveBeenCalledWith(expect.anything(), [expect.objectContaining({ id: 'wamid.1' })])
    await post(body, signature(body + ' ')).expect(401)
    await post(body, 'sha256=bad').expect(401)
    expect(enqueueWhatsAppMessages).toHaveBeenCalledTimes(1)
  })
  it('ignora remetentes e números comerciais não autorizados', async () => {
    await post(JSON.stringify(payload('5511888888888'))).expect(200)
    await post(JSON.stringify(payload('5511999999999', '999'))).expect(200)
    expect(enqueueWhatsAppMessages).toHaveBeenNthCalledWith(1, expect.anything(), [])
    expect(enqueueWhatsAppMessages).toHaveBeenNthCalledWith(2, expect.anything(), [])
  })
  it('aceita notificações de status sem criar mensagens', async () => {
    await post(JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{
      field: 'messages', value: { statuses: [{ status: 'delivered' }] },
    }] }] })).expect(200)
    expect(enqueueWhatsAppMessages).toHaveBeenCalledWith(expect.anything(), [])
  })
  it('retorna erro para permitir reentrega quando persistência falha', async () => {
    vi.mocked(enqueueWhatsAppMessages).mockRejectedValueOnce(new Error('database unavailable'))
    await post(JSON.stringify(payload())).expect(500)
  })
  it('fica indisponível quando desativado', async () => {
    env.WHATSAPP_ENABLED = false
    await post(JSON.stringify(payload())).expect(404)
  })
  it('registra chegada e motivo de filtragem sem tokens, números ou texto da conversa', async () => {
    const log = vi.spyOn(logger, 'info')
    env.WHATSAPP_VERIFY_TOKEN = 'private-verification-token'
    await request(createApp()).get('/api/v1/webhooks/whatsapp').query({
      'hub.mode': 'subscribe', 'hub.verify_token': env.WHATSAPP_VERIFY_TOKEN, 'hub.challenge': 'private-challenge',
    }).expect(200)
    await post(JSON.stringify(payload('5511888888888'))).expect(200)
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ unauthorizedSender: 1, accepted: 0 }),
      'WhatsApp: eventos recebidos e filtrados')
    const output = JSON.stringify(log.mock.calls)
    for (const secret of ['private-verification-token', 'private-challenge', '5511888888888', 'Quanto tenho a pagar?']) {
      expect(output).not.toContain(secret)
    }
  })
})
