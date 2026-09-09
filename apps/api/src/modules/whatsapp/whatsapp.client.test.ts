import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env'
import { downloadWhatsAppMedia, interpretWhatsAppMedia, sendWhatsAppReply } from './whatsapp.client'
import type { WhatsAppConfig } from './whatsapp.config'

const config: WhatsAppConfig = { token: 'private-token', appSecret: 'secret', verifyToken: 'verify',
  phoneNumberId: '123', version: 'v25.0', allowedPhone: '5511999999999', userEmail: 'a@b.com' }
const fetchMock = vi.fn()
const metadata = (overrides = {}) => Response.json({ url: 'https://lookaside.fbsbx.com/media',
  mime_type: 'image/jpeg', file_size: 3, ...overrides })

describe('WhatsApp media and delivery', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    Object.assign(env, { AI_ENABLED: true, AI_PROVIDER: 'gemini', AI_API_KEY: 'ai-key' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('restringe envio ao destinatário configurado e detecta falha HTTP', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ messages: [{ id: '1' }] }))
    await sendWhatsAppReply(config, 'Resumo')
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ to: config.allowedPhone, text: { body: 'Resumo' } })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    await expect(sendWhatsAppReply(config, 'Resumo')).rejects.toThrow('HTTP 500')
  })
  it('não envia token para URL arbitrária retornada por metadados', async () => {
    fetchMock.mockResolvedValueOnce(metadata({ url: 'https://attacker.example/media' }))
    await expect(downloadWhatsAppMedia(config, '456', 'image')).rejects.toThrow('Untrusted')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('recusa anexos grandes antes do download e formato incompatível', async () => {
    fetchMock.mockResolvedValueOnce(metadata({ file_size: 11 * 1024 * 1024 }))
    await expect(downloadWhatsAppMedia(config, '456', 'image')).rejects.toThrow('10 MB')
    fetchMock.mockResolvedValueOnce(metadata({ mime_type: 'application/zip' }))
    await expect(downloadWhatsAppMedia(config, '456', 'document')).rejects.toThrow('Formato')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('aplica limite durante leitura mesmo com tamanho declarado incorreto', async () => {
    fetchMock.mockResolvedValueOnce(metadata()).mockResolvedValueOnce(new Response(new Uint8Array(11 * 1024 * 1024)))
    await expect(downloadWhatsAppMedia(config, '456', 'image')).rejects.toThrow('10 MB')
  })
  it.each([['image', 'image/jpeg'], ['audio', 'audio/ogg'], ['video', 'video/mp4'], ['document', 'application/pdf']])(
    'interpreta %s usando Gemini sem expor o token da Meta', async (type, mime) => {
      fetchMock.mockResolvedValueOnce(metadata({ mime_type: mime })).mockResolvedValueOnce(new Response('abc'))
        .mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ message: 'criar boleto de R$ 850' }) }] } }] }))
      const result = await interpretWhatsAppMedia(config, { id: 'wamid.1', from: config.allowedPhone,
        timestamp: '100', type, [type]: { id: '456' } })
      expect(result).toBe('criar boleto de R$ 850')
      const request = fetchMock.mock.calls[2]![1]
      expect(request.headers).toEqual({ 'Content-Type': 'application/json', 'x-goog-api-key': 'ai-key' })
      expect(request.body).not.toContain('private-token')
      expect(JSON.parse(request.body).contents[0].parts[1].inlineData.mimeType).toBe(mime)
    },
  )
})
