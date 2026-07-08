import { Router } from 'express'
import { NotificationService } from './notification.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { requireCompany } from '../../shared/middleware/require-company'
import { anyMember } from '../../shared/middleware/authorize'
import { asyncHandler } from '../../shared/utils/async-handler'

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
