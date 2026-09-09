import { createHmac, timingSafeEqual } from 'node:crypto'
import { Router, raw } from 'express'
import { asyncHandler } from '../../shared/utils/async-handler'
import { getWhatsAppConfig } from './whatsapp.config'
import { incomingMessageSchema, webhookSchema } from './whatsapp.schemas'
import { enqueueWhatsAppMessages } from './whatsapp.service'
import { logger } from '../../config/logger'

export const whatsappRouter = Router()

// This router runs before the global logger. Never log the query string:
// webhook verification requests contain the secret verification token there.
whatsappRouter.use((req, res, next) => {
  res.once('finish', () => {
    logger.info({ method: req.method, statusCode: res.statusCode }, 'WhatsApp: requisição ao webhook')
  })
  next()
})

whatsappRouter.get('/', (req, res) => {
  const config = getWhatsAppConfig()
  if (!config) { res.sendStatus(404); return }
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.verifyToken &&
      typeof req.query['hub.challenge'] === 'string') {
    res.status(200).type('text/plain').send(req.query['hub.challenge'])
    return
  }
  res.sendStatus(403)
})

// Mounted before express.json: verify the signature of the original bytes.
whatsappRouter.post('/', raw({ type: 'application/json', limit: '1mb' }), asyncHandler(async (req, res) => {
  const config = getWhatsAppConfig()
  if (!config) { res.sendStatus(404); return }
  const signature = req.get('x-hub-signature-256') ?? ''
  if (!Buffer.isBuffer(req.body) || !/^sha256=[0-9a-f]{64}$/i.test(signature)) {
    res.sendStatus(401); return
  }
  const expected = createHmac('sha256', config.appSecret).update(req.body).digest()
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))) {
    res.sendStatus(401); return
  }
  let json: unknown
  try { json = JSON.parse(req.body.toString('utf8')) } catch { res.sendStatus(400); return }
  const parsed = webhookSchema.safeParse(json)
  if (!parsed.success) { res.sendStatus(400); return }
  const changes = parsed.data.entry.flatMap((entry) => entry.changes)
  const counts = { received: 0, wrongPhoneNumberId: 0, invalidPayload: 0, unauthorizedSender: 0 }
  counts.received = changes.reduce((total, change) => total + (change.value.messages?.length ?? 0), 0)
  counts.wrongPhoneNumberId = changes.filter((change) => change.value.metadata?.phone_number_id !== config.phoneNumberId)
    .reduce((total, change) => total + (change.value.messages?.length ?? 0), 0)
  const messages = changes
    .filter((change) => change.field === 'messages' && change.value.metadata?.phone_number_id === config.phoneNumberId)
    .flatMap((change) => change.value.messages ?? [])
    .flatMap((message) => {
      const incoming = incomingMessageSchema.safeParse(message)
      if (!incoming.success) counts.invalidPayload++
      else if (incoming.data.from !== config.allowedPhone) counts.unauthorizedSender++
      return incoming.success && incoming.data.from === config.allowedPhone ? [incoming.data] : []
    })
  logger.info({ ...counts, accepted: messages.length }, 'WhatsApp: eventos recebidos e filtrados')
  // Acknowledge only after persistence; processing and delivery run in the worker.
  await enqueueWhatsAppMessages(config, messages)
  res.sendStatus(200)
}))
