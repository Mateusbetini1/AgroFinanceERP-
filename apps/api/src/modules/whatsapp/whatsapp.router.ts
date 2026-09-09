import { createHmac, timingSafeEqual } from 'node:crypto'
import { Router, raw } from 'express'
import { asyncHandler } from '../../shared/utils/async-handler'
import { getWhatsAppConfig } from './whatsapp.config'
import { incomingMessageSchema, webhookSchema } from './whatsapp.schemas'
import { enqueueWhatsAppMessages } from './whatsapp.service'

export const whatsappRouter = Router()

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
  const messages = parsed.data.entry.flatMap((entry) => entry.changes)
    .filter((change) => change.field === 'messages' && change.value.metadata?.phone_number_id === config.phoneNumberId)
    .flatMap((change) => change.value.messages ?? [])
    .flatMap((message) => {
      const incoming = incomingMessageSchema.safeParse(message)
      return incoming.success && incoming.data.from === config.allowedPhone ? [incoming.data] : []
    })
  // Acknowledge only after persistence; processing and delivery run in the worker.
  await enqueueWhatsAppMessages(config, messages)
  res.sendStatus(200)
}))
