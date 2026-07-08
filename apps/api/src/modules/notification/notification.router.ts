import { Router } from 'express'
import { NotificationService } from './notification.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember } from '../../shared/middleware/authorize'
import { validate } from '../../shared/middleware/validate'
import { asyncHandler } from '../../shared/utils/async-handler'
import { pushSubscriptionSchema, unsubscribePushSchema } from './notification.schemas'

export const notificationRouter = Router()

notificationRouter.use(authenticate)
notificationRouter.use(requireCompany)

notificationRouter.get(
  '/alerts',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await NotificationService.getAlerts(req.company!.id)
    res.json({ success: true, data })
  }),
)

notificationRouter.get(
  '/push/public-key',
  anyMember,
  asyncHandler(async (_req, res) => {
    const data = NotificationService.getPublicKey()
    res.json({ success: true, data })
  }),
)

notificationRouter.post(
  '/push/subscribe',
  anyMember,
  validate(pushSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const subscription = await NotificationService.subscribe(
      req.company!.id,
      req.user!.id,
      req.body,
      req.get('user-agent') ?? null,
    )
    res.status(201).json({ success: true, data: { id: subscription.id, active: subscription.active } })
  }),
)

notificationRouter.delete(
  '/push/unsubscribe',
  anyMember,
  validate(unsubscribePushSchema),
  asyncHandler(async (req, res) => {
    const data = await NotificationService.unsubscribe(req.company!.id, req.user!.id, req.body.endpoint)
    res.json({ success: true, data })
  }),
)

notificationRouter.post(
  '/push/test',
  anyMember,
  asyncHandler(async (req, res) => {
    const data = await NotificationService.sendTest(req.company!.id, req.user!.id)
    res.json({ success: true, data })
  }),
)
